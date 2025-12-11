from agent_framework.azure import AzureOpenAIChatClient
from azure.identity import DefaultAzureCredential
from models.checklist_request import ChecklistRequest
from service.config_service import ConfigService
class OpenAIClientService:
    _client = None

    @classmethod
    def get_client(cls, payload: ChecklistRequest = None):
        if cls._client is not None:
            return cls._client
        if payload and hasattr(payload, 'openai_chat_model_config'):
            config = payload.openai_chat_model_config
            api_key = getattr(config, 'api_key', None) or ConfigService.get("AZURE_OPENAI_API_KEY")
            endpoint = getattr(config, 'endpoint', None) or ConfigService.get("AZURE_OPENAI_ENDPOINT")
            deployment_name = getattr(config, 'deployment_name', None) or ConfigService.get("AZURE_OPENAI_DEPLOYMENT_NAME")
            api_version = getattr(config, 'api_version', None) or ConfigService.get("AZURE_OPENAI_API_VERSION")
        else:
            api_key = ConfigService.get("AZURE_OPENAI_API_KEY")
            endpoint = ConfigService.get("AZURE_OPENAI_ENDPOINT")
            deployment_name = ConfigService.get("AZURE_OPENAI_DEPLOYMENT_NAME")
            api_version = ConfigService.get("AZURE_OPENAI_API_VERSION")
        cls._client = AzureOpenAIChatClient(
            api_key=api_key,
            endpoint=endpoint,
            deployment_name=deployment_name,
            api_version=api_version
        )
        return cls._client
