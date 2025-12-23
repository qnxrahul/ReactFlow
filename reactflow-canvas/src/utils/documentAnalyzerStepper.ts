import type { Edge, Node } from '@xyflow/react'

type AnyNode = Node<Record<string, unknown>>
type AnyEdge = Edge<Record<string, unknown>>

function isAgentNode(node: Node): node is AnyNode {
  if (node.type !== 'adaptiveCard') return false
  const data = node.data as Record<string, unknown> | undefined
  return data?.kind === 'agent'
}

function getAgentMeta(node: AnyNode): { title: string; subtitle?: string } {
  const data = (node.data ?? {}) as Record<string, unknown>
  return {
    title: typeof data.title === 'string' ? data.title : node.id,
    subtitle: typeof data.subtitle === 'string' ? data.subtitle : undefined,
  }
}

export type DocumentAnalyzerAgentStep = {
  id: string
  title: string
  subtitle?: string
}

export function getDocumentAnalyzerAgentSteps(nodes: Node[], edges: Edge[]): DocumentAnalyzerAgentStep[] {
  const agents = nodes.filter(isAgentNode) as AnyNode[]
  if (agents.length === 0) return []

  const indexMap = new Map<string, number>()
  agents.forEach((n, idx) => indexMap.set(n.id, idx))

  const agentIds = agents.map((n) => n.id)
  const agentIdSet = new Set(agentIds)

  const indegree = new Map<string, number>()
  const out = new Map<string, string[]>()
  for (const id of agentIds) {
    indegree.set(id, 0)
    out.set(id, [])
  }

  for (const e of edges as AnyEdge[]) {
    if (e.label !== 'depends') continue
    const src = String(e.source)
    const tgt = String(e.target)
    if (!agentIdSet.has(src) || !agentIdSet.has(tgt)) continue
    out.get(src)?.push(tgt)
    indegree.set(tgt, (indegree.get(tgt) ?? 0) + 1)
  }

  const stableSortByOriginal = (a: string, b: string) => (indexMap.get(a) ?? 0) - (indexMap.get(b) ?? 0)
  const queue = agentIds.filter((id) => (indegree.get(id) ?? 0) === 0).sort(stableSortByOriginal)

  const ordered: string[] = []
  while (queue.length > 0) {
    const id = queue.shift()!
    ordered.push(id)
    const targets = out.get(id) ?? []
    for (const t of targets) {
      indegree.set(t, (indegree.get(t) ?? 0) - 1)
      if ((indegree.get(t) ?? 0) === 0) {
        queue.push(t)
        queue.sort(stableSortByOriginal)
      }
    }
  }

  // Cycle fallback: append remaining agents in original order.
  if (ordered.length !== agentIds.length) {
    const remaining = agentIds.filter((id) => !ordered.includes(id))
    ordered.push(...remaining.sort(stableSortByOriginal))
  }

  const metaById = new Map(agents.map((n) => [n.id, getAgentMeta(n)] as const))
  return ordered.map((id) => {
    const meta = metaById.get(id)
    return { id, title: meta?.title ?? id, subtitle: meta?.subtitle }
  })
}

export function applyDocumentAnalyzerStepVisibility(
  nodes: Node[],
  edges: Edge[],
  activeAgentId: string | null,
  showAll: boolean,
): { nodes: Node[]; edges: Edge[] } {
  if (showAll || !activeAgentId) {
    return {
      nodes: nodes.map((n) => ({ ...n, hidden: false })),
      edges: edges.map((e) => ({ ...e, hidden: false })),
    }
  }

  const visible = new Set<string>()
  visible.add(activeAgentId)

  for (const e of edges as AnyEdge[]) {
    const src = String(e.source)
    const tgt = String(e.target)
    if (e.label === 'ui' && src === activeAgentId) {
      visible.add(tgt)
    }
    if (e.label === 'starts' && tgt === activeAgentId) {
      visible.add(src)
    }
  }

  const nextNodes = nodes.map((n) => ({ ...n, hidden: !visible.has(n.id) }))
  const nextEdges = edges.map((e) => {
    const shouldShow = visible.has(String(e.source)) && visible.has(String(e.target))
    return { ...e, hidden: !shouldShow }
  })

  return { nodes: nextNodes, edges: nextEdges }
}

