from tools.sample import run_parallel_agents
from agent_framework import AIFunction
from agent_logger import LoggedAIFunction

ParallelTools = LoggedAIFunction(
    func=run_parallel_agents,
    name="Checklistprocessingtool",
    # description="Retrieve chunks from blob storage, create embeddings, and index them into the search service"
    # input_model=RagToolCallDto
)