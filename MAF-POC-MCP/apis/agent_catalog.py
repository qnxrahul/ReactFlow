from __future__ import annotations

from fastapi import APIRouter

from registry.agent_catalog import list_agents

router = APIRouter(prefix="/agents/catalog", tags=["agents-catalog"])


@router.get("/")
def list_agent_catalog():
    agents = [agent.model_dump(by_alias=True) for agent in list_agents()]
    return {"agents": agents}
