import uuid
import json
import yaml
import tempfile
from datetime import datetime
from typing import Optional
from fastapi import HTTPException, UploadFile, File, Form

from mcp_swagger.utils.helper import ServerRegistry
from mcp_swagger.schemas import CreateMCPFromURLRequest, MCPServerResponse

class McpServerservice:
    def __init__(self):
        self.server_register = ServerRegistry()

    def create_mcp_server(self, request: CreateMCPFromURLRequest):
        server_id = str(uuid.uuid4())
        port = self.server_register.get_next_port()
        server_host = self.server_register.get_server_host()
        server_name = request.server_name or f"MCP-Server-{port}"

        process = self.server_register.start_mcp_process(
            openapi_source=request.openapi_url,
            base_url=request.base_url,
            server_name=server_name,
            port=port,
            bearer_token=request.bearer_token
        )

        server_info = {
            "id": server_id,
            "server_name": server_name,
            "mcp_url": f"http://{server_host}:{port}/mcp",
            "port": port,
            "pid": process.pid,
            "base_url": request.base_url,
            "openapi_source": request.openapi_url,
            "protected_endpoints": 0,
            "total_endpoints": 0,
            "has_bearer_token": bool(request.bearer_token),
            "created_at": datetime.now().isoformat(),
            "status": "running"
        }

        self.server_register.server_registry["servers"].append(server_info)

        return MCPServerResponse(
            status="success",
            server_id=server_id,
            mcp_url=server_info["mcp_url"],
            message=f"MCP server '{server_name}' created successfully on port {port}"
        )

    async def create_mcp_from_file(
        self,
        openapi_file: UploadFile = File(...),
        base_url: str = Form(...),
        bearer_token: Optional[str] = Form(None),
        server_name: Optional[str] = Form(None)
    ):
        if not openapi_file.filename.endswith(('.json', '.yaml', '.yml')):
            raise HTTPException(
                status_code=400,
                detail="File must be a JSON or YAML file (.json, .yaml, .yml)"
            )

        content = await openapi_file.read()

        if openapi_file.filename.endswith('.json'):
            openapi_spec = json.loads(content.decode('utf-8'))
        else:
            openapi_spec = yaml.safe_load(content.decode('utf-8'))

        temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
        json.dump(openapi_spec, temp_file, indent=2)
        temp_file.close()

        server_id = str(uuid.uuid4())
        port = self.server_register.get_next_port()
        server_host = self.server_register.get_server_host()
        server_name = server_name or f"MCP-Server-{port}"

        process = self.server_register.start_mcp_process(
            openapi_source=temp_file.name,
            base_url=base_url,
            server_name=server_name,
            port=port,
            bearer_token=bearer_token
        )

        server_info = {
            "id": server_id,
            "server_name": server_name,
            "mcp_url": f"http://{server_host}:{port}/mcp",
            "port": port,
            "pid": process.pid,
            "base_url": base_url,
            "openapi_source": f"uploaded_file_{openapi_file.filename}",
            "protected_endpoints": 0,
            "total_endpoints": 0,
            "has_bearer_token": bool(bearer_token),
            "created_at": datetime.now().isoformat(),
            "status": "running"
        }

        self.server_register.server_registry["servers"].append(server_info)

        return MCPServerResponse(
            status="success",
            server_id=server_id,
            mcp_url=server_info["mcp_url"],
            message=f"MCP server '{server_name}' created successfully from uploaded file on port {port}"
        )

    def create_mcp_from_file_path(
        self,
        file_path: str,
        base_url: str,
        bearer_token: Optional[str] = None,
        server_name: Optional[str] = None
    ) -> MCPServerResponse:
        """
        Create MCP server from OpenAPI file path
        
        Args:
            file_path: Path to the OpenAPI file (JSON, YAML, or YML)
            base_url: Base URL for the API
            bearer_token: Optional bearer token for authentication
            server_name: Optional name for the server
            
        Returns:
            MCPServerResponse with server details
        """
        from pathlib import Path
        
        file_path_obj = Path(file_path)
        
        if not file_path_obj.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        if not file_path_obj.suffix.lower() in ['.json', '.yaml', '.yml']:
            raise ValueError("File must be a JSON or YAML file (.json, .yaml, .yml)")
        
        # Read and parse the file
        with open(file_path_obj, 'r', encoding='utf-8') as f:
            if file_path_obj.suffix.lower() == '.json':
                openapi_spec = json.load(f)
            else:
                openapi_spec = yaml.safe_load(f)
        
        # Create a temporary JSON file for the server
        temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False)
        json.dump(openapi_spec, temp_file, indent=2)
        temp_file.close()
        
        server_id = str(uuid.uuid4())
        port = self.server_register.get_next_port()
        server_host = self.server_register.get_server_host()
        server_name = server_name or f"MCP-Server-{port}"
        
        process = self.server_register.start_mcp_process(
            openapi_source=temp_file.name,
            base_url=base_url,
            server_name=server_name,
            port=port,
            bearer_token=bearer_token
        )
        
        server_info = {
            "id": server_id,
            "server_name": server_name,
            "mcp_url": f"http://{server_host}:{port}/mcp",
            "port": port,
            "pid": process.pid,
            "base_url": base_url,
            "openapi_source": str(file_path_obj),
            "protected_endpoints": 0,
            "total_endpoints": 0,
            "has_bearer_token": bool(bearer_token),
            "created_at": datetime.now().isoformat(),
            "status": "running"
        }
        
        self.server_register.server_registry["servers"].append(server_info)
        
        return MCPServerResponse(
            status="success",
            server_id=server_id,
            mcp_url=server_info["mcp_url"],
            message=f"MCP server '{server_name}' created successfully from file on port {port}"
        )

    def stop_mcp_server(self, server_id: str):
        import psutil

        servers = self.server_register.server_registry["servers"]
        server_info = next((s for s in servers if s["id"] == server_id), None)

        if not server_info:
            raise ValueError(f"Server not found: {server_id}")

        try:
            process = psutil.Process(server_info["pid"])
            process.terminate()
            process.wait(timeout=5)
        except (psutil.NoSuchProcess, psutil.TimeoutExpired):
            try:
                process.kill()
            except psutil.NoSuchProcess:
                pass

        self.server_register.server_registry["servers"] = [
            s for s in servers if s["id"] != server_id
        ]

        return {
            "status": "success",
            "message": f"MCP server '{server_info['server_name']}' stopped successfully"
        }
