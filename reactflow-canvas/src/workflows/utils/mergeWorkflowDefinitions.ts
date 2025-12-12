import type { WorkflowDefinition, WorkflowEdge, WorkflowNode } from '../types'

export function mergeWorkflowDefinitions(
  base: WorkflowDefinition,
  incoming: WorkflowDefinition,
): WorkflowDefinition {
  const mergedNodes = mergeNodes(base.nodes, incoming.nodes)
  const mergedEdges = mergeEdges(base.edges, incoming.edges)
  return {
    ...base,
    ...incoming,
    nodes: mergedNodes,
    edges: mergedEdges,
    updatedAt: incoming.updatedAt ?? base.updatedAt,
  }
}

function mergeNodes(current: WorkflowNode[], incoming: WorkflowNode[]): WorkflowNode[] {
  const idxMap = new Map<string, number>()
  current.forEach((node, index) => idxMap.set(node.id, index))
  const next = [...current]
  incoming.forEach((node) => {
    const idx = idxMap.get(node.id)
    if (idx !== undefined) {
      next[idx] = node
    } else {
      next.push(node)
    }
  })
  return next
}

function mergeEdges(current: WorkflowEdge[], incoming: WorkflowEdge[]): WorkflowEdge[] {
  const idxMap = new Map<string, number>()
  current.forEach((edge, index) => idxMap.set(edge.id, index))
  const next = [...current]
  incoming.forEach((edge) => {
    const idx = idxMap.get(edge.id)
    if (idx !== undefined) {
      next[idx] = edge
    } else {
      next.push(edge)
    }
  })
  return next
}
