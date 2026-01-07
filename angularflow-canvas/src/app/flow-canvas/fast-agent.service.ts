import { Injectable } from '@angular/core'

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

type Env = {
  FAST_AGENT_BASE_URL?: string
  FAST_AGENT_API_KEY?: string
  FAST_AGENT_AGENT_ID?: string
  FAST_AGENT_RUN_PATH?: string
  FAST_AGENT_FORCE_NETWORK?: string
}

function readEnv(): Env {
  const anyGlobal = globalThis as unknown as { __env?: Env }
  return anyGlobal.__env ?? {}
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

@Injectable({ providedIn: 'root' })
export class FastAgentService {
  private didWarnMock = false

  async runNode(params: RunNodeParams): Promise<RunNodeResult> {
    const env = readEnv()
    const forceNetwork = (env.FAST_AGENT_FORCE_NETWORK ?? '').toLowerCase() === 'true'
    const baseUrl = (env.FAST_AGENT_BASE_URL ?? '').trim()

    if (!baseUrl) {
      if (forceNetwork) {
        throw new Error('FAST_AGENT_BASE_URL is not set but FAST_AGENT_FORCE_NETWORK=true')
      }
      if (!this.didWarnMock) {
        // eslint-disable-next-line no-console
        console.warn('[fastAgent] No FAST_AGENT_BASE_URL set; using mock responses')
        this.didWarnMock = true
      }
      return this.simulateRun(params)
    }

    const urlRoot = baseUrl.replace(/\/$/, '')
    const apiKey = (env.FAST_AGENT_API_KEY ?? '').trim() || undefined
    const agentId = (env.FAST_AGENT_AGENT_ID ?? '').trim() || undefined
    const overridePath = (env.FAST_AGENT_RUN_PATH ?? '').trim() || undefined

    try {
      const candidates: string[] = []
      if (overridePath) {
        if (agentId) candidates.push(urlRoot + overridePath.replace(':id', agentId))
        candidates.push(urlRoot + overridePath)
      } else if (agentId) {
        candidates.push(`${urlRoot}/api/v1/agents/${agentId}/run`)
        candidates.push(`${urlRoot}/agents/${agentId}/run`)
        candidates.push(`${urlRoot}/api/agents/${agentId}/run`)
      }
      candidates.push(`${urlRoot}/api/agent/run`)

      const payload: Record<string, unknown> = agentId
        ? { input: params.input, context: params.context }
        : { nodeType: params.type, input: params.input, context: params.context }

      for (const runUrl of candidates) {
        const res = await fetch(runUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify(payload),
          signal: params.signal,
        })

        if (res.status === 404 || res.status === 405) continue
        if (!res.ok) return this.simulateRun(params)

        const text = await res.text()
        let json: Record<string, unknown>
        try {
          json = JSON.parse(text)
        } catch {
          json = { output: text }
        }

        const output = typeof json.output === 'string' ? json.output : JSON.stringify(json)
        return { output, data: json }
      }

      return this.simulateRun(params)
    } catch {
      return this.simulateRun(params)
    }
  }

  private titleCase(s: string) {
    return s ? s[0].toUpperCase() + s.slice(1) : s
  }

  private async simulateRun(params: RunNodeParams): Promise<RunNodeResult> {
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
        return { output: `${this.titleCase(t)} completed successfully.` }
    }
  }
}

