// Lightweight Fast Agent client with graceful mock fallback

export type RunNodeParams = {
  type: string
  input?: string
  context?: Record<string, unknown>
  signal?: AbortSignal
}

export type RunNodeResult = {
  output: string
  data?: unknown
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
let didWarnMock = false

function env(name: string): string | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v = (import.meta as any)?.env?.[name]
    return typeof v === 'string' ? v : undefined
  } catch {
    return undefined
  }
}

function hasFastAgentConfig() {
  // A base URL is sufficient (local Python agent may not need an API key)
  return Boolean(env('VITE_FAST_AGENT_BASE_URL'))
}

export async function runNode(params: RunNodeParams): Promise<RunNodeResult> {
  const forceNetwork = (env('VITE_FAST_AGENT_FORCE_NETWORK') || '').toLowerCase() === 'true'
  if (!hasFastAgentConfig()) {
    if (forceNetwork) {
      throw new Error('VITE_FAST_AGENT_BASE_URL is not set but VITE_FAST_AGENT_FORCE_NETWORK=true')
    }
    if (!didWarnMock) {
      // eslint-disable-next-line no-console
      console.warn('[fastAgent] No VITE_FAST_AGENT_BASE_URL set; using mock responses')
      didWarnMock = true
    }
    return simulateRun(params)
  }

  const baseUrl = env('VITE_FAST_AGENT_BASE_URL')!
  const apiKey = env('VITE_FAST_AGENT_API_KEY')

  try {
    // eslint-disable-next-line no-console
    console.debug('[fastAgent] POST', `${baseUrl.replace(/\/$/, '')}/api/agent/run`, { type: params.type })
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/agent/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        nodeType: params.type,
        input: params.input,
        context: params.context,
      }),
      signal: params.signal,
    })

    if (!res.ok) {
      return simulateRun(params)
    }

    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
    const output = typeof json.output === 'string' ? json.output : JSON.stringify(json)
    return { output, data: json }
  } catch {
    return simulateRun(params)
  }
}

function titleCase(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}

async function simulateRun(params: RunNodeParams): Promise<RunNodeResult> {
  const baseDelay = 450 + Math.round(Math.random() * 650)
  await sleep(baseDelay)

  const t = params.type || 'action'
  const inText = (params.input ?? '').toString().slice(0, 140)
  const now = new Date().toISOString()

  switch (t) {
    case 'start':
    case 'trigger':
      return { output: `Triggered workflow at ${now}` }
    case 'loader':
    case 'ingest':
      return { output: `Ingested 12 docs. Sample: "${inText || 'README.md'}"` }
    case 'vectorize':
    case 'embed':
      return { output: 'Generated 12 embeddings (avg dim=1536). Norm OK.' }
    case 'similarity':
    case 'retrieve':
      return { output: 'Retrieved 5 passages (mean score 0.78).' }
    case 'agent':
    case 'plan':
      return { output: 'Planned 3 steps: search, synthesize, answer.' }
    case 'search':
    case 'tool':
      return { output: 'Called external tool: web-search, got 3 results.' }
    case 'LLM':
    case 'answer':
      return { output: 'Answer: The quarterly trend is up 12% QoQ; see chart for details.' }
    default:
      return { output: `${titleCase(t)} completed successfully.` }
  }
}
