

from models.dto import RagRetrievalDto
from agent_framework import ChatAgent
from agent_framework.azure import AzureOpenAIChatClient

from tool_registry.sample import ParallelTools


def run_parallel_agents():
    
    
    openai_client = AzureOpenAIChatClient(
        api_key="caf461635bc647d5907697642ff27d26",
        endpoint="https://kpmgchatgptpoc.openai.azure.com",
        deployment_name="gpt-4o-2",
        api_version="2024-08-01-preview"
    )
    checklist_agent = ChatAgent(
        chat_client=openai_client,
        instructions=(
            "You are a Parallel Agent. Your task is to run multiple agents in parallel to perform various tasks efficiently."
            "\n1. Use the ParallelTools to execute multiple agents concurrently."
            "\n2. Ensure that each agent runs independently and returns its results."
            "\n3. Collect and aggregate the results from all agents."
            "\n4. Provide a comprehensive summary of the outcomes from the parallel execution."
            "\nThe tool_args will contain all necessary configurations for running the parallel agents."
        ),
        tools=[ParallelTools],
        name="ChecklistAgent"
    )
    
    return checklist_agent