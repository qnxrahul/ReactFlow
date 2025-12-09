import type { AgentDefinition, AgentRunResponse } from '../workflows/types'

const API_BASE = (import.meta.env.VITE_WORKSPACE_API_URL as string | undefined)?.replace(/\/+$/, '') || 'http://localhost:9000'

async function handle<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with status ${response.status}`)
  }
  return (await response.json()) as T
}

export type AgentListResponse = {
  agents: AgentDefinition[]
}

export async function fetchAgents(params: { domain?: string; intent?: string } = {}): Promise<AgentDefinition[]> {
  const url = new URL(`${API_BASE}/agents/`)
  if (params.domain) url.searchParams.set('domain', params.domain)
  if (params.intent) url.searchParams.set('intent', params.intent)
  const res = await fetch(url)
  const data = await handle<AgentListResponse>(res)
  return data.agents
}

export async function runAgent(agentId: string, input?: string, context?: Record<string, unknown>): Promise<AgentRunResponse> {
  const res = await fetch(`${API_BASE}/agents/${agentId}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input, context }),
  })
  return handle<AgentRunResponse>(res)
}
