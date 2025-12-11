from pydantic import BaseModel
from typing import Any, Optional
from common_server.schemas.cognitive_service import SearchConfig as SearchConfigDto
from common_server.schemas.cosmos import CosmosConfigDto
from common_server.schemas.base import BaseDto

class PromptDto(BaseDto):
    system_prompt: str
    user_prompt: str
    
class EmbeddingModelConfig(BaseDto):
    model_name: str
    api_key: str
    endpoint: str

class OpenAIChatModelConfig(BaseDto):
    deployment_name: str
    model_name: str
    api_version: str
    endpoint: str
    api_key: str

class RagIngestionDto(BaseDto):
    prompt: PromptDto
    search_config: SearchConfigDto
    embedding_config: EmbeddingModelConfig
    openai_chat_model_config: OpenAIChatModelConfig
    max_retries: int = 3

class RagRetrievalConfig(BaseDto):
    query: str
    filter: str = "request_id eq '{request_id}'"

class RagRetrievalDto(BaseDto):

    rag_retrieval_config: RagRetrievalConfig
    search_config: SearchConfigDto
    embedding_config: EmbeddingModelConfig
    openai_chat_model_config: OpenAIChatModelConfig
    max_retries: int = 3