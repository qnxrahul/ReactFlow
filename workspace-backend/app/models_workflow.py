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


class WorkflowRunNodeResponse(BaseModel):
    status: Literal["success", "running", "error"]
    output: str
    last_run_at: datetime = Field(default_factory=datetime.utcnow, alias="lastRunAt")

    class Config:
        populate_by_name = True
*** End of File