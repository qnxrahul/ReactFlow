export type DevUiEntityInfo = {
  id: string
  type: 'agent' | 'workflow' | string
  name: string
  description?: string | null
  tools?: Array<string | Record<string, unknown>> | null
  // workflow-only fields (only present on /info)
  workflow_dump?: Record<string, unknown> | null
  input_schema?: Record<string, unknown> | null
  start_executor_id?: string | null
}

export type DevUiEntitiesResponse = {
  entities: DevUiEntityInfo[]
}

export type DevUiExecutorActionItem = {
  type: 'executor_action'
  id: string
  executor_id: string
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled'
  metadata?: Record<string, unknown> | null
  result?: unknown
  error?: Record<string, unknown> | null
}

type StreamCallbacks = {
  signal?: AbortSignal
  onExecutorAction?: (item: DevUiExecutorActionItem) => void
  onHilRequest?: (event: Record<string, unknown>) => void
  onTextDelta?: (delta: string) => void
}

const DEVUI_BASE =
  (import.meta.env.VITE_DEVUI_API_URL as string | undefined)?.replace(/\/+$/, '') || 'http://localhost:8002'

async function handle<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with status ${response.status}`)
  }
  return (await response.json()) as T
}

export async function fetchDevUiEntities(): Promise<DevUiEntityInfo[]> {
  const res = await fetch(`${DEVUI_BASE}/v1/entities`)
  const data = await handle<DevUiEntitiesResponse>(res)
  return data.entities ?? []
}

export async function fetchDevUiEntityInfo(entityId: string): Promise<DevUiEntityInfo> {
  const res = await fetch(`${DEVUI_BASE}/v1/entities/${encodeURIComponent(entityId)}/info`)
  return handle<DevUiEntityInfo>(res)
}

export async function streamDevUiEntityExecution(
  entityId: string,
  input: string | Record<string, unknown>,
  callbacks: StreamCallbacks = {},
): Promise<void> {
  const res = await fetch(`${DEVUI_BASE}/v1/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({
      stream: true,
      input,
      metadata: { entity_id: entityId },
    }),
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
        handleSseChunk(rawEvent, callbacks)
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
  let data = ''
  for (const line of lines) {
    if (line.startsWith('data:')) {
      data += line.slice(5).trim()
    }
  }
  if (!data) return
  if (data === '[DONE]') return

  let parsed: unknown
  try {
    parsed = JSON.parse(data)
  } catch {
    return
  }

  if (!parsed || typeof parsed !== 'object') return
  const envelope = parsed as Record<string, unknown>
  const type = typeof envelope.type === 'string' ? envelope.type : undefined
  if (type === 'response.output_item.added' || type === 'response.output_item.done') {
    const item = envelope.item as unknown
    if (item && typeof item === 'object' && (item as Record<string, unknown>).type === 'executor_action') {
      callbacks.onExecutorAction?.(item)
    }
    return
  }

  if (type === 'response.request_info.requested') {
    callbacks.onHilRequest?.(envelope)
    return
  }

  if (type === 'response.output_text.delta') {
    const delta = envelope.delta
    if (typeof delta === 'string') callbacks.onTextDelta?.(delta)
  }
}

