import json

from agent_framework import ChatAgent
from agent_framework.azure import AzureOpenAIChatClient

from models.rag_request import RagIngestionDto, RagRetrievalDto
from tool_registry import RagIngestionAITool,RagRetrievalAITool
from agent_framework import ai_function
from service.openai_client_service import OpenAIClientService

@ai_function
async def rag_ingestion_agent(payload:RagIngestionDto,request_id:str):
    openai_client = OpenAIClientService.get_client(payload)
    rag_agent = ChatAgent(
        chat_client=openai_client,
        instructions=(
            "You are a RAG ingestion assistant. "
            "Use the RagIngestionTool to retrieve data from Cosmos DB and index it into the search service. "
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
            "content": f"Azure Search Configuration: {payload.search_config.model_dump()} and Embedding Configuration: {payload.embedding_config.model_dump()} and Request ID: {request_id}"
        }
    ], indent=2)

    rag_ingestion_agent_response = await rag_agent.run(messages=messages_json)
    
    return rag_ingestion_agent_response.text

async def rag_retrieval_agent(payload:RagRetrievalDto,request_id:str):
    openai_client = OpenAIClientService.get_client(payload)

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
            "content": f"here is the Azure Search Configuration: {payload.search_config.model_dump()} and Embedding Configuration: {payload.embedding_config.model_dump()} and Request ID: {request_id} and the rag retrieval config is: {payload.rag_retrieval_config.model_dump()}"
        }
    ], indent=2)

    rag_retrieval_agent_response = await rag_retrieval_agent.run(messages=messages_json, request_id=request_id)

    return rag_retrieval_agent_response.text