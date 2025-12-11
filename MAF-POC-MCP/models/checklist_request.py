import base64

from pydantic import BaseModel, Field, model_validator,Base64Str
from typing import List, Dict, Any, Optional
from constants.enums import AuditFileType
from models.rag_request import RagIngestionDto, RagRetrievalConfig
from models.dto import SearchConfigDto, EmbeddingModelConfig, OpenAIChatModelConfig, PromptDto

from utils.uuid_utils import generate_request_id

class PromptConfig(BaseModel):
    system_prompt: str = Field(..., description="System-level instructions applied to every checklist response.")
    user_prompt: str = Field(..., description="User-level prompt template driving request-specific behavior.")
    
    @model_validator(mode="before")
    def decode_base64(cls, values):
        system_prompt = values.get("system_prompt")
        user_prompt = values.get("user_prompt")
        if isinstance(system_prompt, bytes):
            values['system_prompt'] = base64.b64decode(system_prompt).decode('utf-8')
        if isinstance(user_prompt, bytes):
            values['user_prompt'] = base64.b64decode(user_prompt).decode('utf-8')
        return values

class CosmosConfig(BaseModel):
    endpoint: str = Field(..., description="Cosmos DB account endpoint URI.")
    key: str = Field(..., description="Access key for authenticating with the Cosmos DB account.")
    database_name: str = Field(..., description="Target Cosmos DB database name.")
    container_name: str = Field(..., description="Cosmos DB container that stores checklist artifacts.")
    source: Optional[str] = Field(default=None, description="Optional label identifying the originating data source.")

class SearchConfig(BaseModel):
    endpoint: str = Field(..., description="Cognitive Search service endpoint URI.")
    index_name: str = Field(..., description="Name of the search index queried during checklist retrieval.")
    api_key: str = Field(..., description="API key granting access to the search service.")

class OpenAIChatModelConfig(BaseModel):
    deployment_name: str = Field(..., description="Azure OpenAI deployment name for the chat model.")
    model_name: str = Field(..., description="Underlying chat model identifier (e.g., gpt-4o).")
    api_version: str = Field(..., description="Azure OpenAI API version used for requests.")
    endpoint: str = Field(..., description="Azure OpenAI endpoint hosting the deployment.")
    api_key: str = Field(..., description="Credential used to invoke the chat deployment.")

class EmbeddingConfig(BaseModel):
    model_name: str = Field(..., description="Embedding model identifier used for vectorization.")
    api_key: str = Field(..., description="Credential used to access the embedding model.")
    endpoint: str = Field(..., description="Endpoint URL for the embedding service.")

class DocumentAnalysisConfig(BaseModel):
    endpoint: str = Field(..., description="Document Intelligence endpoint used for extraction.")
    api_key: str = Field(..., description="API key for authenticating with Document Intelligence.")

class SourceFileDto(BaseModel):
    file_type: AuditFileType = Field(..., description="Type of audit file to ingest (e.g., PDF, DOCX).")
    file_path: str = Field(..., description="Path or blob reference to the audit file.")

class BlobConfig(BaseModel):
    endpoint: str = Field(..., description="Blob storage account endpoint.")
    source_blob_container: str = Field(..., description="Container holding source documents for ingestion.")
    source_blob_paths: Optional[List[SourceFileDto]] = Field(default=None, description="Optional list of specific source files to process.")
    extraction_blob_url: Optional[str] = Field(default=None, description="Direct SAS URL for extraction inputs when available.")
    output_blob_container: Optional[str] = Field(default=None, description="Container where processed outputs are written.")
    api_key: str = Field(..., description="Credential for accessing the blob storage account.")

class ChecklistRequest(BaseModel):
    request_id: Optional[str] = Field(None, description="Unique identifier for this request. If not provided, will be generated.")
    prompt: PromptConfig = Field(..., description="Prompt configuration")
    
    blob_config: BlobConfig = Field(..., description="Blob configuration")
    search_config: SearchConfig = Field(..., description="Search configuration")
    openai_chat_model_config: OpenAIChatModelConfig = Field(..., description="OpenAI chat model configuration")
    embedding_config: EmbeddingConfig = Field(..., description="Embedding configuration")
    max_retries: Optional[int] = Field(3, description="Maximum number of retries")
    extraction_blob_url: Optional[str] = Field(None, description="URL path for extraction service")
    document_analysis_config: DocumentAnalysisConfig = Field(..., description="Document Intellegence configuration")
    retrieval_config: RagRetrievalConfig = Field(..., description="RAG retrieval configuration")
    
    @model_validator(mode="before")
    def ensure_request_id(cls, values):
        if not values.get("request_id"):
            values["request_id"] = generate_request_id()
        return values



class RagExtractionDto(BaseModel):
    """DTO for PDF extraction requests."""
    openai_chat_model_config: OpenAIChatModelConfig = Field(..., description="Chat model settings leveraged during extraction.")
    blob_config: BlobConfig = Field(..., description="Blob storage configuration for extraction inputs/outputs.")
    document_analysis_config: DocumentAnalysisConfig = Field(..., description="Document Intelligence credentials for parsing source files.")
    max_retries: int = Field(default=3, description="Maximum number of extraction retry attempts.")

class ChecklistProcessDto(BaseModel):
    rag_retrieval_config: RagRetrievalConfig = Field(..., description="RAG retrieval parameters controlling grounding behavior.")
    search_config: SearchConfigDto = Field(..., description="Search configuration used for knowledge retrieval.")
    embedding_config: EmbeddingModelConfig = Field(..., description="Embedding model settings for vector generation.")
    openai_chat_model_config: OpenAIChatModelConfig = Field(..., description="Chat model settings for checklist generation.")
    max_retries: int = Field(default=3, description="Maximum retries for processing failures.")
    blob_config: BlobConfig = Field(..., description="Blob storage configuration for checklist inputs/outputs.")
    prompt: PromptDto = Field(..., description="Prompt template definitions used during checklist creation.")





