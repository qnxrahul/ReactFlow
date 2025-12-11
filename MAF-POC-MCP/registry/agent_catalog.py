from __future__ import annotations

from typing import Dict, List

from pydantic import BaseModel, Field


class AgentCatalogItem(BaseModel):
    id: str
    name: str
    handler: str
    description: str
    domains: List[str] = Field(default_factory=list)
    intent_tags: List[str] = Field(default_factory=list, alias="intentTags")
    capabilities: List[str] = Field(default_factory=list)
    mcp_tool: str = Field(alias="mcpTool")
    default_params: Dict[str, object] = Field(default_factory=dict, alias="defaultParams")
    is_global: bool = Field(default=False, alias="isGlobal")

    class Config:
        populate_by_name = True


def _agent(
    *,
    id: str,
    name: str,
    handler: str,
    description: str,
    domains: List[str],
    intent_tags: List[str],
    capabilities: List[str],
    mcp_tool: str,
    default_params: Dict[str, object] | None = None,
    is_global: bool = False,
) -> AgentCatalogItem:
    return AgentCatalogItem(
        id=id,
        name=name,
        handler=handler,
        description=description,
        domains=domains,
        intentTags=intent_tags,
        capabilities=capabilities,
        mcpTool=mcp_tool,
        defaultParams=default_params or {},
        isGlobal=is_global,
    )


CATALOG: Dict[str, AgentCatalogItem] = {
    agent.id: agent
    for agent in [
        _agent(
            id="maf-supervisor",
            name="Checklist Supervisor",
            handler="maf.supervisor",
            description="Coordinates extraction, ingestion, and checklist answering within Dev UI workflows.",
            domains=["Audit"],
            intent_tags=["workflow coordination", "checklist"],
            capabilities=["coordination", "handoff"],
            mcp_tool="maf_supervisor",
        ),
        _agent(
            id="maf-rag-extraction",
            name="RAG Extraction Agent",
            handler="maf.rag.extraction",
            description="Runs Azure Document Intelligence to extract structure from uploaded PDFs.",
            domains=["Audit"],
            intent_tags=["extraction", "documents"],
            capabilities=["extraction", "document-intelligence"],
            mcp_tool="maf_rag_extraction",
        ),
        _agent(
            id="maf-rag-ingestion",
            name="RAG Ingestion Agent",
            handler="maf.rag.ingestion",
            description="Chunks, embeds, and indexes extracted text into search services.",
            domains=["Audit"],
            intent_tags=["ingestion", "rag"],
            capabilities=["vectorization", "indexing"],
            mcp_tool="maf_rag_ingestion",
        ),
        _agent(
            id="maf-checklist-processor",
            name="Checklist Processor",
            handler="maf.checklist.processor",
            description="Fills checklist responses with citations using Dev UI tooling.",
            domains=["Audit"],
            intent_tags=["checklist"],
            capabilities=["reasoning", "documentation"],
            mcp_tool="maf_checklist_processor",
        ),
        _agent(
            id="maf-supervisor-chain",
            name="Checklist Supervisor (Sequential)",
            handler="maf.supervisor.chain",
            description="Sequential workflow coordinator from build_checklist_workflow_new().",
            domains=["Audit"],
            intent_tags=["workflow coordination", "sequential"],
            capabilities=["coordination"],
            mcp_tool="maf_supervisor_chain",
        ),
        _agent(
            id="maf-rag-extraction-chain",
            name="Sequential RAG Extraction",
            handler="maf.rag.extraction.chain",
            description="Extraction step tailored for the sequential builder workflow.",
            domains=["Audit"],
            intent_tags=["extraction"],
            capabilities=["document-intelligence"],
            mcp_tool="maf_rag_extraction_chain",
        ),
        _agent(
            id="maf-rag-ingestion-chain",
            name="Sequential RAG Ingestion",
            handler="maf.rag.ingestion.chain",
            description="Ingestion/indexing step from build_checklist_workflow_new().",
            domains=["Audit"],
            intent_tags=["ingestion"],
            capabilities=["vectorization"],
            mcp_tool="maf_rag_ingestion_chain",
        ),
        _agent(
            id="maf-checklist-chain",
            name="Sequential Checklist Agent",
            handler="maf.checklist.chain",
            description="Checklist answering agent used in the sequential Dev UI workflow.",
            domains=["Audit"],
            intent_tags=["checklist"],
            capabilities=["reasoning"],
            mcp_tool="maf_checklist_chain",
        ),
        _agent(
            id="maf-supervisor-standalone",
            name="Supervisor Agent (Standalone)",
            handler="maf.supervisor.agent",
            description="Standalone supervisor callable via run_supervisor_agent().",
            domains=["Audit"],
            intent_tags=["workflow coordination"],
            capabilities=["coordination"],
            mcp_tool="maf_supervisor_agent",
        ),
        _agent(
            id="maf-mcp-supervisor",
            name="MCP Supervisor",
            handler="maf.mcp.supervisor",
            description="Supervises MCP Swagger server/client agents.",
            domains=["Platform"],
            intent_tags=["mcp", "orchestration"],
            capabilities=["mcp"],
            mcp_tool="maf_mcp_supervisor",
        ),
    ]
}


def list_agents() -> List[AgentCatalogItem]:
    return list(CATALOG.values())
