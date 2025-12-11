
from pydantic import BaseModel
from models.checklist_request import BlobConfig, DocumentAnalysisConfig
from models.dto import CosmosConfigDto, EmbeddingModelConfig,SearchConfigDto,RagRetrievalConfig,OpenAIChatModelConfig,PromptDto
from pydantic import Field
from typing import Optional


class ChunkRetrievalToolCallDto(BaseModel):
    """Data Transfer Object for calling the Chunk Retrieval Tool."""
    cosmos_config: CosmosConfigDto
    request_id: str
    
class IndexingToolCallDto(BaseModel):
    """Data Transfer Object for calling the Indexing Tool."""
    search_config: SearchConfigDto
    request_id: str
    extracted_chunks: dict
    


class RagToolCallDto(BaseModel):
    """Data Transfer Object for calling the RAG Tool."""
 
    # embedding_config: EmbeddingModelConfig
    # search_config: SearchConfigDto
    # blob_config: BlobConfig
    request_id: str
    
class RagRetrievalToolCallDto(BaseModel):
    """Data Transfer Object for calling the RAG Retrieval Tool."""
    rag_retrieval_config: RagRetrievalConfig
    embedding_config: EmbeddingModelConfig
    search_config: SearchConfigDto
    request_id: str

class PdfExtractionToolCallDto(BaseModel):
    """DTO for calling the PDF extraction tool via the agent."""
    

    # blob_config: BlobConfig
    # document_analysis_config: DocumentAnalysisConfig
    request_id:str
    


class ChecklistProcessingToolCallDto(BaseModel):
    # blob_config: BlobConfig = Field(description="Blob storage configuration")
    # rag_retrieval_config: RagRetrievalConfig = Field(description="RAG retrieval configuration")
    # search_config: SearchConfigDto = Field(description="Azure Search configuration")
    # embedding_config: EmbeddingModelConfig = Field(description="Embedding model configuration")
    # openai_chat_model_config: OpenAIChatModelConfig = Field(description="OpenAI chat model configuration")
    request_id: str = Field(description="Unique request identifier")
    prompt: PromptDto = Field(description="Prompt configuration")


class SuperVisorAgentPayloadDto(BaseModel):
    """DTO for Supervisor Agent Payload."""
    prompt: PromptDto
    openai_chat_model_config: OpenAIChatModelConfig
    
class ProcessFileToolCallDto(BaseModel):
    """DTO for Extraction Agent Executor Tool Call."""
    blob_config: BlobConfig
    file_name: str
    file_content: bytes  # DevUI can accept file uploads for byte fields
    mime_type: Optional[str] = None
    
class ChecklistBlockGroupsToolCallDto(BaseModel):
    """DTO for Checklist Block Groups."""
    blob_config: BlobConfig