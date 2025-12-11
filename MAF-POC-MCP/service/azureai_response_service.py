    
from azure.identity import AzureCliCredential
from agent_framework.azure import AzureOpenAIResponsesClient
from models.checklist_request import RagExtractionDto
class AzureOpenAIResponsesClientService:
    _client = None

    @classmethod
    def get_client(cls, payload: RagExtractionDto):
        if cls._client is None:
            cls._client = AzureOpenAIResponsesClient(  
                endpoint=payload.openai_chat_model_config.endpoint, 
                deployment_name=payload.openai_chat_model_config.deployment_name, 
                api_key=payload.openai_chat_model_config.api_key
                ) 
        return cls._client