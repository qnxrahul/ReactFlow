

from agent_framework import AIFunction

from models.tool_call_dto import RagRetrievalToolCallDto, RagToolCallDto
from tools import RagIngestionTool
from agent_logger import LoggedAIFunction

RagIngestionAITool = LoggedAIFunction(
    func=RagIngestionTool.rag_ingestion,
    name="RagIngestionAITool",
    description="Retrieve chunks from blob storage, create embeddings, and index them into the search service",
    input_model=RagToolCallDto
)

RagRetrievalAITool = AIFunction(
    func=RagIngestionTool.rag_retrieval,
    name="RagRetrievalAITool",
    description="Retrieve relevant chunks from the search index based on the user's query",
    input_model=RagRetrievalToolCallDto
)