from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Literal, Optional
from uuid import uuid4

from pydantic import BaseModel, Field


class WorkflowNodeUI(BaseModel):
    component_type: str = Field(alias="componentType")
    props: Dict[str, object] = Field(default_factory=dict)

    class Config:
        populate_by_name = True


class WorkflowNodeBehavior(BaseModel):
    kind: Literal["llm-agent", "service", "human-task"] = Field(default="llm-agent")
    handler: str
    prompt_template_id: Optional[str] = Field(default=None, alias="promptTemplateId")
    tools: List[str] = Field(default_factory=list)

    class Config:
        populate_by_name = True


class WorkflowNode(BaseModel):
    id: str = Field(default_factory=lambda: f"node-{uuid4()}")
    type: str
    name: str
    description: Optional[str] = None
    ui: WorkflowNodeUI
    behavior: WorkflowNodeBehavior
    inputs: List[str] = Field(default_factory=list)
    outputs: List[str] = Field(default_factory=list)


class WorkflowEdge(BaseModel):
    id: str = Field(default_factory=lambda: f"edge-{uuid4()}")
    source: str
    target: str
    label: Optional[str] = None
    condition: Optional[str] = None


class WorkflowDefinition(BaseModel):
    id: str = Field(default_factory=lambda: f"workflow-{uuid4()}")
    title: str
    domain: str
    intent: Optional[str] = None
    source: Literal["template", "generated", "uploaded"] = "generated"
    nodes: List[WorkflowNode]
    edges: List[WorkflowEdge]
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")
    updated_at: datetime = Field(default_factory=datetime.utcnow, alias="updatedAt")

    class Config:
        populate_by_name = True


class WorkflowGenerateRequest(BaseModel):
    domain: str
    intent: str
    description: Optional[str] = None
    preferred_handlers: List[str] = Field(default_factory=list, alias="preferredHandlers")


class WorkflowRunNodeResponse(BaseModel):
    status: Literal["success", "running", "error"]
    output: str
    last_run_at: datetime = Field(default_factory=datetime.utcnow, alias="lastRunAt")

    class Config:
        populate_by_name = True


class ComponentDefinition(BaseModel):
    id: str = Field(default_factory=lambda: f"cmp-{uuid4()}")
    type: str
    label: str
    base_renderer: Literal["agentCard", "evidenceCard", "decisionCard", "reportCard"] = Field(alias="baseRenderer")
    description: Optional[str] = None
    category: Optional[str] = None
    default_props: Dict[str, object] = Field(default_factory=dict, alias="defaultProps")

    class Config:
        populate_by_name = True


class ComponentDefinitionRequest(BaseModel):
    type: str
    label: str
    base_renderer: Literal["agentCard", "evidenceCard", "decisionCard", "reportCard"] = Field(alias="baseRenderer")
    description: Optional[str] = None
    category: Optional[str] = None
    default_props: Dict[str, object] = Field(default_factory=dict, alias="defaultProps")

    class Config:
        populate_by_name = True


class HandlerDefinition(BaseModel):
    id: str = Field(default_factory=lambda: f"hnd-{uuid4()}")
    handler: str
    kind: Literal["llm-agent", "service", "human-task"]
    description: Optional[str] = None
    default_prompt: Optional[str] = Field(default=None, alias="defaultPrompt")

    class Config:
        populate_by_name = True


class HandlerDefinitionRequest(BaseModel):
    handler: str
    kind: Literal["llm-agent", "service", "human-task"]
    description: Optional[str] = None
    default_prompt: Optional[str] = Field(default=None, alias="defaultPrompt")

    class Config:
        populate_by_name = True


class ComponentRegistryResponse(BaseModel):
    components: List[ComponentDefinition]
    handlers: List[HandlerDefinition]


class AgentDefinition(BaseModel):
    id: str = Field(default_factory=lambda: f"agent-{uuid4()}")
    name: str
    handler: str
    description: Optional[str] = None
    domains: List[str] = Field(default_factory=list)
    intent_tags: List[str] = Field(default_factory=list, alias="intentTags")
    mcp_tool: str = Field(alias="mcpTool")
    mcp_server: Optional[str] = Field(default=None, alias="mcpServer")
    default_params: Dict[str, object] = Field(default_factory=dict, alias="defaultParams")

    class Config:
        populate_by_name = True


class AgentDefinitionRequest(BaseModel):
    name: str
    handler: str
    description: Optional[str] = None
    domains: List[str] = Field(default_factory=list)
    intent_tags: List[str] = Field(default_factory=list, alias="intentTags")
    mcp_tool: str = Field(alias="mcpTool")
    mcp_server: Optional[str] = Field(default=None, alias="mcpServer")
    default_params: Dict[str, object] = Field(default_factory=dict, alias="defaultParams")

    class Config:
        populate_by_name = True


class AgentListResponse(BaseModel):
    agents: List[AgentDefinition]


class AgentRunRequest(BaseModel):
    input: Optional[str] = None
    context: Dict[str, object] = Field(default_factory=dict)


class AgentRunResponse(BaseModel):
    status: Literal["success", "error", "running"] = "success"
    output: str
    logs: Optional[List[str]] = None