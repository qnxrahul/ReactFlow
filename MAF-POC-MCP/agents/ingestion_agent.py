import json

from agent_framework import ChatAgent
from agent_framework.azure import AzureOpenAIChatClient

from models.dto import RagIngestionDto, RagRetrievalDto
from tool_registry import RagIngestionAITool,RagRetrievalAITool
from service.openai_client_service import OpenAIClientService
from models.checklist_request import ChecklistRequest
from utils.config_utils import read_config, ChecklistEnum, get_max_id_by_name



async def rag_ingestion_agent(payload:ChecklistRequest, request_id:str):
    if isinstance(payload, dict):
        payload = ChecklistRequest(**payload)
    openai_client = OpenAIClientService.get_client(payload)
    rag_agent = ChatAgent(
        chat_client=openai_client,
        instructions=(
            "You are a RAG ingestion assistant. "
            "Use the RagIngestionTool to retrieve data from blob storage and index it into the search service. "
            "Follow the provided system and user prompts carefully."
        ),
        tools=[RagIngestionAITool],
        name="RAG Ingestion Agent"
    )
    
    messages_json = json.dumps([
        {"role": "system", "content": payload.prompt.system_prompt},
        {"role": "user", "content": payload.prompt.user_prompt},
        {
            "role": "user",
            "content": (
                f"here is the Azure Search Configuration: {json.dumps(payload.search_config.model_dump())} "
                f"and Embedding Configuration: {json.dumps(payload.embedding_config.model_dump())} "
                f"and Request ID: {request_id} "
            )
        }
    ], indent=2)

    rag_ingestion_agent_response = await rag_agent.run(messages=messages_json)
    
    return rag_ingestion_agent_response.text

async def rag_retrieval_agent(payload:RagRetrievalDto,request_id:str):
    
    
    openai_client = AzureOpenAIChatClient(
        api_key=payload.openai_chat_model_config.api_key,
        endpoint=payload.openai_chat_model_config.endpoint,
        deployment_name=payload.openai_chat_model_config.deployment_name,
        api_version=payload.openai_chat_model_config.api_version
    )
    rag_retrieval_agent = ChatAgent(
        chat_client=openai_client,
        instructions=(
            "You are a RAG retrieval assistant. "
            "Use the RagRetrievalTool to retrieve relevant chunks from the search index. "
            "Follow the provided system and user prompts carefully."
        ),
        tools=[RagRetrievalAITool],
        name="RAG Retrieval Agent"
    )
    
    messages_json = json.dumps([
        {"role": "system", "content": " you are a RAG retrieval assistant."},
        {"role": "user", "content": "Please list the complete error trace if any error occurs during retrieval."},
        {
            "role": "user",
            "content": (
                f"here is the Azure Search Configuration: {json.dumps(payload.search_config.model_dump())} "
                f"and Embedding Configuration: {json.dumps(payload.embedding_config.model_dump())} "
                f"and Request ID: {request_id} "
                f"and the rag retrieval config is: {json.dumps(payload.rag_retrieval_config.model_dump())}"
            )
        }
    ], indent=2)

    rag_retrieval_agent_response = await rag_retrieval_agent.run(messages=messages_json, request_id=request_id)

    return rag_retrieval_agent_response.text


def run_rag_ingestion_agent():
    
    
    openai_client = AzureOpenAIChatClient(
        api_key="caf461635bc647d5907697642ff27d26",
        endpoint="https://kpmgchatgptpoc.openai.azure.com",
        deployment_name="gpt-4o-2",
        api_version="2024-08-01-preview"
    )
    rag_retrieval_agent = ChatAgent(
        chat_client=openai_client,
        instructions=(
            "You are a RAG ingestion assistant. "
            "Use the RagIngestionAITool to retrieve relevant chunks from the search index. "
            "Make sure to only use the tool when necessary."
            "include the request id in your final response."
        ),
        tools=[RagIngestionAITool],
        name="Ingestion Agent"
    )
    
    return rag_retrieval_agent