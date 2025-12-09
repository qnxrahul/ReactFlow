from __future__ import annotations

from typing import List

from ..models_workflow import WorkflowDefinition, WorkflowEdge, WorkflowGenerateRequest, WorkflowNode, WorkflowNodeBehavior, WorkflowNodeUI


class WorkflowAuthoringService:
    """Simulates an LLM-assisted workflow generator for local development."""

    @staticmethod
    def generate(request: WorkflowGenerateRequest) -> WorkflowDefinition:
        domain = request.domain.strip() or "Audit"
        base_title = request.intent.strip().title() if request.intent else f"{domain} Workflow"
        nodes: List[WorkflowNode] = [
            WorkflowNode(
                type="agent",
                name="Scope Alignment",
                description="LLM agent drafts the scope and objectives",
                ui=WorkflowNodeUI(componentType="agentCard", props={"subtitle": "Clarify scope"}),
                behavior=WorkflowNodeBehavior(kind="llm-agent", handler="openrouter.scope"),
                outputs=["scope"],
            ),
            WorkflowNode(
                type="evidence",
                name="Collect Evidence",
                description="Gather sample documentation and control evidence",
                ui=WorkflowNodeUI(componentType="evidenceCard", props={"subtitle": "Upload samples"}),
                behavior=WorkflowNodeBehavior(kind="llm-agent", handler="openrouter.collect"),
                inputs=["scope"],
                outputs=["documents"],
            ),
            WorkflowNode(
                type="analysis",
                name="Risk Assessment",
                description="Assess inherent and residual risk",
                ui=WorkflowNodeUI(componentType="agentCard", props={"subtitle": "Risk scoring"}),
                behavior=WorkflowNodeBehavior(kind="llm-agent", handler="openrouter.risk"),
                inputs=["documents"],
                outputs=["riskSummary"],
            ),
            WorkflowNode(
                type="decision",
                name="Fraud Check",
                description="Flag anomalies for review",
                ui=WorkflowNodeUI(componentType="decisionCard", props={}),
                behavior=WorkflowNodeBehavior(kind="service", handler="rules.fraud"),
                inputs=["riskSummary"],
                outputs=["decision"],
            ),
        ]

        edges = [
            WorkflowEdge(source=nodes[i].id, target=nodes[i + 1].id) for i in range(len(nodes) - 1)
        ]

        workflow = WorkflowDefinition(
            title=f"{domain} · {base_title}",
            domain=domain,
            intent=request.intent,
            nodes=nodes,
            edges=edges,
        )
        return workflow
