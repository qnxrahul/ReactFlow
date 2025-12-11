import os
import asyncio
import multiprocessing
from typing import Dict,Any

from mcp_swagger.utils.server import create_custom_server
from config import MCP_PORT

class ServerRegistry:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ServerRegistry, cls).__new__(cls)
            cls._instance.server_registry = {"servers": []}
            cls._instance.current_port = MCP_PORT
        return cls._instance

    def get_next_port(self) -> int:
        """Get the next available port for MCP server"""
        port = self.current_port
        self.current_port += 1
        return port

    def get_server_host(self) -> str:
        """Get the server host for MCP URLs (for client connections)"""
        # Always use localhost for client connections, even if server binds to 0.0.0.0
        # 0.0.0.0 is a bind address, not a connect address
        host = os.getenv("SERVER_HOST", "localhost")
        # Convert 0.0.0.0 to localhost for client connections
        if host == "0.0.0.0":
            return "localhost"
        return host

    def run_mcp_in_process(self, openapi_source: str, base_url: str, server_name: str, port: int, bearer_token: str = None):
        """Function to run MCP server in separate process"""
        async def start_server():
            try:
                server = await create_custom_server(
                    openapi_source=openapi_source,
                    base_url=base_url,
                    server_name=server_name,
                    bearer_token=bearer_token
                )
                await server.run_async(transport="http", host="0.0.0.0", port=port)
            except Exception as e:
                print(f"❌ Error running MCP server on port {port}: {e}")
                import traceback
                traceback.print_exc()
        
        # Create a new event loop for this process
        # This is necessary when running in multiprocessing context
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(start_server())
        except Exception as e:
            print(f"❌ Event loop error: {e}")
            import traceback
            traceback.print_exc()
        finally:
            try:
                loop.close()
            except:
                pass

    def start_mcp_process(self, openapi_source: str, base_url: str, server_name: str, port: int, bearer_token: str = None):
        """Start MCP server in separate process using multiprocessing"""
        process = multiprocessing.Process(
            target=self.run_mcp_in_process,
            args=(openapi_source, base_url, server_name, port, bearer_token)
        )
        process.start()
        print(f"🚀 Started MCP server process PID: {process.pid} on port {port}")
        return process
