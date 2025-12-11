from agent_framework import AIFunction

from mcp_swagger.routers import McpSwaggerAPI

# Create MCP server from OpenAPI URL
CreateMCPFromURLAITool = AIFunction(
    func=McpSwaggerAPI.create_mcp_from_url,
    name="CreateMCPFromURL",
    description="Create an MCP server from an OpenAPI specification URL.Returns server information including server_id, mcp_url, and server details.",
)

# Create MCP server from OpenAPI file
CreateMCPFromFileAITool = AIFunction(
    func=McpSwaggerAPI.create_mcp_from_file,
    name="CreateMCPFromFile",
    description="Create an MCP server from an OpenAPI file. Returns server information including server_id, mcp_url, and server details.",
)

# List all running MCP servers
ListMCPServersAITool = AIFunction(
    func=McpSwaggerAPI.list_mcp_servers,
    name="ListMCPServers",
    description="List all currently running MCP servers. Returns a list of all servers with their details including server_id, server_name, mcp_url, port, status, and other metadata.",
)

# Stop a running MCP server
StopMCPServerAITool = AIFunction(
    func=McpSwaggerAPI.stop_mcp_server,
    name="StopMCPServer",
    description=(
        "Stop a running MCP server by its server_id. "
        "Terminates the server process and removes it from the registry. "
        "Returns detailed status including server name, PID, and port. "
        "If the server is already stopped or the process doesn't exist, it will still be removed from the registry. "
        "If stopping fails, the error message will include the server ID, PID, port, and specific failure reason."
    ),
)



