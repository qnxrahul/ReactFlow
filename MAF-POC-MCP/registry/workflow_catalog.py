from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field

from .agent_catalog import CATALOG as AGENT_CATALOG, AgentCatalogItem


class WorkflowNodeModel(BaseModel):
    id: str
    type: str = "agentTask"
    name: str
    description: Optional[str] = None
    ui: Dict[str, Any] = Field(default_factory=dict)
    behavior: Dict[str, Any] = Field(default_factory=dict)


class WorkflowEdgeModel(BaseModel):
    id: str
    source: str
    target: str
    label: Optional[str] = None
    condition: Optional[str] = None


class WorkflowDefinitionModel(BaseModel):
    id: str
    title: str
    domain: str
    intent: Optional[str] = None
    source: str = "template"
    nodes: List[WorkflowNodeModel]
    edges: List[WorkflowEdgeModel]
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")
    updated_at: datetime = Field(default_factory=datetime.utcnow, alias="updatedAt")

    class Config:
        populate_by_name = True


class WorkflowCatalogItem(BaseModel):
    id: str
    title: str
    description: str
    category: str
    tags: List[str] = Field(default_factory=list)
    source: str = "preset"
    definition: WorkflowDefinitionModel


class WorkflowExecutionStep(BaseModel):
    node_id: str = Field(alias="nodeId")
    name: str
    handler: Optional[str] = None
    agent_id: Optional[str] = Field(default=None, alias="agentId")
    agent_name: Optional[str] = Field(default=None, alias="agentName")
    status: str
    output: str
    started_at: datetime = Field(alias="startedAt")
    finished_at: datetime = Field(alias="finishedAt")

    class Config:
        populate_by_name = True


class WorkflowExecutionResponse(BaseModel):
    workflow_id: str = Field(alias="workflowId")
    request_id: str = Field(alias="requestId")
    status: str
    steps: List[WorkflowExecutionStep]
    started_at: datetime = Field(alias="startedAt")
    finished_at: datetime = Field(alias="finishedAt")

    class Config:
        populate_by_name = True


class WorkflowExecutionRequest(BaseModel):
    request_id: Optional[str] = Field(default=None, alias="requestId")
    input: Optional[str] = None
    context: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        populate_by_name = True


def _agent_node(node_id: str, name: str, description: str, handler: str, subtitle: str) -> WorkflowNodeModel:
    return WorkflowNodeModel(
        id=node_id,
        type="agentTask",
        name=name,
        description=description,
        ui={
            "componentType": "agentCard",
            "props": {
                "subtitle": subtitle,
            },
        },
        behavior={
            "kind": "llm-agent",
            "handler": handler,
        },
    )


def _workflow_edges(sequence: List[str]) -> List[WorkflowEdgeModel]:
    edges: List[WorkflowEdgeModel] = []
    for idx in range(len(sequence) - 1):
        source = sequence[idx]
        target = sequence[idx + 1]
        edges.append(
            WorkflowEdgeModel(
                id=f"edge-{source}-{target}",
                source=source,
                target=target,
                label="handoff",
            )
        )
    return edges


def _build_checklist_workflow() -> WorkflowCatalogItem:
    nodes = [
        _agent_node(
            "supervisor",
            "Supervisor Agent",
            "Routes checklist requests and tracks progress.",
            "maf.supervisor",
            "Coordinator",
        ),
        _agent_node(
            "extraction",
            "PDF Extraction Agent",
            "Runs Azure Document Intelligence to structure evidence.",
            "maf.rag.extraction",
            "Document AI",
        ),
        _agent_node(
            "ingestion",
            "RAG Ingestion Agent",
            "Chunks, embeds, and indexes extracted text.",
            "maf.rag.ingestion",
            "Vector DB",
        ),
        _agent_node(
            "checklist",
            "Checklist Answering Agent",
            "Fills controls checklist with citations.",
            "maf.checklist.processor",
            "LLM Reasoner",
        ),
    ]
    definition = WorkflowDefinitionModel(
        id="maf-checklist-supervisor",
        title="Checklist Supervisor Flow",
        domain="Audit",
        intent="Checklist orchestration",
        nodes=nodes,
        edges=_workflow_edges([node.id for node in nodes]),
    )
    return WorkflowCatalogItem(
        id="checklist-supervisor",
        title="Checklist Supervisor Flow",
        description="Multi-agent flow that supervises extraction, ingestion, and checklist answering.",
        category="Checklist Automation",
        tags=["checklist", "multi-agent", "supervisor"],
        source="devui",
        definition=definition,
    )


def _build_parallel_review_workflow() -> WorkflowCatalogItem:
    nodes = [
        _agent_node(
            "ingest",
            "Evidence Ingestion",
            "Validates uploaded evidence against taxonomy.",
            "maf.evidence.ingest",
            "Evidence",
        ),
        _agent_node(
            "analysis",
            "Risk Analysis Agent",
            "Generates inherent/residual risk commentary.",
            "maf.risk.analysis",
            "Risk",
        ),
        _agent_node(
            "decision",
            "Decision Gate",
            "Summarizes blockers and next actions.",
            "maf.decision.gate",
            "Review",
        ),
    ]
    definition = WorkflowDefinitionModel(
        id="maf-risk-review",
        title="Risk Review Flow",
        domain="Enterprise Risk",
        intent="Narrative alignment",
        nodes=nodes,
        edges=_workflow_edges([node.id for node in nodes]),
    )
    return WorkflowCatalogItem(
        id="risk-review",
        title="Risk Review Flow",
        description="Lightweight review flow that ingests evidence, analyzes risk, and captures a decision gate.",
        category="Risk",
        tags=["risk", "review"],
        source="preset",
        definition=definition,
    )


def _build_checklist_chain_workflow() -> WorkflowCatalogItem:
    nodes = [
        _agent_node(
            "supervisor",
            "Supervisor Agent",
            "Coordinates rag extraction/ingestion/checklist fills (sequential builder).",
            "maf.supervisor.chain",
            "Coordinator",
        ),
        _agent_node(
            "extraction",
            "Extraction Agent",
            "Runs PDF extraction with checkpointing enabled.",
            "maf.rag.extraction.chain",
            "Document AI",
        ),
        _agent_node(
            "ingestion",
            "Ingestion Agent",
            "Ingests extracted chunks into search index.",
            "maf.rag.ingestion.chain",
            "Vector DB",
        ),
        _agent_node(
            "checklist",
            "Checklist Agent",
            "Answers checklist sequentially with supervisor oversight.",
            "maf.checklist.chain",
            "LLM Reasoner",
        ),
    ]
    definition = WorkflowDefinitionModel(
        id="maf-checklist-chain",
        title="Checklist Sequential Builder",
        domain="Audit",
        intent="Checklist sequential workflow",
        nodes=nodes,
        edges=_workflow_edges([node.id for node in nodes]),
    )
    return WorkflowCatalogItem(
        id="checklist-chain-devui",
        title="Checklist Sequential Builder",
        description="Matches build_checklist_workflow_new() from the Dev UI sequential workflow builder.",
        category="Checklist Automation",
        tags=["checklist", "devui"],
        source="devui",
        definition=definition,
    )


def _build_supervisor_agent() -> WorkflowCatalogItem:
    node = _agent_node(
        "supervisor-agent",
        "Supervisor Agent (Standalone)",
        "Single-agent coordinator exposed via run_supervisor_agent().",
        "maf.supervisor.agent",
        "Orchestrator",
    )
    definition = WorkflowDefinitionModel(
        id="maf-supervisor-agent",
        title="Supervisor Agent",
        domain="Audit",
        intent="Agent orchestration",
        nodes=[node],
        edges=[],
    )
    return WorkflowCatalogItem(
        id="supervisor-agent",
        title="Supervisor Agent (Dev UI)",
        description="Standalone supervisor agent mirroring run_supervisor_agent() in the Dev UI.",
        category="Agents",
        tags=["devui", "agent"],
        source="devui",
        definition=definition,
    )


def _build_mcp_supervisor_agent() -> WorkflowCatalogItem:
    node = _agent_node(
        "mcp-supervisor",
        "MCP Supervisor Agent",
        "Oversees MCP Swagger server + client agents (mcp_supervisor_agent()).",
        "maf.mcp.supervisor",
        "MCP",
    )
    definition = WorkflowDefinitionModel(
        id="maf-mcp-supervisor",
        title="MCP Supervisor Agent",
        domain="Platform",
        intent="MCP orchestration",
        nodes=[node],
        edges=[],
    )
    return WorkflowCatalogItem(
        id="mcp-supervisor-agent",
        title="MCP Supervisor Agent",
        description="Represents mcp_supervisor_agent() from Dev UI coordinating server/client MCP agents.",
        category="Agents",
        tags=["devui", "mcp"],
        source="devui",
        definition=definition,
    )


CATALOG: Dict[str, WorkflowCatalogItem] = {
    item.id: item
    for item in [
        _build_checklist_workflow(),
        _build_parallel_review_workflow(),
        _build_checklist_chain_workflow(),
        _build_supervisor_agent(),
        _build_mcp_supervisor_agent(),
    ]
}

AGENTS_BY_HANDLER: Dict[str, AgentCatalogItem] = {
    agent.handler: agent for agent in AGENT_CATALOG.values()
}


def list_workflows() -> List[WorkflowCatalogItem]:
    return list(CATALOG.values())


def get_workflow(workflow_id: str) -> WorkflowCatalogItem:
    try:
        return CATALOG[workflow_id]
    except KeyError as exc:
        raise KeyError(f"Workflow '{workflow_id}' not found") from exc


def execute_workflow(workflow_id: str, payload: WorkflowExecutionRequest) -> WorkflowExecutionResponse:
    item = get_workflow(workflow_id)
    request_id = payload.request_id or f"req-{uuid4()}"
    started = datetime.utcnow()
    steps: List[WorkflowExecutionStep] = []
    context_summary = payload.context or {}
    for node in item.definition.nodes:
        node_start = datetime.utcnow()
        handler = None
        if isinstance(node.behavior, dict):
            handler = node.behavior.get("handler")
        agent = AGENTS_BY_HANDLER.get(handler or "")
        agent_name = agent.name if agent else node.name
        output = (
            f"{agent_name} would process input '{(payload.input or 'default request')[:120]}' "
            f"with context keys {list(context_summary.keys()) or ['none']}."
        )
        steps.append(
            WorkflowExecutionStep(
                nodeId=node.id,
                name=node.name,
                handler=handler,
                agentId=agent.id if agent else None,
                agentName=agent.name if agent else None,
                status="success",
                output=output,
                startedAt=node_start,
                finishedAt=datetime.utcnow(),
            )
        )
    finished = datetime.utcnow()
    return WorkflowExecutionResponse(
        workflowId=item.definition.id,
        requestId=request_id,
        status="success",
        steps=steps,
        startedAt=started,
        finishedAt=finished,
    )
