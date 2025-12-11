from agent_framework.azure import AzureOpenAIAssistantsClient
from agent_framework import ChatAgent, MCPStreamableHTTPTool, HostedMCPTool
from mcp_swagger.tool_registry import (
    CreateMCPFromURLAITool, CreateMCPFromFileAITool, ListMCPServersAITool, StopMCPServerAITool  
)
from config import MCP_SERVER_URL, BEARER_TOKEN


def run_mcp_swagger_server_agent() -> ChatAgent:

    openai_client = AzureOpenAIAssistantsClient(
        endpoint="https://kpmgchatgptpoc.openai.azure.com/",
        api_key="caf461635bc647d5907697642ff27d26",
        api_version="2024-08-01-preview",
        deployment_name="gpt-4o-2"
    )
    mcp_swagger_agent = openai_client.create_agent(
        name="MCP Swagger Server Agent",
        instructions=(
            "You are an MCP Swagger Agent. Your task is to:"
            "\n1. Use the MCP Swagger API to create a MCP server from the provided OpenAPI specification."
            "\nThe OpenAPI specification will be provided in the tool arguments."
        ),
        tools=[CreateMCPFromURLAITool, CreateMCPFromFileAITool, ListMCPServersAITool, StopMCPServerAITool],
    )
    
    return mcp_swagger_agent

def run_mcp_swagger_client_agent(
) -> ChatAgent:
    """
    Create a client agent that connects to an existing MCP server.
    """
    
    auth_headers = {
        "Authorization": f"{BEARER_TOKEN}"
    }
    mcp_tool = MCPStreamableHTTPTool(
        name="MCP_API_Tools",
        description=(
            "MCP server tools that provide access to API endpoints. "
            "When you use these tools, you can perform operations like creating users, "
            "fetching data, updating records, etc. "
            "Always check what tools are available first, then use the appropriate tool "
            "with the required parameters. If an operation fails, the tool will return "
            "an error message - always report the full error message to the user."
        ),
        url=MCP_SERVER_URL,
        headers=auth_headers,  # Authentication headers
    )
    openai_client = AzureOpenAIAssistantsClient(
        endpoint="https://kpmgchatgptpoc.openai.azure.com/",
        api_key="caf461635bc647d5907697642ff27d26",
        api_version="2024-08-01-preview",
        deployment_name="gpt-4o-2"
    )
    mcp_swagger_client_agent = openai_client.create_agent(
            name="MCP Swagger Client Agent",
            instructions=(
                "You are an MCP Swagger Client Agent that interacts with API endpoints through MCP tools.\n\n"
                "IMPORTANT GUIDELINES:\n"
                "1. When a user asks you to perform an operation (like creating a user, fetching data, etc.), "
                "you MUST use the available MCP tools to accomplish the task.\n"
                "2. First, explore what tools are available by checking the MCP_API_Tools.\n"
                "3. Use the appropriate tool with the correct parameters based on the user's request.\n"
                "4. If a tool call fails or returns an error:\n"
                "   - ALWAYS report the FULL error message to the user\n"
                "   - Include any error details, status codes, or messages returned by the tool\n"
                "   - Do NOT say 'error message doesn't provide specific details' - always show what was returned\n"
                "   - Help the user understand what went wrong and suggest fixes\n"
                "5. If you're unsure about required parameters, check the tool schema first.\n"
                "6. Always confirm successful operations and show the results to the user.\n\n"
                "When reporting errors, format them clearly:\n"
                "- Error type: [the error type]\n"
                "- Error message: [the full error message]\n"
                "- Status code: [if available]\n"
                "- Details: [any additional details]\n\n"
                "Be proactive and helpful - use the tools to accomplish user requests!"
            ),
            tools=[mcp_tool]
        )
    return mcp_swagger_client_agent


def mcp_supervisor_agent() -> ChatAgent:
    server_agent = run_mcp_swagger_server_agent()
    client_agent = run_mcp_swagger_client_agent()
    openai_client = AzureOpenAIAssistantsClient(
        endpoint="https://kpmgchatgptpoc.openai.azure.com/",
        api_key="caf461635bc647d5907697642ff27d26",
        api_version="2024-08-01-preview",
        deployment_name="gpt-4o-2"
    )
    supervisor_agent = openai_client.create_agent(
        name="MCP Supervisor Agent",
        instructions=(
            "You are an MCP Supervisor Agent. Your task is to oversee the operations of MCP Swagger Server Agents and "
            "MCP Swagger Client Agents. You will coordinate their activities, ensure they follow protocols, and "
            "assist them in resolving complex issues that arise during their interactions with MCP servers."
        ),
        tools=[server_agent.as_tool(), client_agent.as_tool()],
    )
    return supervisor_agent