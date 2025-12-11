# from agent_framework import AIFunction

# from models.tool_call_dto import ChunkRetrievalToolCallDto
# from tools import CosmosChunkRetrievalTool

# RetrieveChunksTool = AIFunction(
#     func=CosmosChunkRetrievalTool.fetch_chunks,
#     name="RetrieveChunksTool",
#     description="Retrieve chunks from Cosmos DB based on the provided configuration and request ID",
#     input_model=ChunkRetrievalToolCallDto
# )