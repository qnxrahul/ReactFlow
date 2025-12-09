from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from ..dependencies import get_workflow_repository
from ..models_workflow import WorkflowDefinition, WorkflowGenerateRequest, WorkflowRunNodeResponse
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
) -> WorkflowDefinition:
    workflow = WorkflowAuthoringService.generate(payload)
    repo.save(workflow)
    return _normalize(workflow)


@router.post("/{workflow_id}/nodes/{node_id}/run", response_model=WorkflowRunNodeResponse)
def run_workflow_node(
    workflow_id: str,
    node_id: str,
    repo: WorkflowRepository = Depends(get_workflow_repository),
) -> WorkflowRunNodeResponse:
    try:
        workflow = repo.get(workflow_id)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workflow not found") from exc

    node_exists = any(node.id == node_id for node in workflow.nodes)
    if not node_exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Node not found")

    # Simulate an agent response for local development
    output = f"Node {node_id} completed for workflow {workflow_id}."
    return WorkflowRunNodeResponse(status="success", output=output)
