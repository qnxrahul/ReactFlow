import json
from agent_framework import BaseAgent
from registry.agent_registry import AGENT_REGISTRY
from service.checkpoint_service import CheckpointService
import logging
from service.openai_client_service import OpenAIClientService
from models.tool_call_dto import SuperVisorAgentPayloadDto
from agent_framework.azure import AzureOpenAIChatClient
from agent_framework import ChatAgent
from tool_registry import RagExtractionAITool, RagIngestionAITool,ChecklistLoadAITool

from utils.config_utils import read_config, ChecklistEnum, get_max_id_by_name

logger = logging.getLogger("SupervisorAgent")
logger.setLevel(logging.INFO)

class SupervisorAgent(BaseAgent):
    """
    MAF supervisor agent that orchestrates workflow based on config.
    Supports checkpointing and resumption, fully configurable via orchestration config.
    """
    def __init__(self, name="supervisor_agent"):
        super().__init__(name=name)

    async def invoke(self, context):
        # Expect orchestration config in context.input
        orchestration = context.input.get("orchestration", {})
        request_id = context.input.get("request_id")
        logger.info(f"Starting workflow with request_id: {request_id}")
        logger.info(f"Orchestration config: {orchestration}")
        steps = orchestration.get("steps", [])
        logger.info(f"Steps to execute: {steps}")
        checkpointing = orchestration.get("checkpointing", False)
        resume = orchestration.get("resume", False)
        results, last_result, start_index = CheckpointService.load_checkpoint(request_id, resume)
        for idx, step in enumerate(steps[start_index:], start=start_index):
            agent_name = step.get("agent")
            params = step.get("params", {})
            use_output_from_previous_step = step.get("use_output_from_previous_step", False)
            print(f"use_output_from_previous_step: {use_output_from_previous_step}")
            is_file_details_required = params.get("is_file_details_required", False)

            if last_result is not None and use_output_from_previous_step:
                params["previous_result"] = last_result
            if is_file_details_required:
                params["blob_config"] = context.input.get("blob_config", {})
            logger.info(f"Invoking agent tool: {agent_name} with params: {params}")

            agent_tool = AGENT_REGISTRY.get(agent_name)
            if agent_tool:
                try:
                    # All agents are now function tools, so call them directly
                    result = await agent_tool(params)
                    logger.info(f"Result from agent {agent_name}: {result}")
                    results[agent_name] = result
                    last_result = result
                    if checkpointing:
                        CheckpointService.save_checkpoint(request_id, results, last_result, idx + 1)
                except Exception as e:
                    logger.error(f"Error invoking agent {agent_name}: {e}")
                    results[agent_name] = {"error": str(e)}
                    break
            else:
                logger.error(f"Agent tool '{agent_name}' not found in registry.")
                results[agent_name] = {"error": f"Agent tool '{agent_name}' not found."}
                break
        logger.info(f"Final workflow results: {results}")
        return {"workflow_results": results}



def run_supervisor_executor() -> ChatAgent:
    
    config_model = read_config(id=get_max_id_by_name(name=ChecklistEnum.RAG_AGENT))
    config = config_model.configuration
    
    openai_client = AzureOpenAIChatClient(
        api_key="caf461635bc647d5907697642ff27d26",
        endpoint="https://kpmgchatgptpoc.openai.azure.com",
        deployment_name="gpt-4o-2",
        api_version="2024-08-01-preview"
    )
    supervisor_agent = ChatAgent(
        chat_client=openai_client,
        name="Supervisor Agent",
        instructions=(
            "You are the Supervisor Agent. Your job is to coordinate the workflow by deciding "
            "which agent/tool should execute next. You will analyze the latest user message and "
            "determine what needs to happen next in the process.\n\n"

            "Workflow rules:\n"
            "1. Every request must have a request_id. If the user does not provide one, generate one using uuid4.\n"
            "2. If a request_id is new (not found in the system), start the workflow from the beginning:\n"
            "      a. rag_extraction\n"
            "      b. rag_ingestion\n"
            "      c. checklist_processing\n"
            "3. If the request_id exists, continue the workflow at the correct stage.\n"
            "4. You are responsible only for coordination and deciding what to do next.\n"
            "5. When delegation is required, call exactly one of the tools:\n"
            "      - RagExtractionAITool\n"
            "      - RagIngestionAITool\n"
            "      - ChecklistLoadAITool\n"
            "6. Never call more than one tool in a single turn.\n"
            "7. After each tool is completed, decide whether another tool must be called next.\n"
            "8. Provide a short, natural-language response to the user explaining the action taken.\n\n"

            f"Configuration details: {json.dumps(config)}"
        ),
        
    )

    return supervisor_agent

def run_supervisor_agent() -> ChatAgent:
    
    config_model = read_config(id=get_max_id_by_name(name=ChecklistEnum.RAG_AGENT))
    config = config_model.configuration
    
    openai_client = AzureOpenAIChatClient(
        api_key="caf461635bc647d5907697642ff27d26",
        endpoint="https://kpmgchatgptpoc.openai.azure.com",
        deployment_name="gpt-4o-2",
        api_version="2024-08-01-preview"
    )
    supervisor_agent = ChatAgent(
        chat_client=openai_client,
        name="Supervisor Agent",
        instructions=(
            "You are the Supervisor Agent. Your job is to coordinate the workflow by deciding "
            "which agent/tool should execute next. You will analyze the latest user message and "
            "determine what needs to happen next in the process.\n\n"

            "Workflow rules:\n"
            "1. Every request must have a request_id. If the user does not provide one, generate one using uuid4.\n"
            "2. If a request_id is new (not found in the system), start the workflow from the beginning:\n"
            "      a. rag_extraction\n"
            "      b. rag_ingestion\n"
            "      c. checklist_processing\n"
            "3. If the request_id exists, continue the workflow at the correct stage.\n"
            "4. You are responsible only for coordination and deciding what to do next.\n"
            "5. When delegation is required, call exactly one of the tools:\n"
            "      - RagExtractionAITool\n"
            "      - RagIngestionAITool\n"
            "      - ChecklistLoadAITool\n"
            "6. Never call more than one tool in a single turn.\n"
            "7. After each tool is completed, decide whether another tool must be called next.\n"
            "8. Provide a short, natural-language response to the user explaining the action taken.\n\n"

            f"Configuration details: {json.dumps(config)}"
        ),
        tools=[RagExtractionAITool, RagIngestionAITool, ChecklistLoadAITool],
    )

    return supervisor_agent
