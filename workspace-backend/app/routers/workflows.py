from __future__ import annotations

from datetime import datetime

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
    WorkflowAssistRequest,
    WorkflowAssistResponse,
    WorkflowDefinition,
    WorkflowGenerateRequest,
    WorkflowNode,
    WorkflowNodeBehavior,
    WorkflowNodeUI,
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


@router.post("/assist", response_model=WorkflowAssistResponse)
def assist_workflow(
    payload: WorkflowAssistRequest,
    registry: ComponentRegistryStore = Depends(get_component_registry_store),
    agent_registry: ComponentRegistryStore = Depends(get_agent_registry_store),
    repo: WorkflowRepository = Depends(get_workflow_repository),
    rag: RAGService = Depends(get_rag_service),
    llm: OpenRouterClient = Depends(get_llm_client),
    policy: WorkflowPolicyService = Depends(get_policy_service),
) -> WorkflowAssistResponse:
    components = registry.list_components()
    handlers = registry.list_handlers()
    author = WorkflowAuthoringService(components, handlers, rag_service=rag, llm_client=llm)

    context = payload.context or {}
    existing_workflow: WorkflowDefinition | None = None
    if payload.workflow_id:
        try:
            existing_workflow = repo.get(payload.workflow_id)
        except KeyError:
            existing_workflow = None

    domain = payload.domain or context.get("domain") or (existing_workflow.domain if existing_workflow else "General")
    intent = payload.intent or context.get("intent") or (existing_workflow.intent if existing_workflow else "analysis")
    description_parts = []
    if existing_workflow and existing_workflow.intent:
        description_parts.append(existing_workflow.intent)
    if payload.description:
        description_parts.append(payload.description)
    if payload.question:
        description_parts.append(f"User question: {payload.question}")
    description = "\n".join(part for part in description_parts if part)

    request = WorkflowGenerateRequest(
        domain=str(domain),
        intent=str(intent),
        description=description or "Provide actionable workflow steps.",
        preferred_handlers=payload.preferred_handlers or [],
        context_keywords=payload.context_keywords or [],
    )

    generated = author.generate(request)
    agent_context = (payload.context or {}).get("agentId")
    handler_hint = None
    agent_profile = None
    if agent_context:
        agent_profile = agent_registry.find_agent_by_id(str(agent_context))
        if agent_profile:
            handler_hint = agent_profile.handler

    if handler_hint:
        filtered_nodes = [node for node in generated.nodes if node.behavior.handler == handler_hint]
        filtered_ids = {node.id for node in filtered_nodes}
        filtered_edges = [edge for edge in generated.edges if edge.source in filtered_ids and edge.target in filtered_ids]
        if not filtered_nodes and agent_profile:
            fallback_node = WorkflowNode(
                type="agentTask",
                name=agent_profile.name,
                description=agent_profile.description,
                ui=WorkflowNodeUI(component_type="agentCard", props={"subtitle": agent_profile.mcp_tool}),
                behavior=WorkflowNodeBehavior(handler=agent_profile.handler, kind="llm-agent"),
            )
            filtered_nodes = [fallback_node]
            filtered_ids = {fallback_node.id}
            filtered_edges = []

        if filtered_nodes:
            generated = generated.model_copy(update={"nodes": filtered_nodes, "edges": filtered_edges})
    policy.validate(generated, components, handlers)

    suggested_nodes = generated.nodes
    result_workflow = generated
    if existing_workflow:
        merged = existing_workflow.model_copy(
            update={
                "nodes": existing_workflow.nodes + generated.nodes,
                "edges": existing_workflow.edges + generated.edges,
                "updated_at": datetime.utcnow(),
            }
        )
        policy.validate(merged, components, handlers)
        repo.save(merged)
        result_workflow = merged
    else:
        repo.save(generated)

    answer = _build_assist_answer(llm, payload, result_workflow)
    return WorkflowAssistResponse(answer=answer, suggested_nodes=suggested_nodes, workflow=result_workflow)


def _build_assist_answer(llm: OpenRouterClient, payload: WorkflowAssistRequest, workflow: WorkflowDefinition) -> str:
    summary = ", ".join(node.name for node in workflow.nodes[:4]) or "new workflow steps were drafted"
    if llm and llm.enabled:
        prompt = "\n".join(
            [
                "You are an audit workflow assistant.",
                f"Question: {payload.question}",
                f"Workflow summary: {summary}",
                f"Domain: {workflow.domain}",
                f"Intent: {workflow.intent}",
                "Provide a concise recommendation for the next steps.",
            ]
        )
        try:
            return llm.generate(
                [
                    {"role": "system", "content": "You help audit teams plan workflows."},
                    {"role": "user", "content": prompt},
                ]
            )
        except Exception:
            pass
    return f"{summary}. Focus on executing these steps to address the question."
