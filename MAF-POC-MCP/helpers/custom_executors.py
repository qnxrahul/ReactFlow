from  agent_framework import Executor, WorkflowContext, handler
# from models.tool_call_dto import ExtractionAgentExecutorToolCallDto

# class DocumentProcessor(Executor):
#     """Executor to process an uploaded document."""

#     @handler
#     async def run(
#         self, 
#         input: ExtractionAgentExecutorToolCallDto, 
#         ctx: WorkflowContext[ExtractionAgentExecutorToolCallDto]
#     ) -> None:
#         # Example processing: just report file info and content length
#         file_info = (
#             f"Received file '{input.file_name}' "
#             f"of type '{input.mime_type or 'unknown'}' with size {len(input.file_content)} bytes."
#         )
#         # Yield output back to the workflow
#         await ctx.yield_output(file_info)