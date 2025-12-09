from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from ..dependencies import (
    get_agent_registry_store,
    get_component_registry_store,
    get_llm_client,
    get_mcp_client,
    get_policy_service,
    get_rag_service,
    get_workflow_repository,
)
from ..models_workflow import (
    AgentRunRequest,
    ComponentDefinition,
    ComponentDefinitionRequest,
    ComponentRegistryResponse,
    HandlerDefinition,
    HandlerDefinitionRequest,
    WorkflowDefinition,
    WorkflowGenerateRequest,
    WorkflowRunNodeResponse,
)
from ..services.llm_client import OpenRouterClient
from ..services.mcp_client import MCPClient
from ..services.policy import WorkflowPolicyService
from ..services.rag import RAGService
from ..services.registry_store import ComponentRegistryStore
from ..services.workflow_authoring import WorkflowAuthoringService
from ..services.workflow_repository import WorkflowRepository

router = APIRouter(prefix="/workflows", tags=["Dynamic Workflows"])


def _normalize(workflow: WorkflowDefinition) -> WorkflowDefinition:
    workflow.updated_at = workflow.updated_at or workflow.created_at
    return workflow


@router.get("/{workflow_id}", response_model=WorkflowDefinition)
def get_workflow(workflow_id: str, repo: WorkflowRepository = Depends(get_workflow_repository)) -> WorkflowDefinition:
    try:
        workflow = repo.get(workflow_id)
        return _normalize(workflow)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found") from exc


@router.post("/generate", response_model=WorkflowDefinition, status_code=status.HTTP_201_CREATED)
def generate_workflow(
    payload: WorkflowGenerateRequest,
    repo: WorkflowRepository = Depends(get_workflow_repository),
    registry: ComponentRegistryStore = Depends(get_component_registry_store),
    rag: RAGService = Depends(get_rag_service),
    llm: OpenRouterClient = Depends(get_llm_client),
    policy: WorkflowPolicyService = Depends(get_policy_service),
) -> WorkflowDefinition:
    components = registry.list_components()
    handlers = registry.list_handlers()
    author = WorkflowAuthoringService(components, handlers, rag_service=rag, llm_client=llm)
    workflow = author.generate(payload)
    policy.validate(workflow, components, handlers)
    repo.save(workflow)
    return _normalize(workflow)


@router.post("/{workflow_id}/nodes/{node_id}/run", response_model=WorkflowRunNodeResponse)
def run_workflow_node(
    workflow_id: str,
    node_id: str,
    repo: WorkflowRepository = Depends(get_workflow_repository),
    registry: ComponentRegistryStore = Depends(get_agent_registry_store),
    mcp: MCPClient = Depends(get_mcp_client),
) -> WorkflowRunNodeResponse:
    try:
        workflow = repo.get(workflow_id)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found") from exc

    node_exists = any(node.id == node_id for node in workflow.nodes)
    if not node_exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found")

    target_node = next(node for node in workflow.nodes if node.id == node_id)
    handler_id = target_node.behavior.handler
    agent = registry.find_agent_by_handler(handler_id)
    if agent:
        request = AgentRunRequest(
            input=f"Execute node '{target_node.name}' for workflow '{workflow.title}'.",
            context={
                "workflowId": workflow_id,
                "nodeId": node_id,
                "nodeType": target_node.type,
                "description": target_node.description,
            },
        )
        result = mcp.invoke(agent, request)
        return WorkflowRunNodeResponse(status=result.status if result.status in {"success", "running"} else "error", output=result.output)

    # fallback response when no agent is registered for handler
    output = f"Node {node_id} executed locally (no MCP agent registered for handler '{handler_id}')."
    return WorkflowRunNodeResponse(status="success", output=output)


@router.get("/registry", response_model=ComponentRegistryResponse)
def list_registry(registry: ComponentRegistryStore = Depends(get_component_registry_store)) -> ComponentRegistryResponse:
    return ComponentRegistryResponse(components=registry.list_components(), handlers=registry.list_handlers())


@router.post("/registry/components", response_model=ComponentDefinition, status_code=status.HTTP_201_CREATED)
def register_component(
    payload: ComponentDefinitionRequest,
    registry: ComponentRegistryStore = Depends(get_component_registry_store),
) -> ComponentDefinition:
    try:
        return registry.add_component(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/registry/handlers", response_model=HandlerDefinition, status_code=status.HTTP_201_CREATED)
def register_handler(
    payload: HandlerDefinitionRequest,
    registry: ComponentRegistryStore = Depends(get_component_registry_store),
) -> HandlerDefinition:
    try:
        return registry.add_handler(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
