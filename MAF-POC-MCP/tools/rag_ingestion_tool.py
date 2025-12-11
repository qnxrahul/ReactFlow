
from ijson import common,basic_parse,parse,items
from common_server.cognitive_service.search_service import ChunkIndexer

from models.checklist_request import BlobConfig
from models.dto import EmbeddingModelConfig, RagRetrievalConfig, SearchConfigDto
from utils.config_utils import read_config, ChecklistEnum, get_max_id_by_name

from tools.indexing_tool import IndexChunksTool
from common_server.utils.text_chunker import TextChunker
from common_server.utils.embedding import AzureEmbeddingService
from logger import get_logger

from common_server.storage.blob import AzureBlobStorageManager

logger = get_logger(__name__)

class RagIngestionTool:
    """Tool to trigger the RAG ingestion workflow."""

    @classmethod
    async def rag_ingestion(
        cls,
        request_id: str
    ):
        """
        Trigger the RAG ingestion workflow by reading large JSON content from Azure Blob Storage.

        Args:
            blob_config (dict): Azure blob storage configuration.
            search_config (dict): Azure Cognitive Search configuration.
            embedding_config (dict): Embedding service configuration.
            request_id (str): Unique identifier for this ingestion run.

        Returns:
            Any: The result of the ingestion workflow.
        """
        config_model = read_config(id=get_max_id_by_name(name=ChecklistEnum.RAG_AGENT))
        if config_model is None:
            raise ValueError("Config with id=3 not found")
        # Access configuration directly as Pydantic model attributes
        config = config_model.configuration
        blob_config = config.get("blob_config")
        search_config = config.get("search_config")
        embedding_config = config.get("embedding_config")
        
        blob_config:BlobConfig = BlobConfig.model_validate(blob_config)
        search_config:SearchConfigDto = SearchConfigDto.model_validate(search_config)
        embedding_config: EmbeddingModelConfig = EmbeddingModelConfig.model_validate(embedding_config)

    
        # Initialize blob reader
        logger.info(f"🚀 Starting RAG ingestion for request id {request_id}")

        extracted_items = []
        async for item in cls.stream_json_items_from_blob(blob_config=blob_config, request_id=request_id):
            extracted_items.append(item)
        extracted_items = extracted_items[:30]
        logger.info(f"📄 Retrieved {len(extracted_items)} pages from blob")
        
        # Convert paragraphs into flat text content for chunking
        

        logger.info(f"🧩 Extracted {len(extracted_items)} text entries from blob content")

        # Split content into manageable text chunks
        chunks = TextChunker(max_tokens=500).chunk_documents(extracted_items)
        logger.info(f"✂️ Chunked into {len(chunks)} total chunks")

        # Initialize embedding service
        embedding_service = AzureEmbeddingService(
            api_key=embedding_config.api_key,
            endpoint=embedding_config.endpoint,
            deployment_name=embedding_config.model_name
        )

        # Generate embeddings in batches
        texts = [chunk["text"] for chunk in chunks]
        embeddings = await embedding_service.create_embeddings(texts)
        logger.info("🚀 Created embeddings for all chunks")
        for i, chunk in enumerate(chunks):
            chunk["embeddings"] = embeddings[i]

        logger.info("✅ Embeddings successfully created for all chunks")

        # Index chunks into search service
        await IndexChunksTool.index_chunks(
            search_config=search_config,
            extracted_chunks=chunks,
            request_id=request_id
        )

        logger.info("📦 Successfully indexed all chunks into search index")
        return {"request_id": request_id, "message": "successfully ingested and indexed data"}

    @classmethod
    async def rag_retrieval(cls, rag_retrieval_config: dict, search_config: dict, embedding_config: dict, request_id: str):
        """Placeholder for RAG retrieval tool."""
        
        rag_retrieval_config: RagRetrievalConfig = RagRetrievalConfig.model_validate(rag_retrieval_config)
        search_config: SearchConfigDto = SearchConfigDto.model_validate(search_config)
        embedding_config: EmbeddingModelConfig = EmbeddingModelConfig.model_validate(embedding_config)
        embedding_service = AzureEmbeddingService(
            api_key=embedding_config.api_key,
            endpoint=embedding_config.endpoint,
            deployment_name=embedding_config.model_name
        )
        query_embedding = await embedding_service.get_embedding(text=rag_retrieval_config.query)
        search_service = ChunkIndexer(search_config=search_config)
        
        results = await search_service.search_similar_docs(query_vector=query_embedding, rag_retrieval_config=rag_retrieval_config)
        return results
    
    @classmethod
    async def stream_json_items_from_blob(cls, blob_config: BlobConfig, request_id: str):
        """
        Stream a large JSON file from Azure Blob Storage and yield each paragraph
        along with its corresponding page_number.
        Handles arbitrarily large files efficiently.
        """

        try:
            azure_blob_storage_instance = AzureBlobStorageManager(
                api_key=blob_config.api_key,
                endpoint=blob_config.endpoint,
                container_name=blob_config.source_blob_container,
            )

            blob_name = f"{request_id}.json"
            logger.info(f"📥 Reading blob {blob_name} from container {blob_config.source_blob_container}")
            blob_stream = await azure_blob_storage_instance.read_blob_content(blob_name=blob_name)

            buffer = b""

            async for chunk in blob_stream.chunks():
                buffer += chunk
                try:
                    # Parse items inside the top-level JSON structure
                    parser = items(buffer, "items.item")
                    for page in parser:
                        # Each page is a dictionary
                        if isinstance(page, dict):
                            page_number = page.get("page_number")
                            for para in page.get("paragraphs", []):
                                yield {
                                    "page_number": page_number,
                                    "paragraph_number": para.get("paragraph_number"),
                                    "text": para.get("content", "").strip(),
                                }

                    buffer = b""

                except common.IncompleteJSONError:
                    # Wait for more data (partial JSON)
                    continue

            logger.info("✅ Completed streaming JSON items from blob")

        except Exception as e:
            logger.error(f"❌ Error reading blob content: {e}", exc_info=True)
            raise