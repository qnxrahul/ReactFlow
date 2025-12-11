import logging
from mcp_swagger.agent import run_mcp_swagger_client_agent
from agent_framework_devui import serve


if __name__ == "__main__":
    serve(
        entities=[
            run_mcp_swagger_client_agent()  # Call the function to get the agent instance
        ], 
        port=8088, 
        auto_open=True,
        ui_enabled=True
    )
