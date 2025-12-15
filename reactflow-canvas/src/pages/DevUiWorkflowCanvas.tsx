import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import '@xyflow/react/dist/base.css'
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Edge,
  type NodeTypes,
} from '@xyflow/react'
import { nanoid } from 'nanoid'

import { DevUiAgentToolbar } from '../components/DevUiAgentToolbar'
import { DevUiWorkflowToolbar } from '../components/DevUiWorkflowToolbar'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import {
  fetchDevUiEntities,
  fetchDevUiEntityInfo,
  streamDevUiEntityExecution,
  type DevUiEntityInfo,
  type DevUiExecutorActionItem,
} from '../services/devuiApi'
import { DynamicWorkflowNode, type DynamicWorkflowNodeType } from '../workflows/components/DynamicWorkflowNode'
import { useDynamicWorkflow } from '../workflows/hooks/useDynamicWorkflow'
import type { WorkflowDefinition, WorkflowNode, WorkflowNodeRuntime } from '../workflows/types'

const nodeTypes = { dynamic: DynamicWorkflowNode } satisfies NodeTypes

type DevUiWorkflowDumpEdge = {
  source_id: string
  target_id: string
  condition_name?: string
}

type DevUiWorkflowDumpEdgeGroup = {
  id?: string
  type?: string
  edges?: DevUiWorkflowDumpEdge[]
}

type DevUiWorkflowDumpExecutor = {
  type?: string
}

type DevUiWorkflowDump = {
  id?: string
  name?: string
  executors?: Record<string, DevUiWorkflowDumpExecutor>
  edge_groups?: DevUiWorkflowDumpEdgeGroup[]
}

function toRuntimeStatus(status: DevUiExecutorActionItem['status']): WorkflowNodeRuntime['status'] {
  if (status === 'in_progress') return 'running'
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'error'
  return 'idle'
}

function stringifyResult(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function devUiWorkflowDumpToDefinition(entityInfo: DevUiEntityInfo): WorkflowDefinition | null {
  const dump = entityInfo.workflow_dump
  if (!dump || typeof dump !== 'object') return null

  const wf = dump as unknown as DevUiWorkflowDump
  const executors = wf.executors
  const edgeGroups = wf.edge_groups

  if (!executors) return null

  const nodes: WorkflowNode[] = Object.entries(executors).map(([executorId, payload]) => {
    const execType = payload?.type ? String(payload.type) : 'Executor'
    return {
      id: executorId,
      type: 'agentTask',
      name: executorId,
      description: execType,
      ui: {
        componentType: 'agentCard',
        props: {},
      },
      behavior: {
        kind: 'llm-agent',
        handler: executorId,
      },
      runtime: { status: 'idle' as const },
    }
  })

  const edges =
    (edgeGroups ?? [])
      .flatMap((group) => {
        const label = group?.type ? String(group.type) : undefined
        const groupEdges = group?.edges ?? []
        return groupEdges.map((edge) => {
          const source = String(edge.source_id)
          const target = String(edge.target_id)
          const condition = edge.condition_name ? String(edge.condition_name) : undefined
          return {
            id: `${source}-${target}-${group?.id ?? label ?? nanoid()}`,
            source,
            target,
            label,
            condition,
          }
        })
      })
      // dedupe
      .filter((edge, index, arr) => arr.findIndex((e) => e.id === edge.id) === index) ?? []

  const title = entityInfo.name || wf.name || wf.id || entityInfo.id

  return {
    id: entityInfo.id,
    title,
    domain: 'DevUI',
    intent: 'devui',
    source: 'uploaded',
    nodes,
    edges,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export default function DevUiWorkflowCanvas() {
  const { definition, nodes, edges, applyDefinition, applyRuntimeOverrides } = useDynamicWorkflow()
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<DynamicWorkflowNodeType>([])
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({})

  const [devuiEntities, setDevuiEntities] = useState<DevUiEntityInfo[]>([])
  const [entitiesLoading, setEntitiesLoading] = useState(false)
  const [entitiesError, setEntitiesError] = useState<string | null>(null)

  const [activeWorkflowEntityId, setActiveWorkflowEntityId] = useState<string | null>(null)
  const [runningWorkflowEntityId, setRunningWorkflowEntityId] = useState<string | null>(null)
  const [runningAgentEntityId, setRunningAgentEntityId] = useState<string | null>(null)

  const [workflowInput, setWorkflowInput] = useState('Run the workflow.')
  const [agentInput, setAgentInput] = useState('Hello!')
  const [lastAgentOutput, setLastAgentOutput] = useState<string | null>(null)
  const [streamError, setStreamError] = useState<string | null>(null)

  const streamControllerRef = useRef<AbortController | null>(null)

  const gridPosition = useCallback(
    (index: number) => ({
      x: 140 + (index % 4) * 280,
      y: 100 + Math.floor(index / 4) * 220,
    }),
    [],
  )

  const workflows = useMemo(() => {
    return devuiEntities
      .filter((e) => e.type === 'workflow')
      .map((e) => ({ id: e.id, name: e.name, description: e.description }))
  }, [devuiEntities])

  const agents = useMemo(() => {
    const raw = devuiEntities.filter((e) => e.type === 'agent')
    // DevUI entity IDs are unique but we still dedupe by id to be safe.
    const deduped = Array.from(new Map(raw.map((agent) => [agent.id, agent])).values())
    return deduped.map((agent) => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      tools: (agent.tools as string[] | undefined) ?? [],
    }))
  }, [devuiEntities])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setEntitiesLoading(true)
      setEntitiesError(null)
      try {
        const list = await fetchDevUiEntities()
        if (!cancelled) setDevuiEntities(list)
      } catch (err) {
        if (!cancelled) setEntitiesError((err as Error).message)
      } finally {
        if (!cancelled) setEntitiesLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => {
      streamControllerRef.current?.abort()
    }
  }, [])

  const syncNodes = useCallback(
    (workflowNodes: WorkflowNode[], positions: Record<string, { x: number; y: number }>) => {
      setRfNodes(
        workflowNodes.map((node, index) => {
          const position = positions[node.id] ?? gridPosition(index)
          return {
            id: node.id,
            type: 'dynamic',
            position,
            data: {
              node,
              inputs: {},
              onInputChange: () => {},
              onRun: () => {},
            },
          } satisfies DynamicWorkflowNodeType
        }),
      )
    },
    [gridPosition, setRfNodes],
  )

  useEffect(() => {
    if (!nodes.length) return
    syncNodes(nodes, nodePositions)
  }, [nodes, nodePositions, syncNodes])

  useEffect(() => {
    const nextEdges = (edges ?? []).map((edge) => ({
      id: edge.id || nanoid(),
      source: edge.source,
      target: edge.target,
      animated: true,
      label: edge.label ?? undefined,
    }))
    setRfEdges(nextEdges)
  }, [edges, setRfEdges])

  const applyExecutorAction = useCallback(
    (item: DevUiExecutorActionItem) => {
      const status = toRuntimeStatus(item.status)
      applyRuntimeOverrides({
        [item.executor_id]: {
          status,
          output: item.result ? stringifyResult(item.result) : item.error ? stringifyResult(item.error) : undefined,
          lastRunAt: new Date().toISOString(),
        },
      })
    },
    [applyRuntimeOverrides],
  )

  const loadWorkflow = useCallback(
    async (workflowEntityId: string) => {
      setStreamError(null)
      try {
        const info = await fetchDevUiEntityInfo(workflowEntityId)
        const def = devUiWorkflowDumpToDefinition(info)
        if (!def) throw new Error('DevUI did not return a workflow_dump we can render.')
        applyDefinition(def)
        setActiveWorkflowEntityId(workflowEntityId)
        const positions: Record<string, { x: number; y: number }> = {}
        def.nodes.forEach((node, index) => {
          positions[node.id] = gridPosition(index)
        })
        setNodePositions(positions)
      } catch (err) {
        setStreamError((err as Error).message)
      }
    },
    [applyDefinition, gridPosition],
  )

  const runWorkflow = useCallback(
    async (workflowEntityId: string) => {
      streamControllerRef.current?.abort()
      const controller = new AbortController()
      streamControllerRef.current = controller
      setRunningWorkflowEntityId(workflowEntityId)
      setStreamError(null)
      try {
        await streamDevUiEntityExecution(workflowEntityId, workflowInput.trim() || 'Run the workflow.', {
          signal: controller.signal,
          onExecutorAction: applyExecutorAction,
          onHilRequest: (evt) => {
            // For now: surface as error message so it’s visible in UI.
            // (Next iteration: render a modal/form from evt.response_schema and submit via workflow_hil_response)
            setStreamError(`Workflow requested input (HIL): ${JSON.stringify(evt)}`)
          },
        })
      } catch (err) {
        if ((err as DOMException).name !== 'AbortError') setStreamError((err as Error).message)
      } finally {
        if (streamControllerRef.current === controller) streamControllerRef.current = null
        setRunningWorkflowEntityId((cur) => (cur === workflowEntityId ? null : cur))
      }
    },
    [workflowInput, applyExecutorAction],
  )

  const runAgent = useCallback(
    async (agentEntityId: string) => {
      streamControllerRef.current?.abort()
      const controller = new AbortController()
      streamControllerRef.current = controller
      setRunningAgentEntityId(agentEntityId)
      setLastAgentOutput(null)
      setStreamError(null)
      let buffer = ''
      try {
        await streamDevUiEntityExecution(agentEntityId, agentInput.trim() || 'Hello!', {
          signal: controller.signal,
          onTextDelta: (delta) => {
            buffer += delta
            setLastAgentOutput(buffer)
          },
        })
      } catch (err) {
        if ((err as DOMException).name !== 'AbortError') setStreamError((err as Error).message)
      } finally {
        if (streamControllerRef.current === controller) streamControllerRef.current = null
        setRunningAgentEntityId((cur) => (cur === agentEntityId ? null : cur))
      }
    },
    [agentInput],
  )

  const stats = useMemo(() => {
    if (!definition) return null
    return { nodes: definition.nodes.length, edges: definition.edges.length, title: definition.title }
  }, [definition])

  return (
    <div className="flex h-full w-full bg-slate-50">
      <aside className="w-[360px] border-r border-slate-200 bg-white p-6">
        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle>DevUI → ReactFlow</CardTitle>
            <CardDescription>
              Render DevUI workflows/agents (from `dev_ui.py`) on the canvas and execute them via DevUI streaming.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="workflowInput">Workflow input</Label>
              <Textarea
                id="workflowInput"
                rows={3}
                value={workflowInput}
                onChange={(event) => setWorkflowInput(event.target.value)}
                placeholder="Message passed to workflow start executor."
              />
              <p className="mt-1 text-xs text-slate-500">Used when you click “Run” on a workflow.</p>
            </div>
            <div>
              <Label htmlFor="agentInput">Agent input</Label>
              <Input
                id="agentInput"
                value={agentInput}
                onChange={(event) => setAgentInput(event.target.value)}
                placeholder="Message passed to agent.run(...)"
              />
              <p className="mt-1 text-xs text-slate-500">Used when you click “Run” on an agent.</p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  streamControllerRef.current?.abort()
                  setRunningWorkflowEntityId(null)
                  setRunningAgentEntityId(null)
                }}
              >
                Stop
              </Button>
              <Button type="button" variant="secondary" onClick={() => void (activeWorkflowEntityId && runWorkflow(activeWorkflowEntityId))} disabled={!activeWorkflowEntityId}>
                Run loaded workflow
              </Button>
            </div>
            {entitiesError && <p className="text-sm text-red-600">{entitiesError}</p>}
            {streamError && <p className="text-sm text-red-600">{streamError}</p>}
            {stats && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Loaded</p>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Workflow</span>
                    <strong className="truncate pl-2">{stats.title}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Nodes</span>
                    <strong>{stats.nodes}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Edges</span>
                    <strong>{stats.edges}</strong>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">
        <DevUiWorkflowToolbar
          workflows={workflows}
          loading={entitiesLoading}
          fetchError={entitiesError}
          activeWorkflowId={activeWorkflowEntityId}
          runningWorkflowId={runningWorkflowEntityId}
          onLoadWorkflow={(id) => void loadWorkflow(id)}
          onRunWorkflow={(id) => void runWorkflow(id)}
        />
        <DevUiAgentToolbar
          agents={agents}
          loading={entitiesLoading}
          fetchError={entitiesError}
          runningAgentId={runningAgentEntityId}
          lastRunOutput={lastAgentOutput}
          onRunAgent={(id) => void runAgent(id)}
        />
        <div className="flex-1">
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={(connection) => setRfEdges((eds) => addEdge(connection, eds))}
            onNodeDragStop={(_, node) =>
              setNodePositions((prev) => ({
                ...prev,
                [node.id]: node.position,
              }))
            }
            fitView
            nodeTypes={nodeTypes}
            className="bg-slate-100"
          >
            <Background variant={BackgroundVariant.Lines} gap={24} />
            <Controls position="bottom-right" />
          </ReactFlow>
        </div>
      </main>
    </div>
  )
}

