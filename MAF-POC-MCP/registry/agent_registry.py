
from agents.extraction_agent import rag_extraction_agent
from agents.ingestion_agent import rag_ingestion_agent
# from agents.checklist_agent import checklist_processing_agent
AGENT_REGISTRY = {
    "extraction_agent": rag_extraction_agent,
    "rag_agent": rag_ingestion_agent,
    # "checklist_process_agent": checklist_processing_agent
}   