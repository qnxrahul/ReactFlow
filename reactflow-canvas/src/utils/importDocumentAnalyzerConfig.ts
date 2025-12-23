import type { Edge, Node } from '@xyflow/react'

type DocumentAnalyzerConfig = {
  Name?: string
  Doctype?: string
  Properties?: {
    AdaptiveCards?: unknown[]
    WizardConfig?: {
      AgentConfiguration?: {
        Agents?: unknown[]
      }
    }
  }
}

function safeId(value: string) {
  return value.replace(/[^a-zA-Z0-9:_-]/g, '_')
}

function collectFieldsFromLayout(layout: unknown): Array<{ type?: string; label?: string; name?: string }> {
  const out: Array<{ type?: string; label?: string; name?: string }> = []

  const visit = (node: unknown) => {
    if (!node) return
    if (typeof node !== 'object') return
    const obj = node as Record<string, unknown>
    const fields = obj.fields
    if (Array.isArray(fields) ) {
      for (const f of fields) {
        if (f && typeof f === 'object') {
          const fieldObj = f as Record<string, unknown>
          out.push({
            type: typeof fieldObj.type === 'string' ? fieldObj.type : undefined,
            label:
              (typeof fieldObj.label === 'string' ? fieldObj.label : undefined) ??
              (typeof fieldObj.labelname === 'string' ? fieldObj.labelname : undefined) ??
              (typeof fieldObj.displaydata === 'string' ? fieldObj.displaydata : undefined),
            name: typeof fieldObj.name === 'string' ? fieldObj.name : undefined,
          })
        }
        if (f && typeof f === 'object' && Array.isArray((f as Record<string, unknown>).fields)) {
          // nested building blocks like accordion-building-block
          visit(f)
        }
        if (f && typeof f === 'object' && Array.isArray((f as Record<string, unknown>).fieldset)) {
          for (const fs of (f as Record<string, unknown>).fieldset as unknown[]) visit(fs)
        }
      }
    }
    if (Array.isArray(obj.child)) {
      for (const c of obj.child as unknown[]) {
        if (c && typeof c === 'object') {
          const childObj = c as Record<string, unknown>
          visit(childObj.AdaptiveCardlayout ?? c)
        } else {
          visit(c)
        }
      }
    }
  }

  visit(layout)
  return out
}

export function isDocumentAnalyzerConfig(payload: unknown): payload is DocumentAnalyzerConfig {
  const cfg = payload as DocumentAnalyzerConfig
  return Boolean(
    cfg &&
      typeof cfg === 'object' &&
      cfg.Properties &&
      cfg.Properties.WizardConfig?.AgentConfiguration?.Agents &&
      Array.isArray(cfg.Properties.WizardConfig.AgentConfiguration.Agents),
  )
}

export function importDocumentAnalyzerConfig(payload: DocumentAnalyzerConfig): { nodes: Node[]; edges: Edge[] } {
  const rootCards = payload.Properties?.AdaptiveCards ?? []
  const agents = payload.Properties?.WizardConfig?.AgentConfiguration?.Agents ?? []

  const nodes: Node[] = []
  const edges: Edge[] = []

  // Root-level cards
  rootCards.forEach((card, idx) => {
    const cardObj = (card && typeof card === 'object') ? (card as Record<string, unknown>) : {}
    const key = String(cardObj.Key ?? `RootCard${idx + 1}`)
    const id = safeId(`card:${key}`)
    const layout = cardObj.layout as unknown
    const layoutAdaptive =
      layout && typeof layout === 'object'
        ? (layout as Record<string, unknown>).AdaptiveCardlayout
        : undefined
    const fields = collectFieldsFromLayout(layout ?? layoutAdaptive ?? cardObj.AdaptiveCardlayout)
    nodes.push({
      id,
      type: 'adaptiveCard',
      position: { x: 80, y: 80 + idx * 260 },
      data: {
        kind: 'adaptive-card',
        title: key,
        description: typeof cardObj.Description === 'string' ? cardObj.Description : undefined,
        raw: cardObj,
        fieldSummary: fields.slice(0, 8),
        fieldCount: fields.length,
      },
    })
  })

  // Agent nodes and their per-agent cards
  agents.forEach((agent, agentIdx) => {
    const agentObj = (agent && typeof agent === 'object') ? (agent as Record<string, unknown>) : {}
    const name = String(agentObj.Name ?? `Agent${agentIdx + 1}`)
    const displayName = String(agentObj.DisplayName ?? agentObj.Name ?? name)
    const agentId = safeId(`agent:${name}`)
    nodes.push({
      id: agentId,
      type: 'adaptiveCard',
      position: { x: 520, y: 80 + agentIdx * 220 },
      data: {
        kind: 'agent',
        title: displayName,
        subtitle: name,
        description: typeof agentObj.Description === 'string' ? agentObj.Description : undefined,
        raw: agentObj,
        toolCount: Array.isArray(agentObj.Tools) ? agentObj.Tools.length : 0,
        dependsOn: Array.isArray(agentObj.AgentsDependedOn) ? (agentObj.AgentsDependedOn as string[]) : [],
      },
    })

    // Agent -> AdaptiveCards (UI)
    const cards = Array.isArray(agentObj.AdaptiveCards) ? (agentObj.AdaptiveCards as unknown[]) : []
    cards.forEach((card, cardIdx: number) => {
      const cardObj = (card && typeof card === 'object') ? (card as Record<string, unknown>) : {}
      const key = String(cardObj.Key ?? `${name}:Card${cardIdx + 1}`)
      const cardNodeId = safeId(`card:${name}:${key}`)
      const fields = collectFieldsFromLayout(cardObj.layout ?? cardObj.AdaptiveCardlayout)
      nodes.push({
        id: cardNodeId,
        type: 'adaptiveCard',
        position: { x: 920, y: 80 + agentIdx * 220 + cardIdx * 220 },
        data: {
          kind: 'adaptive-card',
          title: key,
          subtitle: name,
          description: typeof cardObj.Description === 'string' ? cardObj.Description : undefined,
          raw: cardObj,
          fieldSummary: fields.slice(0, 8),
          fieldCount: fields.length,
        },
      })
      edges.push({
        id: safeId(`e:${agentId}->${cardNodeId}`),
        source: agentId,
        target: cardNodeId,
        label: 'ui',
      })
    })

    // Agent dependency edges
    const deps: string[] = Array.isArray(agentObj.AgentsDependedOn) ? (agentObj.AgentsDependedOn as string[]) : []
    deps.forEach((depName) => {
      const depAgentId = safeId(`agent:${String(depName)}`)
      edges.push({
        id: safeId(`e:${depAgentId}->${agentId}`),
        source: depAgentId,
        target: agentId,
        label: 'depends',
      })
    })
  })

  // Heuristic: connect first root card -> DataCollectionAgent (if present)
  if (rootCards.length > 0) {
    const firstRootObj = (rootCards[0] && typeof rootCards[0] === 'object') ? (rootCards[0] as Record<string, unknown>) : {}
    const firstRootKey = String(firstRootObj.Key ?? 'RootCard1')
    const rootNodeId = safeId(`card:${firstRootKey}`)
    const dataCollection = agents.find((a) => (a && typeof a === 'object') && String((a as Record<string, unknown>).Name) === 'DataCollectionAgent')
    if (dataCollection) {
      const targetId = safeId(`agent:DataCollectionAgent`)
      edges.push({
        id: safeId(`e:${rootNodeId}->${targetId}`),
        source: rootNodeId,
        target: targetId,
        label: 'starts',
      })
    }
  }

  return { nodes, edges }
}

