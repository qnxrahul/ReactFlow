from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from ..dependencies import get_blob_service, get_workspace_repository
from ..models import FileUploadResponse, Workspace, WorkspaceCreateRequest, WorkspaceListResponse, WorkspaceUpdateRequest, WorkspaceFile, WorkflowStepRequest
from ..services.blob_storage import BlobStorageService
from ..services.workspace_repository import WorkspaceRepository

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


@router.get("/", response_model=WorkspaceListResponse)
def list_workspaces(repo: WorkspaceRepository = Depends(get_workspace_repository)) -> WorkspaceListResponse:
    items = repo.list_workspaces()
    return WorkspaceListResponse(items=items)


@router.get("/{workspace_id}", response_model=Workspace)
def get_workspace(workspace_id: str, repo: WorkspaceRepository = Depends(get_workspace_repository)) -> Workspace:
    try:
        return repo.get_workspace(workspace_id)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")


@router.post("/", response_model=Workspace, status_code=status.HTTP_201_CREATED)
def create_workspace(payload: WorkspaceCreateRequest, repo: WorkspaceRepository = Depends(get_workspace_repository)) -> Workspace:
    return repo.create_workspace(payload)


@router.patch("/{workspace_id}", response_model=Workspace)
def update_workspace(
    workspace_id: str,
    payload: WorkspaceUpdateRequest,
    repo: WorkspaceRepository = Depends(get_workspace_repository),
) -> Workspace:
    try:
        return repo.update_workspace(workspace_id, payload)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")


@router.post("/{workspace_id}/files", response_model=FileUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_workspace_file(
    workspace_id: str,
    file: UploadFile = File(...),
    repo: WorkspaceRepository = Depends(get_workspace_repository),
    blob_service: BlobStorageService = Depends(get_blob_service),
) -> FileUploadResponse:
    try:
        workspace = repo.get_workspace(workspace_id)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")

    meta = blob_service.upload(workspace_id, file.filename, data, file.content_type)
    workspace_file = WorkspaceFile(
        name=file.filename,
        url=meta["blob_url"],
        size=meta["size"],
        content_type=meta["content_type"],
    )

    updated = repo.append_file(workspace_id, workspace_file)
    return FileUploadResponse(workspaceId=workspace_id, file=workspace_file)


@router.post("/{workspace_id}/workflow", response_model=Workspace)
def record_workflow_step(
    workspace_id: str,
    payload: WorkflowStepRequest,
    repo: WorkspaceRepository = Depends(get_workspace_repository),
) -> Workspace:
    try:
        return repo.record_workflow_step(workspace_id, payload)
    except KeyError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
