
import asyncio
from agent_framework_devui import serve
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from models.checklist_request import ChecklistRequest
from models.simple_context import RequestContext

from models.tool_call_dto import ChecklistProcessingToolCallDto, PdfExtractionToolCallDto
from service.config_service import ConfigService
import logging
from logger import get_logger
from agent_framework.devui import DevServer
from agent_framework import WorkflowAgent

from tools.checklist_process import ChecklistProcessor
from apis import checklist_router, ui_config_router, workflows_router

logger = get_logger(__name__)
app = FastAPI(title="Microsoft Agent Framework POC API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],              # URLs allowed
    allow_credentials=True,
    allow_methods=["*"],                # GET, POST, PUT, DELETE, OPTIONS...
    allow_headers=["*"],                # Authorization, Content-Type...
)
app.include_router(checklist_router)
app.include_router(ui_config_router)
app.include_router(workflows_router)

def run_api():
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)


    
def agent_protocol_endpoint():
    from agent_framework.ag_ui import add_agent_framework_fastapi_endpoint
    from agent_framework.ag_ui import AgentFrameworkAgent
    
    # AgentFrameworkAgent(
    #     name="MainAgent",
    #     agent="",
    #     confirmation_strategy="auto",
    #     description="Main Agent for handling checklist requests"
    #     orchestrators=[],
    #     require_confirmation=False,
        
    # )

if __name__ == "__main__":
    run_api()