import type {
  GenerateWorkflowPayload,
  RunWorkflowNodeResponse,
  WorkflowAssistRequest,
  WorkflowAssistResponse,
  WorkflowDefinition,
} from '../workflows/types'

const API_BASE = (import.meta.env.VITE_WORKSPACE_API_URL as string | undefined)?.replace(/\/+$/, '') || 'http://localhost:9000'

async function handle<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with status ${response.status}`)
  }
  return (await response.json()) as T
}

export async function generateWorkflow(payload: GenerateWorkflowPayload): Promise<WorkflowDefinition> {
  const res = await fetch(`${API_BASE}/workflows/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handle<WorkflowDefinition>(res)
}

export async function fetchWorkflow(workflowId: string): Promise<WorkflowDefinition> {
  const res = await fetch(`${API_BASE}/workflows/${workflowId}`)
  return handle<WorkflowDefinition>(res)
}

export async function runWorkflowNode(
  workflowId: string,
  nodeId: string,
): Promise<RunWorkflowNodeResponse> {
  const res = await fetch(`${API_BASE}/workflows/${workflowId}/nodes/${nodeId}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  return handle<RunWorkflowNodeResponse>(res)
}

export async function assistWorkflow(payload: WorkflowAssistRequest): Promise<WorkflowAssistResponse> {
  const res = await fetch(`${API_BASE}/workflows/assist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handle<WorkflowAssistResponse>(res)
}
