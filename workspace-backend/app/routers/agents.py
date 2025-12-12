from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..config import get_settings
from ..dependencies import get_agent_registry_store, get_audit_taxonomy, get_mcp_client
from ..models_workflow import AgentDefinition, AgentDefinitionRequest, AgentListResponse, AgentRunRequest, AgentRunResponse
from ..services.audit_taxonomy import AuditTaxonomy
from ..services.maf_client import MAFClient
from ..services.mcp_client import MCPClient
from ..services.registry_store import ComponentRegistryStore

router = APIRouter(prefix="/agents", tags=["Agents"])

logger = logging.getLogger(__name__)


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
    fallback_domain = domain.strip().lower() if domain and not canonical_domain else None
    keyword_domains = taxonomy.canonicalize_list(keywords or [])
    if fallback_domain:
        normalized_keywords.append(fallback_domain)

    def score_agent(agent: AgentDefinition) -> Optional[int]:
        canonical_agent_domains = taxonomy.canonicalize_list(agent.domains)
        lowercase_agent_domains = [(dom or "").lower() for dom in (agent.domains or [])]
        fallback_domain_match = bool(
            fallback_domain and any(fallback_domain in domain_value for domain_value in lowercase_agent_domains)
        )
        if canonical_domain:
            domain_match = canonical_domain in canonical_agent_domains or agent.is_global
        elif fallback_domain:
            domain_match = fallback_domain_match or agent.is_global
        else:
            domain_match = True
        if (canonical_domain or fallback_domain) and not domain_match:
            return None

        score = 0
        if canonical_domain and canonical_domain in canonical_agent_domains:
            score += 6
        elif fallback_domain and fallback_domain_match:
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
    base_agents = registry.list_agents()

    settings = get_settings()
    maf_client = MAFClient(settings)
    maf_agents: List[AgentDefinition] = []
    if maf_client.enabled:
        try:
            response = maf_client.list_agents()
            raw_agents = response.get("agents", []) if isinstance(response, dict) else []
            maf_agents = [
                AgentDefinition.model_validate(item)
                for item in raw_agents
                if isinstance(item, dict)
            ]
        except Exception as exc:  # pragma: no cover - network issues
            logger.warning("Failed to load agents from MAF catalog: %s", exc)

    combined: List[AgentDefinition] = []
    seen_ids = set()

    def _append(agent: AgentDefinition) -> None:
        if agent.id in seen_ids:
            return
        seen_ids.add(agent.id)
        combined.append(agent)

    for agent in base_agents:
        _append(agent)
    for agent in maf_agents:
        _append(agent)

    agents = _filter_agents(combined, _normalize(domain), _normalize(intent), keywords, taxonomy)
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
