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
import { useDynamicWorkflow } from '../workflows/hooks/useDynamicWorkflow'
import { DynamicWorkflowNode, type DynamicWorkflowNodeType } from '../workflows/components/DynamicWorkflowNode'
import type { GenerateWorkflowPayload, WorkflowNode } from '../workflows/types'

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

  const onGenerate = useCallback(async () => {
    const workflow = await generate(form)
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
  }, [form, generate, gridPosition, setRfEdges])

  useEffect(() => {
    if (!nodes.length) return
    syncNodes(nodes, nodePositions)
  }, [nodes, nodePositions, syncNodes])

  const stats = useMemo(() => {
    if (!definition) return null
    return {
      nodes: definition.nodes.length,
      edges: definition.edges.length,
      domain: definition.domain,
    }
  }, [definition])

  const canGenerate = form.intent.trim().length > 3 && form.domain.trim().length > 0

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
