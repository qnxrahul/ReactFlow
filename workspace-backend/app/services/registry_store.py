from __future__ import annotations

import json
from pathlib import Path
from typing import List

from ..models_workflow import (
    AgentDefinition,
    AgentDefinitionRequest,
    ComponentDefinition,
    ComponentDefinitionRequest,
    HandlerDefinition,
    HandlerDefinitionRequest,
)

DEFAULT_COMPONENTS = [
    {
        "type": "agentCard",
        "label": "Agent Card",
        "baseRenderer": "agentCard",
        "description": "General purpose LLM agent card used for reasoning or orchestration steps.",
        "category": "Agent",
        "defaultProps": {"subtitle": "LLM agent"},
    },
    {
        "type": "evidenceCard",
        "label": "Evidence Collector",
        "baseRenderer": "evidenceCard",
        "description": "Displays evidence gathering progress and allows uploads or triggers.",
        "category": "Evidence",
        "defaultProps": {"subtitle": "Collect evidence"},
    },
    {
        "type": "decisionCard",
        "label": "Decision Gate",
        "baseRenderer": "decisionCard",
        "description": "Represents a human or automated decision point with branching logic.",
        "category": "Decision",
        "defaultProps": {},
    },
]

DEFAULT_HANDLERS = [
    {
        "handler": "openrouter.scope",
        "kind": "llm-agent",
        "description": "LLM agent that aligns scope, requirements, and constraints.",
    },
    {
        "handler": "openrouter.collect",
        "kind": "llm-agent",
        "description": "LLM agent that describes evidence to collect and validates uploads.",
    },
    {
        "handler": "openrouter.risk",
        "kind": "llm-agent",
        "description": "LLM agent focused on inherent/residual risk commentary.",
    },
    {
        "handler": "rules.fraud",
        "kind": "service",
        "description": "Deterministic fraud scoring microservice.",
    },
]

DEFAULT_AGENTS = [
    {
        "id": "agent-mesp-planner",
        "name": "MESP Engagement Planner",
        "handler": "openrouter.mesp.planner",
        "description": "Designs end-to-end MESP plans covering scope, samples, and initial workpapers.",
        "domains": ["MESP"],
        "intentTags": ["plan engagement", "sampling", "scope alignment"],
        "capabilities": ["planning", "sampling", "mesp"],
        "mcpTool": "mesp_planner",
        "defaultParams": {"temperature": 0.15},
    },
    {
        "id": "agent-risk-analyst",
        "name": "Enterprise Risk Analyst",
        "handler": "openrouter.risk",
        "description": "Summarizes inherent/residual risk narratives and aligns with ERM heatmaps.",
        "domains": ["Enterprise Risk"],
        "intentTags": ["risk assessment", "risk narrative"],
        "capabilities": ["risk scoring", "residual risk", "erm"],
        "mcpTool": "risk_analyst",
        "defaultParams": {"temperature": 0.1},
    },
    {
        "id": "agent-fraud-reviewer",
        "name": "Fraud Reviewer",
        "handler": "rules.fraud",
        "description": "Reviews anomalies and flags fraud cases for escalation.",
        "domains": ["Fraud & Investigations"],
        "intentTags": ["investigation", "fraud triage"],
        "capabilities": ["fraud", "investigation", "anomaly"],
        "mcpTool": "fraud_reviewer",
        "defaultParams": {"threshold": 0.8},
    },
    {
        "id": "agent-compliance-scout",
        "name": "Compliance Evidence Scout",
        "handler": "openrouter.collect",
        "description": "Collects and tags regulatory evidence mapped to citations.",
        "domains": ["Regulatory Compliance"],
        "intentTags": ["evidence", "collection"],
        "capabilities": ["compliance", "evidence", "regulation"],
        "mcpTool": "compliance_scout",
        "defaultParams": {},
    },
    {
        "id": "agent-workpaper-drafter",
        "name": "Workpaper Drafter",
        "handler": "openrouter.workpaper",
        "description": "Drafts and updates audit workpapers, cascading reviewer notes across components.",
        "domains": ["Workpaper Production"],
        "intentTags": ["workpaper", "documentation"],
        "capabilities": ["workpaper", "documentation"],
        "mcpTool": "workpaper_drafter",
        "isGlobal": True,
        "defaultParams": {"temperature": 0.2},
    },
]


class ComponentRegistryStore:
    def __init__(self, root: Path):
        self._path = root / "component_registry.json"
        root.mkdir(parents=True, exist_ok=True)
        if not self._path.exists():
            self._path.write_text(json.dumps({"components": [], "handlers": []}, indent=2))
        self._ensure_defaults()

    def _load(self) -> dict:
        return json.loads(self._path.read_text())

    def _save(self, data: dict) -> None:
        self._path.write_text(json.dumps(data, indent=2))

    def _ensure_defaults(self) -> None:
        data = self._load()
        changed = False

        changed |= self._dedupe_entries(data, "components", key_field="type")
        changed |= self._dedupe_entries(data, "handlers", key_field="handler")
        changed |= self._dedupe_entries(data, "agents", key_field=("handler", "mcpTool"))

        existing_types = {item.get("type") for item in data.get("components", [])}
        for default in DEFAULT_COMPONENTS:
            if default["type"] not in existing_types:
                component = ComponentDefinition(**ComponentDefinitionRequest(**default).model_dump())
                data.setdefault("components", []).append(component.model_dump(by_alias=True))
                existing_types.add(default["type"])
                changed = True

        existing_handlers = {item.get("handler") for item in data.get("handlers", [])}
        for default in DEFAULT_HANDLERS:
            if default["handler"] not in existing_handlers:
                handler = HandlerDefinition(**HandlerDefinitionRequest(**default).model_dump())
                data.setdefault("handlers", []).append(handler.model_dump(by_alias=True))
                existing_handlers.add(default["handler"])
                changed = True

        agents = data.setdefault("agents", [])
        for default in DEFAULT_AGENTS:
            agent_obj = AgentDefinition(**AgentDefinitionRequest(**default).model_dump())
            serialized = agent_obj.model_dump(by_alias=True)
            replaced = False
            for index, existing in enumerate(agents):
                if existing.get("handler") == serialized["handler"]:
                    if existing != serialized:
                        agents[index] = serialized
                        changed = True
                    replaced = True
                    break
            if not replaced:
                agents.append(serialized)
                changed = True

        if changed:
            self._save(data)

    def _dedupe_entries(self, data: dict, key: str, *, key_field: str | tuple[str, ...]) -> bool:
        items = data.get(key, [])
        if not items:
            return False
        seen = set()
        deduped = []
        for entry in items:
            if isinstance(key_field, tuple):
                identifier = tuple(entry.get(field) for field in key_field)
            else:
                identifier = entry.get(key_field)
            if identifier in seen:
                continue
            seen.add(identifier)
            deduped.append(entry)
        if len(deduped) == len(items):
            return False
        data[key] = deduped
        return True

    def list_components(self) -> List[ComponentDefinition]:
        self._ensure_defaults()
        data = self._load()
        return [ComponentDefinition.model_validate(item) for item in data.get("components", [])]

    def list_handlers(self) -> List[HandlerDefinition]:
        self._ensure_defaults()
        data = self._load()
        return [HandlerDefinition.model_validate(item) for item in data.get("handlers", [])]

    def list_agents(self) -> List[AgentDefinition]:
        self._ensure_defaults()
        data = self._load()
        return [AgentDefinition.model_validate(item) for item in data.get("agents", [])]

    def add_component(self, payload: ComponentDefinitionRequest) -> ComponentDefinition:
        data = self._load()
        components = data.setdefault("components", [])
        component = ComponentDefinition(**payload.model_dump())
        if any(existing.get("type") == component.type for existing in components):
            raise ValueError(f"Component type '{component.type}' already exists")
        components.append(component.model_dump(by_alias=True))
        self._save(data)
        return component

    def add_handler(self, payload: HandlerDefinitionRequest) -> HandlerDefinition:
        data = self._load()
        handlers = data.setdefault("handlers", [])
        handler = HandlerDefinition(**payload.model_dump())
        if any(existing.get("handler") == handler.handler for existing in handlers):
            raise ValueError(f"Handler '{handler.handler}' already exists")
        handlers.append(handler.model_dump(by_alias=True))
        self._save(data)
        return handler

    def add_agent(self, payload: AgentDefinitionRequest) -> AgentDefinition:
        data = self._load()
        agents = data.setdefault("agents", [])
        agent = AgentDefinition(**payload.model_dump())
        if any(existing.get("id") == agent.id for existing in agents):
            raise ValueError(f"Agent id '{agent.id}' already exists")
        agents.append(agent.model_dump(by_alias=True))
        self._save(data)
        return agent

    def find_agent_by_id(self, agent_id: str) -> AgentDefinition | None:
        for agent in self.list_agents():
            if agent.id == agent_id:
                return agent
        return None

    def find_agent_by_handler(self, handler_id: str) -> AgentDefinition | None:
        for agent in self.list_agents():
            if agent.handler == handler_id:
                return agent
        return None
