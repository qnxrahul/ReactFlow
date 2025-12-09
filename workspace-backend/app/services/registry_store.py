from __future__ import annotations

import json
from pathlib import Path
from typing import List

from ..models_workflow import (
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
        existing_types = {item.get("type") for item in data.get("components", [])}
        changed = False
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

        if changed:
            self._save(data)

    def list_components(self) -> List[ComponentDefinition]:
        self._ensure_defaults()
        data = self._load()
        return [ComponentDefinition.model_validate(item) for item in data.get("components", [])]

    def list_handlers(self) -> List[HandlerDefinition]:
        self._ensure_defaults()
        data = self._load()
        return [HandlerDefinition.model_validate(item) for item in data.get("handlers", [])]

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
