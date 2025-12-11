from agent_framework import AIFunction

from tools import RagExtractionTool
from models.tool_call_dto import PdfExtractionToolCallDto, ProcessFileToolCallDto
from tools import ProcessInputFile
from agent_logger import LoggedAIFunction

RagExtractionAITool = LoggedAIFunction(
    func=RagExtractionTool.extract_pdf,
    name="RagExtractionAITool",
    description="Extract text from a Azure Blob Storage URL and return page-level text items.",
    input_model=PdfExtractionToolCallDto
)

SupervisorAgentAITool = AIFunction(
    func=ProcessInputFile.process_file,  
    name="SupervisorAgentAITool",
    description="Process an uploaded document by storing it in Azure Blob Storage.",
    input_model=ProcessFileToolCallDto
)