import { useCallback, useMemo, useState } from 'react'
import { generateWorkflow, runWorkflowNode } from '../../services/workflowsApi'
import type { GenerateWorkflowPayload, WorkflowDefinition, WorkflowNode } from '../types'

type WorkflowState = {
  definition: WorkflowDefinition | null
  nodes: WorkflowNode[]
}

type RuntimeMap = Record<string, WorkflowNode['runtime']>

export function useDynamicWorkflow() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<WorkflowState>({ definition: null, nodes: [] })
  const [runtime, setRuntime] = useState<RuntimeMap>({})

  const applyDefinition = useCallback(
    (definition: WorkflowDefinition | null) => {
      if (!definition) {
        setState({ definition: null, nodes: [] })
        setRuntime({})
        return null
      }
      const enrichedNodes = definition.nodes.map((node) => ({
        ...node,
        runtime: runtime[node.id] ?? { status: 'idle' as const },
      }))
      const nextRuntime: RuntimeMap = {}
      enrichedNodes.forEach((node) => {
        nextRuntime[node.id] = node.runtime ?? { status: 'idle' as const }
      })
      setState({ definition, nodes: enrichedNodes })
      setRuntime(nextRuntime)
      return definition
    },
    [runtime],
  )

  const generate = useCallback(async (payload: GenerateWorkflowPayload) => {
    setLoading(true)
    setError(null)
    try {
      const workflow = await generateWorkflow(payload)
      applyDefinition(workflow)
      return workflow
    } catch (err) {
      setError((err as Error).message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [applyDefinition])

  const runNode = useCallback(
    async (nodeId: string) => {
      if (!state.definition) return null
      setRuntime((prev) => ({
        ...prev,
        [nodeId]: { ...(prev[nodeId] ?? { status: 'idle' }), status: 'running' },
      }))
      try {
        const result = await runWorkflowNode(state.definition.id, nodeId)
        setRuntime((prev) => ({
          ...prev,
          [nodeId]: {
            status: result.status,
            output: result.output,
            lastRunAt: result.lastRunAt,
          },
        }))
        return result
      } catch (err) {
        setRuntime((prev) => ({
          ...prev,
          [nodeId]: { status: 'error', output: (err as Error).message },
        }))
        throw err
      }
    },
    [state.definition],
  )

  const nodesWithRuntime = useMemo(() => {
    return state.nodes.map((node) => ({
      ...node,
      runtime: runtime[node.id] ?? { status: 'idle' as const },
    }))
  }, [state.nodes, runtime])

  return {
    loading,
    error,
    definition: state.definition,
    nodes: nodesWithRuntime,
    edges: state.definition?.edges ?? [],
    generate,
    runNode,
    applyDefinition,
  }
}
