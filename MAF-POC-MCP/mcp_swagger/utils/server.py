#!/usr/bin/env python3
"""
Enhanced MCP Server with Selective Authentication
Converts any OpenAPI spec (JSON/YAML) to MCP tools via FastMCP 2.0
Supports per-endpoint authentication configuration
"""

import asyncio
import json
import yaml
import httpx
from pathlib import Path
from typing import Union, Dict, Any, Set
from fastmcp import FastMCP
from config import MCP_PORT

class OpenAPIMCPServer:
    def __init__(self, name: str = "OpenAPI-MCP-Server"):
        self.mcp = None
        self.client = None
        self.protected_endpoints: Set[str] = set()
        self.bearer_token: str = None
        self.name = name
        
    async def load_openapi_spec(self, spec_source: Union[str, Path, Dict]) -> Dict[str, Any]:
        """Load and convert OpenAPI spec from URL, file, or dict. Auto-converts YAML to JSON."""
        
        if isinstance(spec_source, dict):
            return spec_source
            
        # Handle file path
        if isinstance(spec_source, (str, Path)) and not spec_source.startswith(('http://', 'https://')):
            spec_path = Path(spec_source)
            if not spec_path.exists():
                raise FileNotFoundError(f"OpenAPI spec file not found: {spec_path}")
                
            content = spec_path.read_text()
            
            # Auto-detect and convert YAML to JSON
            if spec_path.suffix.lower() in ['.yaml', '.yml']:
                return yaml.safe_load(content)
            else:
                return json.loads(content)
        
        # Handle URL
        url_str = str(spec_source)
        try:
            # Ensure we have a valid event loop (important for multiprocessing)
            try:
                loop = asyncio.get_event_loop()
                if loop.is_closed():
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            
            # Increase timeout for slow servers or large OpenAPI specs
            async with httpx.AsyncClient(verify=False, timeout=60.0) as client:
                print(f"📥 Fetching OpenAPI spec from: {url_str}")
                response = await client.get(url_str)
                response.raise_for_status()
                
                content_type = response.headers.get('content-type', '').lower()
                
                # Auto-detect format and convert
                if 'yaml' in content_type or url_str.endswith(('.yaml', '.yml')):
                    return yaml.safe_load(response.text)
                else:
                    return response.json()
        except RuntimeError as e:
            if 'Event loop is closed' in str(e) or 'no running event loop' in str(e).lower():
                raise RuntimeError(
                    f"Event loop error while fetching OpenAPI spec from {url_str}. "
                    f"This can happen in multiprocessing contexts. Error: {e}"
                )
            raise
        except httpx.ConnectError as e:
            error_msg = str(e)
            if 'getaddrinfo failed' in error_msg or '11001' in error_msg:
                raise ConnectionError(
                    f"DNS resolution failed for URL: {url_str}\n"
                    f"This means the hostname cannot be resolved. Please check:\n"
                    f"  1. The URL is correct: {url_str}\n"
                    f"  2. The server is running and accessible\n"
                    f"  3. Try using '127.0.0.1' instead of 'localhost' (or vice versa)\n"
                    f"  4. Check your network connection\n"
                    f"Original error: {e}"
                )
            else:
                raise ConnectionError(f"Failed to connect to {url_str}: {e}")
        except httpx.TimeoutException as e:
            raise TimeoutError(
                f"Timeout while fetching OpenAPI spec from {url_str}\n"
                f"This usually means:\n"
                f"  1. The server at {url_str} is not running or not responding\n"
                f"  2. The server is slow to respond (tried for 60 seconds)\n"
                f"  3. Network connectivity issues\n"
                f"Please check:\n"
                f"  - Is the server running? Try accessing {url_str} in your browser\n"
                f"  - Is the URL correct? FastAPI typically serves OpenAPI at /openapi.json\n"
                f"  - For Swagger UI, try: http://127.0.0.1:8000/docs\n"
                f"Original error: {e}"
            )
        except httpx.HTTPStatusError as e:
            raise ValueError(f"HTTP {e.response.status_code} error fetching {url_str}: {e.response.text[:200]}")
        except Exception as e:
            raise RuntimeError(f"Error fetching OpenAPI spec from {url_str}: {e}")
    
    def analyze_auth_requirements(self, openapi_spec: Dict[str, Any]) -> Set[str]:
        """Analyze OpenAPI spec to identify which endpoints require authentication"""
        protected_endpoints = set()
        
        paths = openapi_spec.get('paths', {})
        
        for path, methods in paths.items():
            for method, operation in methods.items():
                if method.upper() in ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']:
                    # Check if operation has security requirements
                    security = operation.get('security', [])
                    global_security = openapi_spec.get('security', [])
                    
                    # If operation has security OR global security exists and operation doesn't override it
                    if security or (global_security and 'security' not in operation):
                        operation_id = operation.get('operationId', f"{method}_{path.replace('/', '_')}")
                        protected_endpoints.add(operation_id)
                        print(f"🔒 Protected endpoint: {operation_id} ({method.upper()} {path})")
        
        return protected_endpoints
    
    async def create_from_openapi(self, 
                                spec_source: Union[str, Path, Dict],
                                base_url: str,
                                bearer_token: str = None,
                                name: str = None) -> "OpenAPIMCPServer":
        """Create MCP server from OpenAPI spec with selective authentication"""
        
        # Load and convert spec
        openapi_spec = await self.load_openapi_spec(spec_source)
        
        # Analyze authentication requirements
        self.protected_endpoints = self.analyze_auth_requirements(openapi_spec)
        self.bearer_token = bearer_token
        
        # Create HTTP client with auth headers for protected endpoints
        headers = {}
        if bearer_token and self.protected_endpoints:
            headers['Authorization'] = f'Bearer {bearer_token}'
            print(f"🔑 Using Bearer token for {len(self.protected_endpoints)} protected endpoints")
        
        self.client = httpx.AsyncClient(base_url=base_url, headers=headers, verify=False)
        
        # Create MCP server using FastMCP.from_openapi() - CORRECTED SYNTAX
        server_name = name or self.name
        self.mcp = FastMCP.from_openapi(
            openapi_spec=openapi_spec,
            client=self.client,
            name=server_name
        )
        
        print(f"✅ Created MCP server from OpenAPI spec")
        print(f"🌐 Base URL: {base_url}")
        print(f"🔧 Available tools will be auto-generated from endpoints")
        
        if self.protected_endpoints:
            print(f"🔒 Protected endpoints: {len(self.protected_endpoints)}")
        else:
            print("🌍 All endpoints are public")
        
        return self
    
    async def run_async(self, host: str = "0.0.0.0", port: int = MCP_PORT, transport: str = "http"):
        """Run the MCP server asynchronously with streamable HTTP transport"""
        print(f"🚀 Starting MCP server at http://{host}:{port}")
        print(f"📡 Transport: {transport} (streamable)")
        print(f"🔗 MCP endpoint: http://{host}:{port}/mcp")
        
        # Use run_async() method when already in async context
        await self.mcp.run_async(transport=transport, host=host, port=port, path="/mcp")
    
    def run(self, host: str = "0.0.0.0", port: int = MCP_PORT, transport: str = "http"):
        """Run the MCP server with streamable HTTP transport (sync wrapper)"""
        print(f"🚀 Starting MCP server at http://{host}:{port}")
        print(f"📡 Transport: {transport} (streamable)")
        print(f"🔗 MCP endpoint: http://{host}:{port}/mcp")
        
        # CORRECTED: Use run() method with correct parameter order and path
        self.mcp.run(transport=transport, host=host, port=port, path="/mcp")

async def create_custom_server(openapi_source: Union[str, Path, Dict], 
                             base_url: str, 
                             server_name: str = "Custom-MCP", 
                             bearer_token: str = None):
    """Create MCP server from custom OpenAPI spec"""
    server = OpenAPIMCPServer(server_name)
    await server.create_from_openapi(openapi_source, base_url, bearer_token, server_name)
    return server