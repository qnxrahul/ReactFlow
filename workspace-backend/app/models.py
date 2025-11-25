from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional, TypedDict
from uuid import uuid4

from pydantic import BaseModel, Field


class Position(BaseModel):
    x: float
    y: float


class WorkspaceLane(BaseModel):
    id: str
    title: str
    files: List[str] = Field(default_factory=list)


class WorkspaceFile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    url: str
    size: int
    content_type: Optional[str] = None
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)


class WorkflowState(BaseModel):
    current_step: str = Field(default="workspace", alias="currentStep")
    last_file_name: Optional[str] = Field(default=None, alias="lastFileName")
    mapping_saved_at: Optional[datetime] = Field(default=None, alias="mappingSavedAt")
    workpaper_saved_at: Optional[datetime] = Field(default=None, alias="workpaperSavedAt")
    detail_saved_at: Optional[datetime] = Field(default=None, alias="detailSavedAt")

    class Config:
        populate_by_name = True


class Workspace(BaseModel):
    id: str
    title: str
    template: Optional[str] = None
    meta: Optional[str] = None
    color: Optional[str] = None
    position: Optional[Position] = None
    lanes: List[WorkspaceLane] = Field(default_factory=list)
    tasks_count: Optional[int] = Field(default=None, alias="tasksCount")
    files_count: Optional[int] = Field(default=None, alias="filesCount")
    files: List[WorkspaceFile] = Field(default_factory=list)
    workflow: WorkflowState = Field(default_factory=WorkflowState)
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")
    updated_at: datetime = Field(default_factory=datetime.utcnow, alias="updatedAt")

    class Config:
        populate_by_name = True


class WorkspaceCreateRequest(BaseModel):
    title: str = Field(default="Workspace Board", min_length=1, max_length=200)
    template: Optional[str] = None
    meta: Optional[str] = None
    color: Optional[str] = None
    position: Optional[Position] = None
    lanes: List[WorkspaceLane] = Field(default_factory=list)
    tasks_count: Optional[int] = Field(default=None, alias="tasksCount")
    files_count: Optional[int] = Field(default=None, alias="filesCount")
    workflow: Optional[WorkflowState] = None


class WorkspaceUpdateRequest(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    template: Optional[str] = None
    meta: Optional[str] = None
    color: Optional[str] = None
    position: Optional[Position] = None
    lanes: Optional[List[WorkspaceLane]] = None
    tasks_count: Optional[int] = Field(default=None, alias="tasksCount")
    files_count: Optional[int] = Field(default=None, alias="filesCount")
    workflow: Optional[WorkflowState] = None


class WorkflowStepRequest(BaseModel):
    step: Literal["mapping", "workpaper", "workpaper-detail"]
    file_name: Optional[str] = Field(default=None, alias="fileName")


class WorkspaceListResponse(BaseModel):
    items: List[Workspace]


class FileUploadMetadata(TypedDict):
    blob_url: str
    blob_name: str
    size: int
    content_type: Optional[str]


class FileUploadResponse(BaseModel):
    workspace_id: str = Field(alias="workspaceId")
    file: WorkspaceFile

    class Config:
        populate_by_name = True
