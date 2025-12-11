from __future__ import annotations

from typing import Iterable, Set

from ..models_workflow import ComponentDefinition, HandlerDefinition, WorkflowDefinition


class WorkflowPolicyService:
    def __init__(self, min_nodes: int = 3, max_nodes: int = 20) -> None:
        self._min = min_nodes
        self._max = max_nodes

    def validate(
        self,
        workflow: WorkflowDefinition,
        components: Iterable[ComponentDefinition],
        handlers: Iterable[HandlerDefinition],
        *,
        allow_small_workflows: bool = False,
    ) -> None:
        if not allow_small_workflows and not (self._min <= len(workflow.nodes) <= self._max):
            raise ValueError(f"Workflow must contain between {self._min} and {self._max} nodes")
        if allow_small_workflows and len(workflow.nodes) > self._max:
            raise ValueError(f"Workflow must contain between 1 and {self._max} nodes")

        component_types: Set[str] = {component.type for component in components}
        handler_ids: Set[str] = {handler.handler for handler in handlers}

        seen_node_ids = set()
        for node in workflow.nodes:
            if node.id in seen_node_ids:
                raise ValueError(f"Duplicate node id detected: {node.id}")
            seen_node_ids.add(node.id)
            component_type = node.ui.component_type
            if component_type not in component_types:
                raise ValueError(f"Node {node.id} references unknown component type '{component_type}'")
            behavior_handler = node.behavior.handler
            if behavior_handler not in handler_ids:
                raise ValueError(f"Node {node.id} references unknown handler '{behavior_handler}'")

        node_ids = {node.id for node in workflow.nodes}
        for edge in workflow.edges:
            if edge.source not in node_ids or edge.target not in node_ids:
                raise ValueError(f"Edge {edge.id} references unknown nodes")
