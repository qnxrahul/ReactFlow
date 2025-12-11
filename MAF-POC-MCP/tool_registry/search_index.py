from agent_framework import AIFunction
from tools import IndexChunksTool
from models.tool_call_dto import IndexingToolCallDto

IngestChunksTool = AIFunction(
    func=IndexChunksTool.index_chunks,
    name="IngestChunksTool",
    description="Trigger the RAG ingestion workflow to index chunks into the search service pass the search configuration and extracted chunks from the previous step",
    input_model=IndexingToolCallDto
)