from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..dependencies import get_agent_registry_store, get_mcp_client
from ..models_workflow import AgentDefinition, AgentDefinitionRequest, AgentListResponse, AgentRunRequest, AgentRunResponse
from ..services.mcp_client import MCPClient
from ..services.registry_store import ComponentRegistryStore

router = APIRouter(prefix="/agents", tags=["Agents"])


def _filter_agents(agents: List[AgentDefinition], domain: Optional[str], intent: Optional[str]) -> List[AgentDefinition]:
    def matches(agent: AgentDefinition) -> bool:
        domain_match = not domain or domain.lower() in (d.lower() for d in agent.domains)
        intent_match = not intent or intent.lower() in (tag.lower() for tag in agent.intent_tags)
        return domain_match and intent_match

    return [agent for agent in agents if matches(agent)]


@router.get("/", response_model=AgentListResponse)
def list_agents(
    domain: Optional[str] = Query(default=None),
    intent: Optional[str] = Query(default=None),
    registry: ComponentRegistryStore = Depends(get_agent_registry_store),
) -> AgentListResponse:
    agents = _filter_agents(registry.list_agents(), domain, intent)
    return AgentListResponse(agents=agents)


@router.post("/", response_model=AgentDefinition, status_code=status.HTTP_201_CREATED)
def register_agent(
    payload: AgentDefinitionRequest,
    registry: ComponentRegistryStore = Depends(get_agent_registry_store),
) -> AgentDefinition:
    try:
        return registry.add_agent(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/{agent_id}/run", response_model=AgentRunResponse)
def run_agent(
    agent_id: str,
    payload: AgentRunRequest,
    registry: ComponentRegistryStore = Depends(get_agent_registry_store),
    mcp: MCPClient = Depends(get_mcp_client),
) -> AgentRunResponse:
    agent = registry.find_agent_by_id(agent_id)
    if not agent:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")
    return mcp.invoke(agent, payload)
