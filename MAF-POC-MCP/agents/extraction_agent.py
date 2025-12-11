from agent_framework import ChatAgent
from agent_framework.azure import AzureOpenAIChatClient
from models.checklist_request import RagExtractionDto
from tool_registry import RagExtractionAITool,SupervisorAgentAITool
from service.azureai_response_service import AzureOpenAIResponsesClientService
import json,os

from utils.config_utils import read_config, ChecklistEnum, get_max_id_by_name


async def rag_extraction_agent(payload: RagExtractionDto, request_id: str):
    
    
    if isinstance(payload, dict):
        payload = RagExtractionDto(**payload)
    client = AzureOpenAIResponsesClientService.get_client(payload)
    extraction_agent = client.create_agent(
        name="RAG Content Extraction Agent",
        instructions=(
            "You are an AI document analyzer. Your task is to:"
            "\n1. Use the RagExtractionAITool to extract content from the PDF at the provided Azure Blob URL."
            "\n2. Analyze the extracted content for structure and meaning"
            "\n3. Identify key information, tables, and sections"
            "\n4. Provide insights about the document's content"
            "\nThe PDF blob URL will be provided in the tool arguments."
        ),
        tools=[SupervisorAgentAITool, RagExtractionAITool],
    )
    messages = json.dumps([
        {
            "role": "system",
            "content": (
                "Use the RagExtractionAITool to extract and analyze the PDF content. "
                "The PDF will be accessed from the Azure Blob Storage URL provided in tool_args. "
                "The tool will handle downloading and processing the PDF."
            )
        },
        {
            "role": "user",
            "content": (
                f"Please analyze the following PDF document.\n\n"
                f"Request ID: {request_id}\n"
                f"Document Analysis Endpoint: {payload.document_analysis_config.endpoint}\n"
                f"Document Analysis Key: {payload.document_analysis_config.api_key}\n\n"
            )
        }
    ])

    agent_response = await extraction_agent.run(
        messages=messages
    )
    analyzed_content = {
        "request_id": request_id,
        "document_analysis": agent_response.text
    }

    return analyzed_content

from agent_framework import chat_middleware,function_middleware,ChatContext,ChatResponseUpdate,TextContent,ChatResponse,ChatMessage,Role
from collections.abc import Callable, Awaitable, AsyncIterable
from agent_framework import AgentRunContext
async def logging_agent_middleware(
    context: AgentRunContext,
    next: Callable[[AgentRunContext], Awaitable[None]],
) -> None:
    """Simple middleware that logs agent execution."""
    for i in context.messages:
        print(f"Message Role: {i.role}, Content: {i.contents}")
        for j in i.contents:
            print(f" - {j.__dict__}")

    # Continue to agent execution
    await next(context)

    print("Agent finished!")
from agent_framework.azure import AzureOpenAIAssistantsClient


    
def run_rag_extraction_agent() -> ChatAgent:
    

    openai_client = AzureOpenAIAssistantsClient(
        endpoint="https://kpmgchatgptpoc.openai.azure.com/",
        api_key="caf461635bc647d5907697642ff27d26",
        api_version="2024-08-01-preview",
        deployment_name="gpt-4o-2"
    )
    extraction_agent = openai_client.create_agent(
        name="Extraction Agent",
        instructions=(
            "You are an AI document analyzer. Your task is to:"
            "\n2. Analyze the extracted content for structure and meaning"
            "\n generate a request id if not provided. Note: the request id will be uuid4."
            "\n include the request id in your final response.only request id and a success message is enough in response"
        ),
        tools=[RagExtractionAITool]
    )
    
    return extraction_agent