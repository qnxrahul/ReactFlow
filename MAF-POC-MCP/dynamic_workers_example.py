from math import ceil
from agent_framework import WorkflowBuilder, AgentExecutor

def build_dynamic_worker_flow(items, chunk_size=500):
    splitter = AgentExecutor("splitter")
    worker_count = max(1, ceil(len(items) / chunk_size))
    workers = [AgentExecutor(f"worker-{i}") for i in range(worker_count)]

    builder = WorkflowBuilder()
    builder.set_start_executor(splitter)
    builder.add_fan_out_edges(splitter, workers)
    return builder.build()
