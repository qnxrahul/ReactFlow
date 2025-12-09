import type { ComponentDefinition, HandlerDefinition } from '../workflows/types'

const API_BASE = (import.meta.env.VITE_WORKSPACE_API_URL as string | undefined)?.replace(/\/+$/, '') || 'http://localhost:9000'

async function handle<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with status ${response.status}`)
  }
  return (await response.json()) as T
}

export type ComponentRegistryResponse = {
  components: ComponentDefinition[]
  handlers: HandlerDefinition[]
}

export async function fetchComponentRegistry(): Promise<ComponentRegistryResponse> {
  const res = await fetch(`${API_BASE}/workflows/registry`)
  return handle<ComponentRegistryResponse>(res)
}

export async function registerComponent(payload: Omit<ComponentDefinition, 'id'>): Promise<ComponentDefinition> {
  const res = await fetch(`${API_BASE}/workflows/registry/components`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handle<ComponentDefinition>(res)
}

export async function registerHandler(payload: Omit<HandlerDefinition, 'id'>): Promise<HandlerDefinition> {
  const res = await fetch(`${API_BASE}/workflows/registry/handlers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return handle<HandlerDefinition>(res)
}
