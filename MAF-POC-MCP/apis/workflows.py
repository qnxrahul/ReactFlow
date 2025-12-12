from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import StreamingResponse

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


@router.post("/catalog/{workflow_id}/events")
async def stream_catalog_workflow(workflow_id: str, payload: WorkflowExecutionRequest):
    async def event_generator():
        queue: asyncio.Queue = asyncio.Queue()

        async def on_step(step):
            await queue.put(step)

        async def runner():
            try:
                await execute_workflow(workflow_id, payload, event_callback=on_step)
                await queue.put(None)
            except Exception as exc:
                await queue.put(exc)

        task = asyncio.create_task(runner())
        try:
            while True:
                item = await queue.get()
                if item is None:
                    yield "event:complete\ndata={}\n\n".encode("utf-8")
                    break
                if isinstance(item, Exception):
                    yield f"event:error\ndata={json.dumps({'message': str(item)})}\n\n".encode("utf-8")
                    break
                yield f"data:{json.dumps(item.model_dump(by_alias=True))}\n\n".encode("utf-8")
        finally:
            task.cancel()

    return StreamingResponse(event_generator(), media_type="text/event-stream")
