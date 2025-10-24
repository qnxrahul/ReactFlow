import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'

const app = express()
app.use(express.json({ limit: '1mb' }))
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',').map(s => s.trim()) || true }))

const BASE = (process.env.FAST_AGENT_BASE_URL || 'https://fast-agent.ai').replace(/\/$/, '')
const KEY = process.env.FAST_AGENT_API_KEY || ''

app.get('/health', (_req, res) => res.json({ ok: true }))

app.post('/api/agent/run', async (req, res) => {
  if (!KEY) {
    return res.status(501).json({ error: 'FAST_AGENT_API_KEY not configured' })
  }
  const { nodeType, input, context } = req.body || {}
  try {
    const upstream = await fetch(`${BASE}/api/agent/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${KEY}`,
      },
      body: JSON.stringify({ nodeType, input, context }),
    })
    const text = await upstream.text()
    let data: any
    try { data = JSON.parse(text) } catch { data = { output: text } }
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: data?.error || 'Upstream error', data })
    }
    return res.json(data)
  } catch (e: any) {
    return res.status(500).json({ error: 'Proxy call failed', detail: String(e?.message || e) })
  }
})

const port = Number(process.env.PORT || 4000)
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`fast-agent-server listening on :${port}`)
})
