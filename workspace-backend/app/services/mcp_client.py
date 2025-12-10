from __future__ import annotations

import json
from typing import Dict, Optional

import httpx

from ..config import Settings
from ..models_workflow import AgentDefinition, AgentRunRequest, AgentRunResponse


class MCPClient:
    def __init__(self, settings: Settings):
        self._settings = settings
        self._base_url = (settings.mcp_gateway_url or '').rstrip('/') or None
        self._api_key = settings.mcp_api_key

    @property
    def enabled(self) -> bool:
        return bool(self._base_url)

    def invoke(self, agent: AgentDefinition, payload: AgentRunRequest) -> AgentRunResponse:
        if not self.enabled:
            return self._mock_response(agent, payload)

        headers: Dict[str, str] = {'Content-Type': 'application/json'}
        if self._api_key:
            headers['Authorization'] = f'Bearer {self._api_key}'

        request_body = {
            'tool': agent.mcp_tool,
            'params': {**(agent.default_params or {}), **payload.context},
            'input': payload.input,
        }
        url = f"{self._base_url}/agents/{agent.id}/run"
        server_override = agent.mcp_server or None
        if server_override:
            url = server_override.rstrip('/') + f"/agents/{agent.id}/run"

        try:
            with httpx.Client(timeout=30) as client:
                response = client.post(url, headers=headers, json=request_body)
                response.raise_for_status()
                data = response.json()
        except Exception as exc:  # fallback to mock on failure
            return self._mock_response(agent, payload, error=str(exc))

        output = data.get('output') or data.get('result') or json.dumps(data)
        logs = data.get('logs')
        status = data.get('status') or 'success'
        return AgentRunResponse(status=status, output=output, logs=logs)

    def _mock_response(self, agent: AgentDefinition, payload: AgentRunRequest, error: Optional[str] = None) -> AgentRunResponse:
        if error:
            return AgentRunResponse(status='error', output=f"Agent {agent.name} failed: {error}")
        context_summary = json.dumps(payload.context) if payload.context else 'no context'
        text = f"[Mock MCP] Agent '{agent.name}' executed with input: {payload.input or 'n/a'} and context {context_summary}."
        return AgentRunResponse(status='success', output=text)
