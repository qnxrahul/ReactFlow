from openai import AzureOpenAI
from typing import List, Dict

class AzureOpenAIChat:
    ...
    def __init__(self, api_key: str, endpoint: str, deployment_name: str,api_version:str):
        
        """
        Initialize the Azure OpenAI Chat Client.
        :param api_key: API key for authentication
        :param endpoint: Azure OpenAI endpoint URL
        :param deployment_name: Deployment name of the chat model
        """
        self.api_key = api_key
        self.endpoint = endpoint
        self.deployment_name = deployment_name
        
        self.client = AzureOpenAI(
            api_key=self.api_key,
            azure_deployment=self.deployment_name,
            azure_endpoint=self.endpoint,
            api_version=api_version
        )
        
    def invoke_chat(self, messages: List[Dict[str, str]],**kwargs) -> Dict:
        """
        Invoke the chat model with the provided messages.
        :param messages: List of message dictionaries with 'role' and 'content'
        :return: Response from the chat model
        """
        response = self.client.chat.completions.parse(
            model=kwargs.get("model"),
            messages=messages,
            response_format=kwargs.get("response_format")
        )
        return response.choices[0].message.parsed