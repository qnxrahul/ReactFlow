from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status

from registry.workflow_catalog import (
    WorkflowExecutionRequest,
    execute_workflow,
    filter_workflows,
    get_workflow,
    list_workflows,
)

router = APIRouter(prefix="/workflows", tags=["workflows"])


@router.get("/catalog")
def list_catalog(
    domain: str | None = Query(default=None),
    intent: str | None = Query(default=None),
    query: str | None = Query(default=None),
):
    workflows = filter_workflows(list_workflows(), domain=domain, intent=intent, query=query)
    payload = [item.model_dump(by_alias=True) for item in workflows]
    return {"workflows": payload}


@router.get("/catalog/{workflow_id}")
def get_catalog_item(workflow_id: str):
    try:
        workflow = get_workflow(workflow_id)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return workflow.model_dump(by_alias=True)


@router.post("/catalog/{workflow_id}/execute")
async def execute_catalog_workflow(workflow_id: str, payload: WorkflowExecutionRequest):
    try:
        result = await execute_workflow(workflow_id, payload)
    except KeyError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return result.model_dump(by_alias=True)
