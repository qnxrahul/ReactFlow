from typing import Optional
from pathlib import Path

from mcp_swagger.schemas import MCPServerResponse
from mcp_swagger.schemas import CreateMCPFromURLRequest
from mcp_swagger.schemas import ListServersResponse
from mcp_swagger.schemas import ServerInfo

from mcp_swagger.services import McpServerservice
from mcp_swagger.services import ServerRegistry
from config import BEARER_TOKEN

class McpSwaggerAPI:
    @staticmethod
    def create_mcp_from_url(
        openapi_url: str,
        base_url: str,
        bearer_token: Optional[str] = BEARER_TOKEN,
        server_name: Optional[str] = None
    ) -> dict:
        """
        Returns:
            Dictionary with server details (JSON serializable)
            
        Raises:
            Exception: If server creation fails
        """
        request = CreateMCPFromURLRequest(
            openapi_url=openapi_url,
            base_url=base_url,
            bearer_token=bearer_token,
            server_name=server_name
        )
        
        mcp_server_service = McpServerservice()
        mcp_inst = mcp_server_service.create_mcp_server(request=request)
        
        # Convert Pydantic model to dict for JSON serialization
        return mcp_inst.model_dump() if hasattr(mcp_inst, 'model_dump') else mcp_inst.dict()


    @staticmethod
    def create_mcp_from_file(
    file_path: str,
    base_url: str,
    bearer_token: Optional[str] = BEARER_TOKEN,
    server_name: Optional[str] = None
    ) -> dict:
        """
        Create MCP server from OpenAPI file
        
        Args:
            file_path: Path to the OpenAPI file (JSON, YAML, or YML)
            base_url: Base URL for the API
            bearer_token: Optional bearer token for authentication
            server_name: Optional name for the server
            
        Returns:
            Dictionary with server details (JSON serializable)
            
        Raises:
            ValueError: If file format is invalid
            FileNotFoundError: If file doesn't exist
            Exception: If server creation fails
        """
        file_path_obj = Path(file_path)
        
        if not file_path_obj.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        if not file_path_obj.suffix.lower() in ['.json', '.yaml', '.yml']:
            raise ValueError("File must be a JSON or YAML file (.json, .yaml, .yml)")
        
        server = McpServerservice()
        
        result = server.create_mcp_from_file_path(
            file_path=str(file_path_obj),
            server_name=server_name,
            base_url=base_url,
            bearer_token=bearer_token
        )
        
        # Convert Pydantic model to dict for JSON serialization
        return result.model_dump() if hasattr(result, 'model_dump') else result.dict()


    @staticmethod
    def list_mcp_servers() -> dict:
        """
        List all running MCP servers
        
        Returns:
            Dictionary with list of server information (JSON serializable)
            
        Raises:
            Exception: If listing fails
        """
        server_registry = ServerRegistry()
        
        servers = [ServerInfo(**server) for server in server_registry.server_registry["servers"]]
        
        response = ListServersResponse(
            status="success",
            servers=servers
        )
        
        # Convert Pydantic model to dict for JSON serialization
        return response.model_dump() if hasattr(response, 'model_dump') else response.dict()


    @staticmethod
    def stop_mcp_server(server_id: str) -> dict:
        """
        Stop a running MCP server
        
        Args:
            server_id: ID of the server to stop
            
        Returns:
            Dictionary with status and message
            
        Raises:
            ValueError: If server not found
            Exception: If stopping fails
        """
        mcp_server = McpServerservice()
        return mcp_server.stop_mcp_server(server_id=server_id)


    @staticmethod
    def get_server_info() -> dict:
        """
        Get health check and basic info about the server manager
        
        Returns:
            Dictionary with service information
        """
        server_registry = ServerRegistry()
        return {
            "status": "running",
            "service": "OpenAPI MCP Server Manager",
            "version": "1.0.0",
            "active_servers": len(server_registry.server_registry["servers"]),
            "transport": "http (streamable)"
        }