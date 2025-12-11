from service.openai_client_service import OpenAIClientService
from registry.tool_schema_registry import TOOL_PAYLOAD_SCHEMAS

# Create the AI-powered main agent using the singleton client
from registry.agent_registry import AGENT_REGISTRY
from agent_framework import ChatAgent
def get_tools():
    return list(AGENT_REGISTRY.values())
   
# When creating main_agent, pass the tools created with the payload


async def run_main_agent(payload):
    from models.checklist_request import ChecklistRequest
    # Ensure payload is a ChecklistRequest instance
    if isinstance(payload, dict):
        payload = ChecklistRequest(**payload)
    # Pass only the OpenAI config to get_client
    main_agent = get_main_agent(payload)
    result = await main_agent.run(str(payload))
    return result.text

def get_main_agent(payload):
    from models.checklist_request import ChecklistRequest
    # Ensure payload is a ChecklistRequest instance
    if isinstance(payload, dict):
        payload = ChecklistRequest(**payload)
    main_agent = ChatAgent(
        chat_client=OpenAIClientService.get_client(payload),
        name="MainAgent",
        description="An AI-powered agent that orchestrates checklist answering using available tools.",
        instructions=(
            "You are an intelligent orchestrator. "
            "Always use the available tools to answer checklist questions and process files as needed. "
            "Do not just plan or explain steps—invoke the tools directly and return their results. "
            "When invoking tools, always provide arguments as fully-typed objects (not plain dicts or raw JSON). "
            "Ensure all nested configuration fields (such as blob_config, search_config, etc.) are passed as typed objects, not as dictionaries. "
            "Do not pass raw JSON strings or dicts—use the correct data models for each tool. "
            "If a file has already been extracted, use the extraction_blob_url field to skip extraction. "
            "If you encounter validation errors, check that all arguments match the expected schema and types. "
            f"Refer to the {TOOL_PAYLOAD_SCHEMAS} registry to ensure correct payload typing for each tool."
        ),
        tools=get_tools()
    )
    
    return main_agent

