import type { WorkflowCatalogItem, WorkflowExecutionStep } from '../workflows/types'

const API_BASE = (import.meta.env.VITE_WORKSPACE_API_URL as string | undefined)?.replace(/\/+$/, '') || 'http://localhost:9000'

// Some backends mount MAF under `/workflows/catalog/maf/*` while the MAF-POC-MCP
// server mounts it under `/workflows/catalog/*`. We support both for compatibility.
const MAF_CATALOG_PREFIXES = ['/workflows/catalog/maf', '/workflows/catalog'] as const

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
  let lastError: Error | null = null
  for (const prefix of MAF_CATALOG_PREFIXES) {
    const url = `${API_BASE}${prefix}${qs ? `?${qs}` : ''}`
    const res = await fetch(url)
    if (!res.ok) {
      lastError = new Error((await res.text()) || `Request failed with status ${res.status}`)
      continue
    }
    const data = (await res.json()) as { workflows?: WorkflowCatalogItem[] }
    return data.workflows ?? []
  }
  throw lastError ?? new Error('Unable to fetch MAF workflow catalog')
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
  let res: Response | null = null
  let lastError: Error | null = null
  for (const prefix of MAF_CATALOG_PREFIXES) {
    const url = `${API_BASE}${prefix}/${encodeURIComponent(workflowId)}/events`
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(payload),
      signal: callbacks.signal,
    })
    if (!res.ok || !res.body) {
      lastError = new Error((await res.text()) || `Stream failed with status ${res.status}`)
      res = null
      continue
    }
    break
  }

  if (!res || !res.body) {
    throw lastError ?? new Error('Unable to start MAF workflow stream')
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
