# Mapping of agent/tool names to their expected payload schemas for dynamic dispatch
from models.checklist_request import ChecklistProcessDto
from models.rag_request import RagIngestionDto, RagRetrievalDto
from models.tool_call_dto import RagToolCallDto, RagRetrievalToolCallDto, PdfExtractionToolCallDto, ChecklistProcessingToolCallDto, SuperVisorAgentPayloadDto

TOOL_PAYLOAD_SCHEMAS = {
    "ChecklistProcessingAgent": ChecklistProcessDto,
    "RagIngestionAgent": RagIngestionDto,
    "RagRetrievalAgent": RagRetrievalDto,
    "RagToolCall": RagToolCallDto,
    "RagRetrievalToolCall": RagRetrievalToolCallDto,
    "PdfExtractionToolCall": PdfExtractionToolCallDto,
    "ChecklistProcessingToolCall": ChecklistProcessingToolCallDto,
    "SuperVisorAgent": SuperVisorAgentPayloadDto,
    # Add more mappings as needed for your agents/tools
}
