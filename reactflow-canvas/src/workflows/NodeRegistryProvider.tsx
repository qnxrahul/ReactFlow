import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { fetchComponentRegistry } from '../services/componentRegistryApi'
import type { ComponentDefinition } from './types'
import { getBaseRenderer, getFallbackRenderer, type NodeRenderer } from './registry'

export type NodeRegistry = {
  resolve: (componentType: string) => NodeRenderer
  components: ComponentDefinition[]
}

const NodeRegistryContext = createContext<NodeRegistry | null>(null)

function buildRendererMap(definitions: ComponentDefinition[]): Map<string, NodeRenderer> {
  const map = new Map<string, NodeRenderer>()
  ;['agentCard', 'evidenceCard', 'decisionCard', 'reportCard'].forEach((type) => {
    const base = getBaseRenderer(type)
    map.set(type, base)
  })

  definitions.forEach((definition) => {
    const base = getBaseRenderer(definition.baseRenderer) ?? getFallbackRenderer(definition.type)
    const wrapped: NodeRenderer = ({ node, onRun, inputs, onInputChange }) => {
      const mergedNode = {
        ...node,
        ui: {
          componentType: definition.type,
          props: {
            ...(definition.defaultProps ?? {}),
            ...(node.ui?.props ?? {}),
          },
        },
      }
      return base({ node: mergedNode, onRun, inputs, onInputChange })
    }
    map.set(definition.type, wrapped)
  })

  return map
}

export function NodeRegistryProvider({ children }: { children: ReactNode }) {
  const [definitions, setDefinitions] = useState<ComponentDefinition[]>([])

  useEffect(() => {
    let cancelled = false
    fetchComponentRegistry()
      .then((res) => {
        if (!cancelled) setDefinitions(res.components)
      })
      .catch(() => {
        /* swallow for now */
      })
    return () => {
      cancelled = true
    }
  }, [])

  const resolver = useMemo(() => buildRendererMap(definitions), [definitions])

  const value = useMemo<NodeRegistry>(
    () => ({
      resolve: (type: string) => resolver.get(type) ?? getFallbackRenderer(type),
      components: definitions,
    }),
    [definitions, resolver],
  )

  return <NodeRegistryContext.Provider value={value}>{children}</NodeRegistryContext.Provider>
}

export function useNodeRegistry(): NodeRegistry {
  const ctx = useContext(NodeRegistryContext)
  if (!ctx) {
    const fallbackMap = buildRendererMap([])
    return {
      resolve: (type: string) => fallbackMap.get(type) ?? getFallbackRenderer(type),
      components: [],
    }
  }
  return ctx
}
