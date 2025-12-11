from mcp_swagger.agent import run_mcp_swagger_server_agent
from agent_framework_devui import serve

if __name__ == "__main__":
    serve(
        entities=[
            run_mcp_swagger_server_agent()  # Call the function to get the agent instance
        ], 
        port=8082, 
        auto_open=True,
        ui_enabled=True
    )
