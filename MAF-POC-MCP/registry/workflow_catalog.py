from __future__ import annotations

import asyncio
import json
from datetime import datetime
from typing import Any, Awaitable, Callable, Dict, List, Optional
from uuid import uuid4

from pydantic import BaseModel, Field

from .agent_catalog import CATALOG as AGENT_CATALOG, AgentCatalogItem

StepCallback = Optional[Callable[["WorkflowExecutionStep"], Awaitable[None]]]
from agents.workflow_initiation_agent import (
    build_checklist_workflow,
    build_checklist_workflow_new,
)
from agents.supervisor_agent import run_supervisor_agent
from mcp_swagger.agent import mcp_supervisor_agent

try:
    from agent_framework import InMemoryCheckpointStorage
    from agent_framework._workflows._events import AgentRunEvent, ExecutorInvokedEvent
except ImportError:  # pragma: no cover - dependency optional at import time
    InMemoryCheckpointStorage = None  # type: ignore
    AgentRunEvent = None  # type: ignore
    ExecutorInvokedEvent = None  # type: ignore


class WorkflowInputField(BaseModel):
    id: str
    label: str
    placeholder: Optional[str] = None
    required: bool = False
    helper_text: Optional[str] = Field(default=None, alias="helperText")


class WorkflowNodeModel(BaseModel):
    id: str
    type: str = "agentTask"
    name: str
    description: Optional[str] = None
    ui: Dict[str, Any] = Field(default_factory=dict)
    behavior: Dict[str, Any] = Field(default_factory=dict)
    inputs: List[str] = Field(default_factory=list)
    outputs: List[str] = Field(default_factory=list)


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
    domains: List[str] = Field(default_factory=list)
    source: str = "preset"
    inputs: List[WorkflowInputField] = Field(default_factory=list)
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


def _agent_node(
    node_id: str,
    name: str,
    description: str,
    handler: str,
    subtitle: str,
    *,
    inputs: Optional[List[str]] = None,
    outputs: Optional[List[str]] = None,
) -> WorkflowNodeModel:
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
        inputs=inputs or [],
        outputs=outputs or [],
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
            inputs=["requestId"],
        ),
        _agent_node(
            "extraction",
            "PDF Extraction Agent",
            "Runs Azure Document Intelligence to structure evidence.",
            "maf.rag.extraction",
            "Document AI",
            inputs=["documentUrl"],
        ),
        _agent_node(
            "ingestion",
            "RAG Ingestion Agent",
            "Chunks, embeds, and indexes extracted text.",
            "maf.rag.ingestion",
            "Vector DB",
            inputs=["searchIndex", "documentUrl"],
        ),
        _agent_node(
            "checklist",
            "Checklist Answering Agent",
            "Fills controls checklist with citations.",
            "maf.checklist.processor",
            "LLM Reasoner",
            inputs=["requestId"],
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
        domains=["Audit", "Checklist", "Supervisor", "MESP"],
        source="devui",
        inputs=[
            WorkflowInputField(
                id="requestId",
                label="Request ID",
                placeholder="e.g., req-12345",
                helperText="Used to correlate checklist processing across agents.",
            ),
            WorkflowInputField(
                id="documentUrl",
                label="Document URL",
                placeholder="https://storage/account/container/file.pdf",
                helperText="PDF to extract before ingestion.",
            ),
            WorkflowInputField(
                id="searchIndex",
                label="Search Index Name",
                placeholder="checklist-index",
                helperText="Target index for RAG ingestion.",
            ),
        ],
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
        domains=["Enterprise Risk", "Audit"],
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
            inputs=["requestId"],
        ),
        _agent_node(
            "extraction",
            "Extraction Agent",
            "Runs PDF extraction with checkpointing enabled.",
            "maf.rag.extraction.chain",
            "Document AI",
            inputs=["documentUrl"],
        ),
        _agent_node(
            "ingestion",
            "Ingestion Agent",
            "Ingests extracted chunks into search index.",
            "maf.rag.ingestion.chain",
            "Vector DB",
            inputs=["documentUrl", "searchIndex"],
        ),
        _agent_node(
            "checklist",
            "Checklist Agent",
            "Answers checklist sequentially with supervisor oversight.",
            "maf.checklist.chain",
            "LLM Reasoner",
            inputs=["requestId"],
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
        domains=["Audit", "Checklist", "Sequential", "MESP"],
        source="devui",
        inputs=[
            WorkflowInputField(
                id="requestId",
                label="Request ID",
                placeholder="e.g., req-12345",
                helperText="Sequential run identifier.",
            ),
            WorkflowInputField(
                id="documentUrl",
                label="Document URL",
                placeholder="https://storage/account/container/file.pdf",
            ),
            WorkflowInputField(
                id="searchIndex",
                label="Search Index Name",
                placeholder="sequential-index",
            ),
        ],
        definition=definition,
    )


def _build_supervisor_agent() -> WorkflowCatalogItem:
    node = _agent_node(
        "supervisor-agent",
        "Supervisor Agent (Standalone)",
        "Single-agent coordinator exposed via run_supervisor_agent().",
        "maf.supervisor.agent",
        "Orchestrator",
        inputs=["question"],
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
        domains=["Audit", "Supervisor", "Checklist", "MESP"],
        source="devui",
        inputs=[
            WorkflowInputField(
                id="question",
                label="Supervisor Prompt",
                placeholder="Describe the workflow decision needed",
            )
        ],
        definition=definition,
    )


def _build_mcp_supervisor_agent() -> WorkflowCatalogItem:
    node = _agent_node(
        "mcp-supervisor",
        "MCP Supervisor Agent",
        "Oversees MCP Swagger server + client agents (mcp_supervisor_agent()).",
        "maf.mcp.supervisor",
        "MCP",
        inputs=["serverName", "operation"],
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
        domains=["Platform", "MCP", "Supervisor"],
        source="devui",
        inputs=[
            WorkflowInputField(
                id="serverName",
                label="Server Name",
                placeholder="Swagger Server 1",
            ),
            WorkflowInputField(
                id="operation",
                label="Operation",
                placeholder="Describe the MCP task",
            ),
        ],
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

DEVUI_WORKFLOW_BUILDERS = {
    "checklist-supervisor": build_checklist_workflow,
    "checklist-chain-devui": build_checklist_workflow_new,
}

DEVUI_AGENT_FACTORIES = {
    "supervisor-agent": run_supervisor_agent,
    "mcp-supervisor-agent": mcp_supervisor_agent,
}

async def _emit_step(callback: StepCallback, step: "WorkflowExecutionStep") -> None:
    if callback:
        await callback(step)


def list_workflows() -> List[WorkflowCatalogItem]:
    return list(CATALOG.values())


def filter_workflows(
    workflows: List[WorkflowCatalogItem],
    *,
    domain: Optional[str] = None,
    intent: Optional[str] = None,
    query: Optional[str] = None,
) -> List[WorkflowCatalogItem]:
    domain_lower = domain.strip().lower() if domain else None
    intent_lower = intent.strip().lower() if intent else None
    query_lower = query.strip().lower() if query else None
    filters_applied = any([domain_lower, intent_lower, query_lower])

    def matches(item: WorkflowCatalogItem) -> bool:
        if domain_lower:
            domain_hit = any(domain_lower in d.lower() for d in item.domains or [])
            tag_hit = any(domain_lower in tag.lower() for tag in item.tags or [])
            if not (domain_hit or tag_hit):
                return False
        if intent_lower:
            intent_value = (item.definition.intent or "").lower()
            title_value = (item.title or "").lower()
            if intent_lower not in intent_value and intent_lower not in title_value:
                return False
        if query_lower:
            haystack = [
                item.title or "",
                item.description or "",
                " ".join(item.tags or []),
                " ".join(item.domains or []),
                item.definition.intent or "",
            ]
            if not any(query_lower in part.lower() for part in haystack):
                return False
        return True

    filtered = [item for item in workflows if matches(item)]
    if not filtered and filters_applied:
        return workflows
    return filtered


def get_workflow(workflow_id: str) -> WorkflowCatalogItem:
    try:
        return CATALOG[workflow_id]
    except KeyError as exc:
        raise KeyError(f"Workflow '{workflow_id}' not found") from exc


def _build_prompt(payload: WorkflowExecutionRequest) -> str:
    parts: List[str] = []
    if payload.input:
        parts.append(str(payload.input))
    if payload.description:
        parts.append(f"Description: {payload.description}")
    if payload.context:
        try:
            parts.append(f"Context: {json.dumps(payload.context)}")
        except Exception:
            parts.append(f"Context: {payload.context}")
        inputs = payload.context.get("inputs") if isinstance(payload.context, dict) else None  # type: ignore[arg-type]
        if inputs:
            try:
                parts.append(f"Inputs: {json.dumps(inputs)}")
            except Exception:
                parts.append(f"Inputs: {inputs}")
    if not parts:
        parts.append("Execute the workflow with default parameters.")
    return "\n".join(parts)


async def _run_devui_agent(
    agent_factory,
    payload: WorkflowExecutionRequest,
    request_id: str,
    event_callback: StepCallback = None,
) -> List[WorkflowExecutionStep]:
    if agent_factory is None:
        raise ValueError("Agent factory not provided.")
    agent = agent_factory()
    prompt = _build_prompt(payload)
    start_time = datetime.utcnow()
    running_step = WorkflowExecutionStep(
        nodeId=agent.name or "agent",
        name=agent.name or "Agent",
        handler=getattr(agent, "handler", None),
        agentId=getattr(agent, "id", None),
        agentName=agent.name or "Agent",
        status="running",
        output="",
        startedAt=start_time,
        finishedAt=start_time,
    )
    await _emit_step(event_callback, running_step)
    result = await agent.run(prompt)
    output_text = getattr(result, "text", None) or getattr(result, "output", None) or str(result)
    finished = datetime.utcnow()
    step = WorkflowExecutionStep(
        nodeId=agent.name or "agent",
        name=agent.name or "Agent",
        handler=getattr(agent, "handler", None),
        agentId=getattr(agent, "id", None),
        agentName=agent.name or "Agent",
        status="success",
        output=output_text,
        startedAt=start_time,
        finishedAt=finished,
    )
    await _emit_step(event_callback, step)
    return [step]


async def _run_devui_workflow(
    item: WorkflowCatalogItem,
    payload: WorkflowExecutionRequest,
    event_callback: StepCallback = None,
) -> List[WorkflowExecutionStep]:
    if InMemoryCheckpointStorage is None or AgentRunEvent is None:
        raise RuntimeError("agent_framework runtime is not available in this environment.")
    builder = DEVUI_WORKFLOW_BUILDERS.get(item.id)
    if not builder:
        raise ValueError(f"No Dev UI workflow builder registered for '{item.id}'.")
    workflow = builder()
    checkpoint_storage = InMemoryCheckpointStorage()
    prompt = _build_prompt(payload)
    steps: List[WorkflowExecutionStep] = []
    start_times: Dict[str, datetime] = {}
    node_by_name = {node.name: node for node in item.definition.nodes}
    handler_by_node = {}
    for node in item.definition.nodes:
        handler = None
        if isinstance(node.behavior, dict):
            handler = node.behavior.get("handler")
        handler_by_node[node.name] = handler
    async for event in workflow.run_stream(prompt, checkpoint_storage=checkpoint_storage):
        now = datetime.utcnow()
        if ExecutorInvokedEvent and isinstance(event, ExecutorInvokedEvent):
            start_times.setdefault(event.executor_id, now)
            node = node_by_name.get(event.executor_id)
            if node:
                handler = handler_by_node.get(node.name)
                agent_meta = AGENTS_BY_HANDLER.get(handler or "")
                running_step = WorkflowExecutionStep(
                    nodeId=node.id,
                    name=node.name,
                    handler=handler,
                    agentId=agent_meta.id if agent_meta else None,
                    agentName=agent_meta.name if agent_meta else node.name,
                    status="running",
                    output="",
                    startedAt=now,
                    finishedAt=now,
                )
                await _emit_step(event_callback, running_step)
            continue
        if AgentRunEvent and isinstance(event, AgentRunEvent):
            executor_id = event.executor_id
            node = node_by_name.get(executor_id)
            handler = handler_by_node.get(node.name) if node else None
            agent_meta = AGENTS_BY_HANDLER.get(handler or "")
            output = ""
            if event.data:
                output = getattr(event.data, "text", None) or getattr(event.data, "output", None) or str(event.data)
            step = WorkflowExecutionStep(
                nodeId=node.id if node else executor_id,
                name=node.name if node else executor_id,
                handler=handler,
                agentId=agent_meta.id if agent_meta else None,
                agentName=agent_meta.name if agent_meta else (node.name if node else executor_id),
                status="success",
                output=output,
                startedAt=start_times.get(executor_id, now),
                finishedAt=now,
            )
            steps.append(step)
            await _emit_step(event_callback, step)
    if not steps:
        raise RuntimeError("Workflow execution did not produce any agent events.")
    return steps


async def execute_workflow(
    workflow_id: str,
    payload: WorkflowExecutionRequest,
    *,
    event_callback: StepCallback = None,
) -> WorkflowExecutionResponse:
    item = get_workflow(workflow_id)
    request_id = payload.request_id or f"req-{uuid4()}"
    started = datetime.utcnow()
    steps: List[WorkflowExecutionStep] = []
    try:
        if item.id in DEVUI_WORKFLOW_BUILDERS:
            steps = await _run_devui_workflow(item, payload, event_callback=event_callback)
        elif item.id in DEVUI_AGENT_FACTORIES:
            steps = await _run_devui_agent(
                DEVUI_AGENT_FACTORIES[item.id], payload, request_id, event_callback=event_callback
            )
        else:
            # Fallback to mock execution for presets that do not have runtime wiring.
            context_summary = payload.context or {}
            for node in item.definition.nodes:
                node_start = datetime.utcnow()
                handler = None
                if isinstance(node.behavior, dict):
                    handler = node.behavior.get("handler")
                agent = AGENTS_BY_HANDLER.get(handler or "")
                agent_name = agent.name if agent else node.name
                output = (
                    f"{agent_name} processed input '{(payload.input or 'default request')[:120]}' "
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
                await _emit_step(event_callback, steps[-1])
    except Exception as exc:
        steps = [
            WorkflowExecutionStep(
                nodeId=item.definition.nodes[0].id if item.definition.nodes else item.id,
                name=item.definition.nodes[0].name if item.definition.nodes else item.title,
                status="error",
                output=str(exc),
                startedAt=started,
                finishedAt=datetime.utcnow(),
            )
        ]
        await _emit_step(event_callback, steps[0])
    finished = datetime.utcnow()
    return WorkflowExecutionResponse(
        workflowId=item.definition.id,
        requestId=request_id,
        status="success" if steps and all(step.status == "success" for step in steps) else "error",
        steps=steps,
        startedAt=started,
        finishedAt=finished,
    )
