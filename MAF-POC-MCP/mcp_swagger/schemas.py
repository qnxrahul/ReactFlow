from pydantic import BaseModel
from typing import Optional,List

# Request models
class CreateMCPFromURLRequest(BaseModel):
    openapi_url: str
    base_url: str
    bearer_token: Optional[str] = None
    server_name: Optional[str] = None

# Response models
class MCPServerResponse(BaseModel):
    status: str
    server_id: Optional[str] = None
    mcp_url: Optional[str] = None
    message: str

class ServerInfo(BaseModel):
    id: str
    server_name: str
    mcp_url: str
    port: int
    pid: int
    base_url: str
    openapi_source: str
    protected_endpoints: int
    total_endpoints: int
    has_bearer_token: bool
    created_at: str
    status: str

class ListServersResponse(BaseModel):
    status: str
    servers: List[ServerInfo]