from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..dependencies import get_agent_registry_store, get_audit_taxonomy, get_mcp_client
from ..models_workflow import AgentDefinition, AgentDefinitionRequest, AgentListResponse, AgentRunRequest, AgentRunResponse
from ..services.audit_taxonomy import AuditTaxonomy
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
    taxonomy: AuditTaxonomy,
) -> List[AgentDefinition]:
    normalized_keywords = [kw.strip().lower() for kw in keywords or [] if kw.strip()]
    intent_tokens = [token.strip().lower() for token in (intent or "").split() if token.strip()]
    canonical_domain = taxonomy.canonicalize(domain)
    keyword_domains = taxonomy.canonicalize_list(keywords or [])

    def score_agent(agent: AgentDefinition) -> Optional[int]:
        canonical_agent_domains = taxonomy.canonicalize_list(agent.domains)
        domain_match = not canonical_domain or canonical_domain in canonical_agent_domains or agent.is_global
        if canonical_domain and not domain_match:
            return None

        score = 0
        if canonical_domain and canonical_domain in canonical_agent_domains:
            score += 6
        if agent.is_global:
            score += 2
        if keyword_domains and canonical_agent_domains.intersection(keyword_domains):
            score += 2
        if intent_tokens:
            agent_intents = {tag.lower() for tag in agent.intent_tags}
            overlap = sum(1 for token in intent_tokens if any(token in tag for tag in agent_intents))
            score += overlap * 2
        if normalized_keywords:
            capability_tokens = {c.lower() for c in agent.capabilities}
            capability_tokens.update(tag.lower() for tag in agent.intent_tags)
            capability_tokens.update(domain.lower() for domain in agent.domains)
            if any(keyword in token or token in keyword for keyword in normalized_keywords for token in capability_tokens):
                score += 1
        return score

    ranked: List[tuple[int, AgentDefinition]] = []
    seen_ids = set()
    for agent in agents:
        if agent.id in seen_ids:
            continue
        seen_ids.add(agent.id)
        agent_score = score_agent(agent)
        if agent_score is None:
            continue
        ranked.append((agent_score, agent))

    ranked.sort(key=lambda item: item[0], reverse=True)
    return [agent for _, agent in ranked]


@router.get("/", response_model=AgentListResponse)
def list_agents(
    domain: Optional[str] = Query(default=None),
    intent: Optional[str] = Query(default=None),
    keywords: Optional[List[str]] = Query(default=None),
    registry: ComponentRegistryStore = Depends(get_agent_registry_store),
    taxonomy: AuditTaxonomy = Depends(get_audit_taxonomy),
) -> AgentListResponse:
    agents = _filter_agents(registry.list_agents(), _normalize(domain), _normalize(intent), keywords, taxonomy)
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
