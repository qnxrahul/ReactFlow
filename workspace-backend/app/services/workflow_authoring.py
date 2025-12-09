from __future__ import annotations

import json
from typing import List, Optional

from ..models_workflow import (
    ComponentDefinition,
    HandlerDefinition,
    WorkflowDefinition,
    WorkflowEdge,
    WorkflowGenerateRequest,
    WorkflowNode,
    WorkflowNodeBehavior,
    WorkflowNodeUI,
)
from .llm_client import OpenRouterClient
from .rag import RAGService


class WorkflowAuthoringService:
    """Generates workflows using OpenRouter + RAG, with deterministic fallback."""

    def __init__(
        self,
        components: List[ComponentDefinition],
        handlers: List[HandlerDefinition],
        rag_service: Optional[RAGService] = None,
        llm_client: Optional[OpenRouterClient] = None,
    ) -> None:
        self._components = components
        self._handlers = handlers
        self._rag = rag_service
        self._llm = llm_client

    def generate(self, request: WorkflowGenerateRequest) -> WorkflowDefinition:
        knowledge = self._rag.retrieve(request.domain, request.intent) if self._rag else []
        if self._llm and self._llm.enabled:
            try:
                return self._generate_with_llm(request, knowledge)
            except Exception:
                # Fall back to deterministic plan if the LLM fails
                pass
        return self._fallback_workflow(request)

    def _generate_with_llm(self, request: WorkflowGenerateRequest, knowledge: List[dict]) -> WorkflowDefinition:
        component_descriptions = [
            f"- {component.type}: {component.description or component.label}"
            for component in self._components
        ]
        handler_descriptions = [
            f"- {handler.handler} ({handler.kind})\n  {handler.description or ''}"
            for handler in self._handlers
        ]
        knowledge_snippets = [f"- {entry['title']}: {entry['content']}" for entry in knowledge]

        prompt = "\n".join(
            [
                f"Domain: {request.domain}",
                f"Intent: {request.intent}",
                f"Description: {request.description or 'N/A'}",
                "Relevant knowledge:",
                *(knowledge_snippets or ["- None"]),
                "Available components:",
                *component_descriptions,
                "Available handlers:",
                *handler_descriptions,
                "Produce a JSON workflow that references only these components and handlers.",
            ]
        )

        schema = _build_llm_schema(self._components, self._handlers)
        messages = [
            {
                "role": "system",
                "content": "You are an audit workflow architect. Output JSON that matches the provided schema.",
            },
            {"role": "user", "content": prompt},
        ]
        content = self._llm.generate(messages=messages, response_schema=schema)
        data = json.loads(content)
        return _hydrate_workflow(data, request, self._components, self._handlers)

    def _fallback_workflow(self, request: WorkflowGenerateRequest) -> WorkflowDefinition:
        domain = request.domain.strip() or "Audit"
        base_title = request.intent.strip().title() if request.intent else f"{domain} Workflow"
        component_lookup = {component.type: component for component in self._components}
        default_agent = component_lookup.get("agentCard", self._components[0])
        default_evidence = component_lookup.get("evidenceCard", self._components[0])
        default_decision = component_lookup.get("decisionCard", self._components[-1])

        handler_lookup = {handler.handler: handler for handler in self._handlers}
        handler_cycle = [
            handler_lookup.get("openrouter.scope") or self._handlers[0],
            handler_lookup.get("openrouter.collect") or self._handlers[min(1, len(self._handlers) - 1)],
            handler_lookup.get("openrouter.risk") or self._handlers[min(2, len(self._handlers) - 1)],
            handler_lookup.get("rules.fraud") or self._handlers[-1],
        ]

        nodes: List[WorkflowNode] = [
            _node_from_definition("Scope Alignment", "agent", default_agent, handler_cycle[0], outputs=["scope"]),
            _node_from_definition(
                "Collect Evidence",
                "evidence",
                default_evidence,
                handler_cycle[1],
                inputs=["scope"],
                outputs=["documents"],
            ),
            _node_from_definition(
                "Risk Assessment",
                "analysis",
                default_agent,
                handler_cycle[2],
                inputs=["documents"],
                outputs=["risk"],
            ),
            _node_from_definition(
                "Fraud Gate",
                "decision",
                default_decision,
                handler_cycle[3],
                inputs=["risk"],
                outputs=["decision"],
            ),
        ]

        edges = [WorkflowEdge(source=nodes[i].id, target=nodes[i + 1].id) for i in range(len(nodes) - 1)]
        return WorkflowDefinition(
            title=f"{domain} · {base_title}",
            domain=domain,
            intent=request.intent,
            nodes=nodes,
            edges=edges,
        )


def _node_from_definition(
    name: str,
    node_type: str,
    component: ComponentDefinition,
    handler: HandlerDefinition,
    inputs: Optional[List[str]] = None,
    outputs: Optional[List[str]] = None,
) -> WorkflowNode:
    ui_props = dict(component.default_props)
    return WorkflowNode(
        type=node_type,
        name=name,
        description=component.description,
        ui=WorkflowNodeUI(componentType=component.type, props=ui_props),
        behavior=WorkflowNodeBehavior(kind=handler.kind, handler=handler.handler),
        inputs=inputs or [],
        outputs=outputs or [],
    )


def _build_llm_schema(components: List[ComponentDefinition], handlers: List[HandlerDefinition]) -> dict:
    component_types = [component.type for component in components]
    handler_ids = [handler.handler for handler in handlers]
    return {
        "name": "workflow_schema",
        "schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "domain": {"type": "string"},
                "intent": {"type": "string"},
                "nodes": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string"},
                            "name": {"type": "string"},
                            "type": {"type": "string"},
                            "description": {"type": "string"},
                            "componentType": {"type": "string", "enum": component_types},
                            "behavior": {
                                "type": "object",
                                "properties": {
                                    "kind": {"type": "string", "enum": ["llm-agent", "service", "human-task"]},
                                    "handler": {"type": "string", "enum": handler_ids},
                                },
                                "required": ["kind", "handler"],
                            },
                            "inputs": {"type": "array", "items": {"type": "string"}},
                            "outputs": {"type": "array", "items": {"type": "string"}},
                            "ui": {
                                "type": "object",
                                "properties": {
                                    "props": {"type": "object"},
                                },
                            },
                        },
                        "required": ["name", "type", "componentType", "behavior"],
                    },
                },
                "edges": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string"},
                            "source": {"type": "string"},
                            "target": {"type": "string"},
                            "label": {"type": "string"},
                        },
                        "required": ["source", "target"],
                    },
                },
            },
            "required": ["title", "domain", "nodes", "edges"],
        },
    }


def _hydrate_workflow(
    raw: dict,
    request: WorkflowGenerateRequest,
    components: List[ComponentDefinition],
    handlers: List[HandlerDefinition],
) -> WorkflowDefinition:
    component_map = {component.type: component for component in components}
    handler_map = {handler.handler: handler for handler in handlers}
    nodes_payload = raw.get("nodes", [])
    hydrated_nodes: List[WorkflowNode] = []
    for index, raw_node in enumerate(nodes_payload):
        component_type = raw_node.get("componentType") or raw_node.get("ui", {}).get("componentType") or components[0].type
        component = component_map.get(component_type, components[0])
        behavior_payload = raw_node.get("behavior", {})
        handler_id = behavior_payload.get("handler") or handlers[0].handler
        handler = handler_map.get(handler_id, handlers[0])
        props = component.default_props.copy()
        props.update(raw_node.get("ui", {}).get("props", {}))
        node_kwargs = {}
        if raw_node.get("id"):
            node_kwargs["id"] = raw_node["id"]
        hydrated_nodes.append(
            WorkflowNode(
                type=raw_node.get("type") or component.type,
                name=raw_node.get("name") or f"Step {index + 1}",
                description=raw_node.get("description") or component.description,
                ui=WorkflowNodeUI(componentType=component.type, props=props),
                behavior=WorkflowNodeBehavior(kind=handler.kind, handler=handler.handler),
                inputs=raw_node.get("inputs", []),
                outputs=raw_node.get("outputs", []),
                **node_kwargs,
            )
        )

    if not hydrated_nodes:
        raise ValueError("LLM response did not include any nodes")

    edges_payload = raw.get("edges") or [
        {"source": hydrated_nodes[i].id, "target": hydrated_nodes[i + 1].id}
        for i in range(len(hydrated_nodes) - 1)
    ]
    hydrated_edges = [
        WorkflowEdge(
            id=edge.get("id"),
            source=edge["source"],
            target=edge["target"],
            label=edge.get("label"),
        )
        for edge in edges_payload
    ]

    return WorkflowDefinition(
        title=raw.get("title") or f"{request.domain} Workflow",
        domain=raw.get("domain") or request.domain,
        intent=request.intent,
        nodes=hydrated_nodes,
        edges=hydrated_edges,
    )
