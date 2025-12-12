import type { WorkflowCatalogItem, WorkflowExecutionResponse } from '../workflows/types'

const API_BASE = (import.meta.env.VITE_WORKSPACE_API_URL as string | undefined)?.replace(/\/+$/, '') || 'http://localhost:9000'

async function handle<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with status ${response.status}`)
  }
  return (await response.json()) as T
}

type WorkflowCatalogFilters = {
  domain?: string
  intent?: string
  query?: string
}

export async function fetchMafWorkflowCatalog(filters: WorkflowCatalogFilters = {}): Promise<WorkflowCatalogItem[]> {
  const params = new URLSearchParams()
  if (filters.domain?.trim()) params.set('domain', filters.domain.trim())
  if (filters.intent?.trim()) params.set('intent', filters.intent.trim())
  if (filters.query?.trim()) params.set('query', filters.query.trim())
  const qs = params.toString()
  const res = await fetch(`${API_BASE}/workflows/catalog/maf${qs ? `?${qs}` : ''}`)
  const data = await handle<{ workflows?: WorkflowCatalogItem[] }>(res)
  return data.workflows ?? []
}

export async function executeMafWorkflow(
  workflowId: string,
  payload: { requestId?: string; input?: string; context?: Record<string, unknown> } = {},
): Promise<WorkflowExecutionResponse> {
  const res = await fetch(`${API_BASE}/workflows/catalog/maf/${workflowId}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handle<WorkflowExecutionResponse>(res)
}
