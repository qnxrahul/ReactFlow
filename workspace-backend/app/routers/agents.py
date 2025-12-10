from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..dependencies import get_agent_registry_store, get_mcp_client
from ..models_workflow import AgentDefinition, AgentDefinitionRequest, AgentListResponse, AgentRunRequest, AgentRunResponse
from ..services.mcp_client import MCPClient
from ..services.registry_store import ComponentRegistryStore

router = APIRouter(prefix="/agents", tags=["Agents"])


def _normalize(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    return value.strip().lower() or None


def _filter_agents(
    agents: List[AgentDefinition],
    domain: Optional[str],
    intent: Optional[str],
    keywords: Optional[List[str]],
) -> List[AgentDefinition]:
    normalized_keywords = [kw.strip().lower() for kw in keywords or [] if kw.strip()]
    intent_tokens = [token for token in (intent or "").split() if token]

    def matches(agent: AgentDefinition) -> bool:
        domain_match = not domain or any(domain in d.lower() for d in agent.domains)
        if not intent_tokens:
            intent_match = True
        else:
            agent_intents = [tag.lower() for tag in agent.intent_tags]
            intent_match = any(any(token in tag for token in intent_tokens) for tag in agent_intents)

        keyword_match = True
        if normalized_keywords:
            capability_tokens = {c.lower() for c in agent.capabilities}
            capability_tokens.update(tag.lower() for tag in agent.intent_tags)
            capability_tokens.update(d.lower() for d in agent.domains)
            keyword_match = any(keyword in token or token in keyword for keyword in normalized_keywords for token in capability_tokens)
        return domain_match and intent_match and keyword_match

    return [agent for agent in agents if matches(agent)]


@router.get("/", response_model=AgentListResponse)
def list_agents(
    domain: Optional[str] = Query(default=None),
    intent: Optional[str] = Query(default=None),
    keywords: Optional[List[str]] = Query(default=None),
    registry: ComponentRegistryStore = Depends(get_agent_registry_store),
) -> AgentListResponse:
    agents = _filter_agents(registry.list_agents(), _normalize(domain), _normalize(intent), keywords)
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
