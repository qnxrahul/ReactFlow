from main import app
from agent_framework.devui import serve


from agents.extraction_agent import run_rag_extraction_agent
from agents.ingestion_agent import run_rag_ingestion_agent
from agents.checklist_agent import run_checklist_loading_agent
from agents.supervisor_agent import run_supervisor_agent
from mcp_swagger.agent import run_mcp_swagger_server_agent, run_mcp_swagger_client_agent, mcp_supervisor_agent
from agents.workflow_initiation_agent import build_checklist_workflow,build_checklist_workflow_new,build_checklist_sequential_workflow
from agents.sample import run_parallel_agents
def run_dev_ui():
    serve(
        entities=[
            # build_checklist_workflow_new(),
            # build_checklist_sequential_workflow(),
            build_checklist_workflow(),
            # run_checklist_loading_agent(),
            # run_rag_extraction_agent(),
            # run_rag_ingestion_agent(),
            run_supervisor_agent(),
            # run_parallel_agents(),
            # run_mcp_swagger_server_agent(),
            # run_mcp_swagger_client_agent(),
            mcp_supervisor_agent()
        ], 
        port=8002, 
        auto_open=True,
        ui_enabled=True
    )

def run_ag_ui(): 
    from agent_framework.ag_ui import add_agent_framework_fastapi_endpoint
    from agents.main_agent import get_main_agent
    import uvicorn
    add_agent_framework_fastapi_endpoint(app, get_main_agent(None), "/")
    uvicorn.run(app, host="127.0.0.1", port=8888)
    

if __name__ == "__main__":
    run_dev_ui()