import type { Edge, Node } from '@xyflow/react'
import { importDocumentAnalyzerConfig, isDocumentAnalyzerConfig } from './importDocumentAnalyzerConfig'
import { getDocumentAnalyzerAgentSteps } from './documentAnalyzerStepper'

type DocumentAnalyzerConfig = Parameters<typeof importDocumentAnalyzerConfig>[0]

export type A2UIProject = {
  schema: 'a2ui.project.v1'
  title: string
  source: 'document-analyzer'
  generatedAt: string
  graph: {
    nodes: Array<
      | { id: string; kind: 'rootCard'; title: string; raw?: unknown }
      | { id: string; kind: 'agent'; title: string; subtitle?: string; raw?: unknown }
      | { id: string; kind: 'adaptiveCard'; title: string; subtitle?: string; raw?: unknown }
    >
    edges: Array<{ id: string; source: string; target: string; label?: string }>
  }
  steps: Array<{
    id: string
    title: string
    subtitle?: string
    cards: Array<{ id: string; title: string; raw: unknown }>
    dependsOn: string[]
  }>
}

function safeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

function getNodeText(node: Node): { title: string; subtitle?: string; kind?: string } {
  const data = (node.data ?? {}) as Record<string, unknown>
  return {
    title: typeof data.title === 'string' ? data.title : node.id,
    subtitle: typeof data.subtitle === 'string' ? data.subtitle : undefined,
    kind: typeof data.kind === 'string' ? data.kind : undefined,
  }
}

export function convertToA2UI(payload: unknown): A2UIProject | null {
  if (!isDocumentAnalyzerConfig(payload)) return null

  const cfg = payload as DocumentAnalyzerConfig
  const title = safeString((cfg as any)?.Name, 'A2UI project')
  const generatedAt = new Date().toISOString()

  const { nodes, edges } = importDocumentAnalyzerConfig(cfg)
  const steps = getDocumentAnalyzerAgentSteps(nodes, edges)

  const nodeById = new Map(nodes.map((n) => [n.id, n] as const))

  const dependsOnByAgentId = new Map<string, string[]>()
  for (const e of edges as Edge[]) {
    if (e.label !== 'depends') continue
    const arr = dependsOnByAgentId.get(String(e.target)) ?? []
    arr.push(String(e.source))
    dependsOnByAgentId.set(String(e.target), arr)
  }

  const cardsByAgentId = new Map<string, Array<{ id: string; title: string; raw: unknown }>>()
  for (const e of edges as Edge[]) {
    if (e.label !== 'ui') continue
    const agentId = String(e.source)
    const cardId = String(e.target)
    const cardNode = nodeById.get(cardId)
    if (!cardNode) continue
    const cardText = getNodeText(cardNode)
    const raw = (cardNode.data as any)?.raw ?? cardNode.data
    const arr = cardsByAgentId.get(agentId) ?? []
    arr.push({ id: cardId, title: cardText.title, raw })
    cardsByAgentId.set(agentId, arr)
  }

  const graphNodes: A2UIProject['graph']['nodes'] = nodes.map((n) => {
    const data = (n.data ?? {}) as Record<string, unknown>
    const text = getNodeText(n)
    const raw = isRecord(data) ? (data as any).raw : undefined
    if (text.kind === 'agent') {
      return { id: n.id, kind: 'agent', title: text.title, subtitle: text.subtitle, raw }
    }
    // Treat top-level cards as rootCard if they don't belong to an agent (no subtitle)
    if (text.kind === 'adaptive-card' && !text.subtitle) {
      return { id: n.id, kind: 'rootCard', title: text.title, raw }
    }
    return { id: n.id, kind: 'adaptiveCard', title: text.title, subtitle: text.subtitle, raw }
  })

  const graphEdges: A2UIProject['graph']['edges'] = edges.map((e) => ({
    id: e.id,
    source: String(e.source),
    target: String(e.target),
    label: typeof e.label === 'string' ? e.label : undefined,
  }))

  return {
    schema: 'a2ui.project.v1',
    title,
    source: 'document-analyzer',
    generatedAt,
    graph: { nodes: graphNodes, edges: graphEdges },
    steps: steps.map((s) => ({
      id: s.id,
      title: s.title,
      subtitle: s.subtitle,
      cards: cardsByAgentId.get(s.id) ?? [],
      dependsOn: dependsOnByAgentId.get(s.id) ?? [],
    })),
  }
}

