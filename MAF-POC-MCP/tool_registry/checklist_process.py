from agent_framework import AIFunction
from tools.checklist_process import  ChecklistProcessor
from models.tool_call_dto import ChecklistProcessingToolCallDto,ChecklistBlockGroupsToolCallDto
from agent_logger import LoggedAIFunction

# ChecklistProcessAITool = LoggedAIFunction(
#     func=ChecklistProcessor.process_checklist,
#     name="ChecklistProcessAITool",
#     description="Retreive answers from index and answer the checklist questions based on the provided configuration and request ID",
#     input_model=ChecklistProcessingToolCallDto
# )
# ChecklistProcessAITool = LoggedAIFunction(
#     func=ChecklistProcessor.process_checklist_in_parallel,
#     name="ChecklistProcessAITool",
#     description="Retreive answers from index and answer the checklist questions based on the provided configuration and request ID",
#     input_model=ChecklistProcessingToolCallDto
# )

ChecklistLoadAITool = LoggedAIFunction(
    func=ChecklistProcessor.process_checklist_in_parallel,
    name="ChecklistLoadAITool",
    description="Load checklist block groups from the specified blob storage configuration",
    input_model=ChecklistProcessingToolCallDto
)
