from agent_framework import ChatAgent
from agent_framework.azure import AzureOpenAIChatClient
from beartype import beartype
from models.checklist_request import ChecklistProcessDto
# from tool_registry import ChecklistProcessAITool
from service.azureai_response_service import AzureOpenAIResponsesClientService

import json

from tool_registry.checklist_process import ChecklistLoadAITool
from utils.config_utils import read_config, ChecklistEnum, get_max_id_by_name


# @beartype
# async def checklist_processing_agent(payload: dict, request_id: str):
    
#     payload:ChecklistProcessDto = ChecklistProcessDto.model_validate(payload)
    
#     client = AzureOpenAIResponsesClientService.get_client(payload)
  
    
#     rag_answering_Agent = client.create_agent(
#         name="ChecklistProcessingAgent",
#         instructions=(
#             "You are an assistant that helps process checklists using the available tools."
#             " Your tasks include extracting content from files, indexing the content, and answering checklist questions based on the indexed data."
#             " Please provide clear and concise answers and upload the results to the specified output location."
#             " All necessary configurations will be provided in the tool arguments."
#         ),
#         tools=[ChecklistProcessAITool],
#     )
#     messages = json.dumps([
#         {"role": "system", "content": f"{payload.prompt.system_prompt}"},
#         {"role": "user", "content": f"{payload.prompt.user_prompt}"},
#         {
#             "role": "user",
#             "content": (
#                 f"BLOB_CONFIG : {payload.blob_config.model_dump()}" 
#                 f"RAG_RETRIEVAL_CONFIG : {payload.rag_retrieval_config.model_dump()}"
#                 f"EMBEDDING_CONFIG : {payload.embedding_config.model_dump()}"
#                 f"SEARCH_CONFIG : {payload.search_config.model_dump()}"
#                 f"OPENAI_CHAT_MODEL_CONFIG : {payload.openai_chat_model_config.model_dump()}"
#                 f"PROMPT : {payload.prompt.model_dump()}"
#                 f"Request ID: {request_id}"""
#             )
#         }
#     ])

#     rag_answering_Agent_response = await rag_answering_Agent.run(messages=messages, request_id=request_id)
    
#     return rag_answering_Agent_response.messages[1].contents[0].result


# def run_checklist_processing_agent():
    
#     openai_client = AzureOpenAIChatClient(
#         api_key="caf461635bc647d5907697642ff27d26",
#         endpoint="https://kpmgchatgptpoc.openai.azure.com",
#         deployment_name="gpt-4o-2",
#         api_version="2024-08-01-preview",
#     )
#     checklist_processing_agent = ChatAgent(
#         chat_client=openai_client,
#         name="ChecklistProcessingAgent",
#         instructions=(
#             "You are an Checklist Processing Agent. Your task is to:"
#             "\n1. Use the RagAnsweringAITool to answer questions based on the retrieved information."
#             "\n2. Read checklist question file from blob storage"
#             "\n3. Answer each checklist question accurately using the retrieved data."
#             "\n4. Provide clear and concise answers."
#             "\n5. Upload the final checklist answers to the specified output blob storage."
#             "\nThe tool_args will contain all necessary configurations including blob storage details, retrieval settings, embedding model configurations, and the prompt for answering the checklist questions."
#         ),
#         tools=[ChecklistProcessAITool]
#     )
    
#     return checklist_processing_agent

def run_checklist_loading_agent():
    
    config_model = read_config(id=get_max_id_by_name(name=ChecklistEnum.CHECKLIST_AGENT))
    config = config_model.configuration
    
    
    openai_client = AzureOpenAIChatClient(
        api_key="caf461635bc647d5907697642ff27d26",
        endpoint="https://kpmgchatgptpoc.openai.azure.com",
        deployment_name="gpt-4o-2",
        api_version="2024-08-01-preview",
    )
    
    checklist_loading_agent = ChatAgent(
        chat_client=openai_client,
        name="Checklist Agent",
        instructions=(
            "You are an Checklist Loading Agent. Your task is to:"
            "\n1. Use the ChecklistLoadAITool to load checklist block groups from the specified blob storage."
            "\n2. Read checklist question file from blob storage"
            "\n3. Load and organize checklist block groups accurately."
            "\n4. Provide clear and concise information about the loaded checklist block groups."
            "\nThe tool_args will contain all necessary configurations including blob storage details."
            "Use the provided request id for processing. if not provided generate a new uuid4 request id."
            
        ),
        tools=[ChecklistLoadAITool]
    )
    
    return checklist_loading_agent


