
import asyncio
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from models.checklist_request import ChecklistRequest
from models.tool_call_dto import ChecklistProcessingToolCallDto
import logging
from logger import get_logger
from agents.main_agent import run_main_agent
from agents.workflow_initiation_agent import build_checklist_workflow
from tools.checklist_process import ChecklistProcessor

logger = get_logger(__name__)

router = APIRouter(prefix="/checklist", tags=["checklist"])

@router.get("/")
def read_root():
    return {"message": "Microsoft Agent Framework POC API is running."}

@router.post("/load-checklist")
async def load_checklist(body: ChecklistProcessingToolCallDto):
    validated_data = body.model_dump()
    logger.info(f"Validated ChecklistRequest: {validated_data}")
    return await ChecklistProcessor.process_checklist_in_parallel(**validated_data)

@router.post("/answer-checklist")
async def answer_checklist(body: ChecklistRequest):
    validated_data = body.model_dump()
    logger.info(f"Validated ChecklistRequest: {validated_data}")
    # Pass the checklist request as a string prompt to the AI-powered main agent
    result_text = await run_main_agent(validated_data)
    return JSONResponse(content={"result": result_text})
# You can add more endpoints here for agent invocation


@router.post("/initiate-workflow")
async def initiate_workflow(payload: ChecklistRequest):
    # Placeholder for workflow initiation logic
    response = await build_checklist_workflow(payload)
    logging.info(f"Workflow initiated with context: {payload.model_dump()}")
    return response
