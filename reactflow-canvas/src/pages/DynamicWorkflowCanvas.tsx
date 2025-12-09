import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { fetchAgents, runAgent } from '../services/agentsApi'
import { useDynamicWorkflow } from '../workflows/hooks/useDynamicWorkflow'
import { DynamicWorkflowNode, type DynamicWorkflowNodeType } from '../workflows/components/DynamicWorkflowNode'
import type { AgentDefinition, GenerateWorkflowPayload, WorkflowNode } from '../workflows/types'

const nodeTypes = { dynamic: DynamicWorkflowNode } satisfies NodeTypes

const defaultPayload: GenerateWorkflowPayload = {
  domain: 'MESP',
  intent: 'Plan engagement',
  description: 'Create an end-to-end audit workflow leveraging LLM agents.',
}

export default function DynamicWorkflowCanvas() {
  const { generate, definition, nodes, runNode, loading, error } = useDynamicWorkflow()
  const [form, setForm] = useState(defaultPayload)
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<DynamicWorkflowNodeType>([])
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({})
  const [agents, setAgents] = useState<AgentDefinition[]>([])
  const [agentsLoading, setAgentsLoading] = useState(false)
  const [agentError, setAgentError] = useState<string | null>(null)
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])
  const [agentRunOutput, setAgentRunOutput] = useState<string | null>(null)

  const gridPosition = useCallback(
    (index: number) => ({
      x: 120 + (index % 4) * 260,
      y: 80 + Math.floor(index / 4) * 240,
    }),
    [],
  )

  const syncNodes = useCallback(
    (workflowNodes: WorkflowNode[], positions: Record<string, { x: number; y: number }>) => {
      setRfNodes(
        workflowNodes.map((node, index) => {
          const position = positions[node.id] ?? gridPosition(index)
          return {
            id: node.id,
            type: 'dynamic',
            position,
            data: { node, onRun: (nodeId: string) => runNode(nodeId) },
          } satisfies DynamicWorkflowNodeType
        }),
      )
    },
    [gridPosition, runNode, setRfNodes],
  )

  const canGenerate = form.intent.trim().length > 3 && form.domain.trim().length > 0
  const preferredHandlers = useMemo(
    () =>
      selectedAgentIds
        .map((id) => agents.find((agent) => agent.id === id)?.handler)
        .filter((handler): handler is string => Boolean(handler)),
    [agents, selectedAgentIds],
  )

  const onGenerate = useCallback(async () => {
    const workflow = await generate({ ...form, preferredHandlers })
    const positions: Record<string, { x: number; y: number }> = {}
    workflow.nodes.forEach((node, index) => {
      positions[node.id] = gridPosition(index)
    })
    setNodePositions(positions)
    const flowEdges = workflow.edges.map((edge) => ({
      id: edge.id || nanoid(),
      source: edge.source,
      target: edge.target,
      animated: true,
      label: edge.label ?? undefined,
    }))
    setRfEdges(flowEdges)
  }, [form, preferredHandlers, generate, gridPosition, setRfEdges])

  useEffect(() => {
    if (!nodes.length) return
    syncNodes(nodes, nodePositions)
  }, [nodes, nodePositions, syncNodes])

  useEffect(() => {
    let cancelled = false
    const loadAgents = async () => {
      setAgentsLoading(true)
      try {
        const result = await fetchAgents({ domain: form.domain, intent: form.intent })
        if (!cancelled) {
          setAgents(result)
          setAgentError(null)
          setSelectedAgentIds((prev) => prev.filter((id) => result.some((agent) => agent.id === id)))
        }
      } catch (error) {
        if (!cancelled) setAgentError((error as Error).message)
      } finally {
        if (!cancelled) setAgentsLoading(false)
      }
    }
    void loadAgents()
    return () => {
      cancelled = true
    }
  }, [form.domain, form.intent])

  const stats = useMemo(() => {
    if (!definition) return null
    return {
      nodes: definition.nodes.length,
      edges: definition.edges.length,
      domain: definition.domain,
    }
  }, [definition])

  const toggleAgentSelection = (agentId: string) => {
    setSelectedAgentIds((prev) => (prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]))
  }

  const handleRunAgent = async (agentId: string) => {
    try {
      const result = await runAgent(agentId, `Assist with ${form.intent}`, {
        domain: form.domain,
        intent: form.intent,
      })
      setAgentRunOutput(result.output)
    } catch (err) {
      setAgentRunOutput((err as Error).message)
    }
  }

  return (
    <div className="flex h-full w-full bg-slate-50">
      <aside className="w-[360px] border-r border-slate-200 bg-white p-6">
        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle>Dynamic Workflow Agent</CardTitle>
            <CardDescription>
              Describe the audit scenario and let the OpenRouter-powered agent design an executable workflow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="domain">Domain</Label>
              <Input
                id="domain"
                value={form.domain}
                onChange={(event) => setForm((prev) => ({ ...prev, domain: event.target.value }))}
                placeholder="e.g., MESP, Risk"
              />
            </div>
            <div>
              <Label htmlFor="intent">Intent</Label>
              <Input
                id="intent"
                value={form.intent}
                onChange={(event) => setForm((prev) => ({ ...prev, intent: event.target.value }))}
                placeholder="What workflow should the agent build?"
              />
            </div>
            <div>
              <Label htmlFor="description">Context</Label>
              <Textarea
                id="description"
                rows={4}
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Add scope, risks, or data requirements"
              />
            </div>
            <Button disabled={!canGenerate || loading} onClick={onGenerate} className="w-full">
              {loading ? 'Generating...' : 'Generate workflow'}
            </Button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </CardContent>
        </Card>
        {stats && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Current workflow</p>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span>Domain</span><strong>{stats.domain}</strong></div>
              <div className="flex justify-between"><span>Nodes</span><strong>{stats.nodes}</strong></div>
              <div className="flex justify-between"><span>Edges</span><strong>{stats.edges}</strong></div>
            </div>
          </div>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Agents</CardTitle>
            <CardDescription>Select MCP-backed agents to prioritize or test runs before generating.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {agentError && <p className="text-sm text-red-600">{agentError}</p>}
            {agentsLoading ? (
              <p className="text-sm text-muted-foreground">Loading agents…</p>
            ) : (
              <ul className="space-y-3">
                {agents.map((agent) => {
                  const selected = selectedAgentIds.includes(agent.id)
                  return (
                    <li key={agent.id} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-center justify-between text-sm font-medium">
                        <span>{agent.name}</span>
                        <span className="text-xs text-slate-500">{agent.handler}</span>
                      </div>
                      {agent.description && <p className="mt-1 text-xs text-slate-500">{agent.description}</p>}
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                        {agent.domains.map((domain) => (
                          <span key={domain} className="rounded-full bg-slate-100 px-2 py-0.5">
                            {domain}
                          </span>
                        ))}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button
                          type="button"
                          variant={selected ? 'secondary' : 'outline'}
                          size="sm"
                          onClick={() => toggleAgentSelection(agent.id)}
                        >
                          {selected ? 'Selected' : 'Prioritize'}
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleRunAgent(agent.id)}>
                          Run
                        </Button>
                      </div>
                    </li>
                  )
                })}
                {agents.length === 0 && !agentsLoading && <p className="text-sm text-muted-foreground">No agents available for this domain.</p>}
              </ul>
            )}
            <p className="text-xs text-slate-500">Selected agents: {selectedAgentIds.length}</p>
            {agentRunOutput && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <strong>Last run:</strong>
                <p className="whitespace-pre-wrap">{agentRunOutput}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </aside>

      <main className="flex-1">
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
      </main>
    </div>
  )
}
