import uuid
import logging
from datetime import datetime
from typing import List, Optional

from models.checklist_request import SearchConfig

from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    SearchIndex,
    SimpleField,
    SearchField,
    SearchFieldDataType,
    VectorSearch,
    VectorSearchProfile,
    HnswAlgorithmConfiguration,
    VectorSearchAlgorithmKind,
)
from azure.core.exceptions import ResourceNotFoundError

from beartype import beartype

logger = logging.getLogger("AzureSearch")


class ChunkIndexer:
    """
    Handles indexing (storing) of text chunks into Azure AI Search.
    """

    def __init__(self, search_config: SearchConfig, embedding_dim: int = 3072, create_if_not_exists: bool = True):
        self.index_name = search_config.index_name
        self.endpoint = search_config.endpoint
        self.credential = AzureKeyCredential(search_config.api_key)
        self.embedding_dim = embedding_dim

        self.index_client = SearchIndexClient(endpoint=self.endpoint, credential=self.credential)

        # Ensure index exists
        self._ensure_index_exists(create_if_not_exists=create_if_not_exists)

        # Initialize search client
        self.client = SearchClient(
            endpoint=self.endpoint,
            index_name=self.index_name,
            credential=self.credential
        )

    def _ensure_index_exists(self, create_if_not_exists: bool = True):
        """
        Create the index if it does not exist.
        """
        try:
            self.index_client.get_index(self.index_name)
            
            logger.info(f"✅ Index '{self.index_name}' already exists.")
        except ResourceNotFoundError:
            logger.warning(f"⚠️ Index '{self.index_name}' not found. Creating a new one...")

            fields = [
                SimpleField(name="id", type=SearchFieldDataType.String, key=True),
                SimpleField(name="request_id", type=SearchFieldDataType.String, filterable=True),
                SimpleField(name="created_at", type=SearchFieldDataType.String, filterable=True),
                SimpleField(name="source", type=SearchFieldDataType.String, searchable=True, filterable=True),
                SimpleField(name="page_number", type=SearchFieldDataType.Int32, filterable=True),
                SimpleField(name="paragraph_number", type=SearchFieldDataType.Int32, filterable=True),
                SimpleField(name="text", type=SearchFieldDataType.String, searchable=True),
                SearchField(
                    name="embeddings",
                    type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
                    searchable=True,
                    vector_search_dimensions=self.embedding_dim,
                    vector_search_profile_name="default-profile"
                ),
            ]

            vector_search = VectorSearch(
                profiles=[VectorSearchProfile(
                    name="default-profile",
                    algorithm_configuration_name="hnsw-config"
                )],
                algorithms=[HnswAlgorithmConfiguration(
                    name="hnsw-config",
                    kind=VectorSearchAlgorithmKind.HNSW,
                    parameters={
                        "m": 4,
                        "efConstruction": 400,
                        "efSearch": 500,
                        "metric": "cosine"
                    }
                )]
            )

            index = SearchIndex(
                name=self.index_name,
                fields=fields,
                vector_search=vector_search
            )

            if create_if_not_exists:
                self.index_client.create_index(index)
                logger.info(f"🎯 Index '{self.index_name}' created successfully.")

    # @beartype
    async def index_chunks(self, chunks: List[dict], request_id: Optional[str] = None) -> dict:
        request_id = request_id or str(uuid.uuid4())
        documents = []

        for chunk in chunks:
            # Convert ChunkModel to dict if necessary
            if hasattr(chunk, "dict"):
                chunk = chunk.dict()

            chunk_data = {
                "id": str(uuid.uuid4()),
                "request_id": request_id,
                "created_at": datetime.utcnow().isoformat(),
                "source": chunk.get("source", "blob"),
                "page_number": chunk.get("page_number"),
                "paragraph_number": chunk.get("paragraph_number"),
                "text": chunk.get("text"),
                "embeddings": chunk.get("embeddings"),
            }
            documents.append(chunk_data)

        result = self.client.upload_documents(documents)
        succeeded = sum(1 for r in result if getattr(r, "succeeded", False))

        return {
            "status": "success" if succeeded == len(result) else "partial",
            "indexed": succeeded,
            "failed": len(result) - succeeded,
            "request_id": request_id,
            "timestamp": datetime.utcnow().isoformat()
        }


    async def search_similar_docs(self, query_vector: List[float], rag_retrieval_config):
        """
        Search for documents similar to the given embedding vector.
        """
        from azure.search.documents.models import VectorizedQuery

        vector_query = VectorizedQuery(
            vector=query_vector,
            k_nearest_neighbors=5,
            fields="embeddings"  # must be a list
        )

        results = self.client.search(
            vector_queries=[vector_query],
            select=["text"],
            filter=rag_retrieval_config.filter
        )

        return [r for r in results]
