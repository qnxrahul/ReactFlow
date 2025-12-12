import type { WorkflowCatalogItem, WorkflowExecutionResponse, WorkflowExecutionStep } from '../workflows/types'

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

type StreamCallbacks = {
  signal?: AbortSignal
  onStep?: (step: WorkflowExecutionStep) => void
}

export async function streamMafWorkflowExecution(
  workflowId: string,
  payload: { requestId?: string; input?: string; context?: Record<string, unknown> } = {},
  callbacks: StreamCallbacks = {},
): Promise<void> {
  const res = await fetch(`${API_BASE}/workflows/catalog/maf/${workflowId}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(payload),
    signal: callbacks.signal,
  })
  if (!res.ok || !res.body) {
    const message = await res.text()
    throw new Error(message || `Stream failed with status ${res.status}`)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let delimiterIndex = buffer.indexOf('\n\n')
      while (delimiterIndex !== -1) {
        const rawEvent = buffer.slice(0, delimiterIndex)
        buffer = buffer.slice(delimiterIndex + 2)
        try {
          handleSseChunk(rawEvent, callbacks)
        } catch (error) {
          await reader.cancel()
          throw error
        }
        delimiterIndex = buffer.indexOf('\n\n')
      }
    }
  } finally {
    reader.releaseLock()
  }
}

function handleSseChunk(raw: string, callbacks: StreamCallbacks) {
  if (!raw.trim()) return
  const lines = raw.split('\n')
  let eventType = 'message'
  let data = ''
  for (const line of lines) {
    if (line.startsWith('event:')) {
      eventType = line.slice(6).trim()
    } else if (line.startsWith('data:')) {
      data += line.slice(5).trim()
    }
  }
  if (!data) return
  if (eventType === 'message' || eventType === 'step') {
    try {
      const parsed = JSON.parse(data) as WorkflowExecutionStep
      callbacks.onStep?.(parsed)
    } catch (error) {
      console.error('Failed to parse stream step', error)
    }
  } else if (eventType === 'error') {
    try {
      const parsed = JSON.parse(data) as { message?: string }
      throw new Error(parsed.message || 'MAF workflow stream error')
    } catch {
      throw new Error('MAF workflow stream error')
    }
  }
}
