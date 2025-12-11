import json
from agent_framework import (
    ChatAgent, Workflow, InMemoryCheckpointStorage,WorkflowContext,WorkflowBuilder,Executor,handler,AgentExecutorResponse
)
from agent_framework.ag_ui import AgentFrameworkAgent

from agents.supervisor_agent import run_supervisor_executor
from logger import get_logger
from agents.extraction_agent import run_rag_extraction_agent
from agents.ingestion_agent import run_rag_ingestion_agent
from agents.checklist_agent import run_checklist_loading_agent
from models.checklist_request import ChecklistRequest, RagExtractionDto, ChecklistProcessDto
from models.dto import RagIngestionDto
from agent_framework import HandoffBuilder

from models.tool_call_dto import SuperVisorAgentPayloadDto
from service.openai_client_service import OpenAIClientService

logger = get_logger(__name__)

def build_checklist_workflow() -> Workflow:
    """
    Build a multi-agent workflow:
      1. PDF Extraction Agent
      2. RAG Ingestion Agent
      3. Checklist Answering Agent
    """

    # Create in-memory checkpoint storage
    checkpoint_storage = InMemoryCheckpointStorage()

    # Instantiate agent executors
    extraction_executor = run_rag_extraction_agent()
    ingestion_executor = run_rag_ingestion_agent()
    checklist_processing_executor = run_checklist_loading_agent()
    
    # supervisor executor executos and decides which tool to call
    supervisor_executor = run_supervisor_executor()
    
    workflow = (
        HandoffBuilder(
            name="Checklist workflow",
            participants=[supervisor_executor,extraction_executor, ingestion_executor,checklist_processing_executor],
            description="Workflow to process checklist requests using multiple agents.please dont process if you dont get any input from user,also dont create your own payloads"
        )
        .set_coordinator(supervisor_executor)
        .add_handoff(supervisor_executor,[extraction_executor, ingestion_executor, checklist_processing_executor])
        .add_handoff(extraction_executor, [ingestion_executor])
        .add_handoff(ingestion_executor, [checklist_processing_executor])
        .with_termination_condition(
            # Terminate after a certain number of user messages
            lambda conv: sum(1 for msg in conv if msg.role.value == "user") >= 10
        )
        .with_checkpointing(checkpoint_storage)
        .enable_return_to_previous(enabled=True)
        # .request_prompt("Provide the details for proceeding with the workflow ")
        .build()
    )
    
    return workflow

def build_checklist_workflow_new():
    
    # Create in-memory checkpoint storage
    checkpoint_storage = InMemoryCheckpointStorage()

    # Instantiate agent executors
    extraction_executor = run_rag_extraction_agent()
    ingestion_executor = run_rag_ingestion_agent()
    checklist_processing_executor = run_checklist_loading_agent()
    
    # supervisor executor executos and decides which tool to call
    supervisor_executor = run_supervisor_executor()
    
    
    builder = WorkflowBuilder(name="Checklist workflow new")
    builder.set_start_executor(supervisor_executor)
    builder.add_chain(executors=[supervisor_executor, extraction_executor, ingestion_executor, checklist_processing_executor])
    builder.with_checkpointing(checkpoint_storage)
    return builder.build()

def build_checklist_sequential_workflow() -> Workflow:
    """
    Build a sequential multi-agent workflow:
      1. PDF Extraction Agent
      2. RAG Ingestion Agent
      3. Checklist Answering Agent
    """

    # Create in-memory checkpoint storage
    checkpoint_storage = InMemoryCheckpointStorage()

    # Instantiate agent executors
    extraction_executor = run_rag_extraction_agent()
    ingestion_executor = run_rag_ingestion_agent()
    checklist_processing_executor = run_checklist_loading_agent()
    supervisor_executor = run_supervisor_executor()
 
    workflow = (
        WorkflowBuilder(name="Checklist Sequential Workflow")
        .set_start_executor(supervisor_executor)
        .add_edge(supervisor_executor, extraction_executor)
        .add_edge(extraction_executor, ingestion_executor)
        .add_edge(ingestion_executor, checklist_processing_executor)
        .with_checkpointing(checkpoint_storage)
        .build()
    )

    return workflow
    
      

def get_answering_workflow_agent(payload: ChecklistRequest) -> ChatAgent:
    from models.checklist_request import ChecklistRequest
    # Ensure payload is a ChecklistRequest instance
    if isinstance(payload, dict):
        payload = ChecklistRequest(**payload)
    workflow_agent = ChatAgent(
        chat_client=OpenAIClientService.get_client(payload),
        name="MainAgent",
        description="An AI-powered agent that orchestrates checklist answering using available tools.",
        instructions=(
            "You are an intelligent orchestrator. "
            "Always use the available tools to answer checklist questions and process files as needed. "
            "Do not just plan or explain steps—invoke the tools directly and return their results."
        ),
        tools=build_checklist_workflow
    )
    
    return workflow_agent

class ChecklistWorkflowAgent(AgentFrameworkAgent):
    def __init__(self):
        super().__init__(
            name="checklist_workflow_agent",
            description="Runs KCRA checklist multi-agent workflow",
        )
        
    async def run(self, payload: ChecklistRequest):
        # Call your existing function
        result = await build_checklist_workflow(payload)
        return result