import { HttpAgent } from '@ag-ui/client'

const AGENT_URL = import.meta.env.VITE_AGUI_AGENT_URL as string | undefined
const AGENT_ID = (import.meta.env.VITE_AGUI_AGENT_ID as string | undefined) ?? 'reactflow-agent'
const THREAD_PREFIX = (import.meta.env.VITE_AGUI_THREAD_PREFIX as string | undefined) ?? 'reactflow'

const hasCrypto = typeof globalThis !== 'undefined' && typeof globalThis.crypto !== 'undefined'

export const isAguiConfigured = Boolean(AGENT_URL)

export function createThreadId(seed?: string) {
  if (seed) return seed
  const randomSegment = hasCrypto && 'randomUUID' in globalThis.crypto
    ? globalThis.crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `${THREAD_PREFIX}-${randomSegment}`
}

export function createAgentClient(threadId?: string) {
  if (!AGENT_URL) {
    return null
  }

  return new HttpAgent({
    url: AGENT_URL,
    agentId: AGENT_ID,
    threadId: threadId ?? createThreadId(),
  })
}
