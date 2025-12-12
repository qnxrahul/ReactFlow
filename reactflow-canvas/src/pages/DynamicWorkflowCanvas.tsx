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
import { AgentToolbar } from '../components/AgentToolbar'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { fetchAgents, runAgent } from '../services/agentsApi'
import { fetchMafWorkflowCatalog, executeMafWorkflow } from '../services/mafWorkflowsApi'
import { assistWorkflow } from '../services/workflowsApi'
import { DynamicWorkflowNode, type DynamicWorkflowNodeType } from '../workflows/components/DynamicWorkflowNode'
import { useDynamicWorkflow } from '../workflows/hooks/useDynamicWorkflow'
import type {
  AgentDefinition,
  WorkflowCatalogItem,
  WorkflowExecutionResponse,
  WorkflowNode,
} from '../workflows/types'

const nodeTypes = { dynamic: DynamicWorkflowNode } satisfies NodeTypes

const defaultPayload = {
  domain: 'MESP',
  intent: 'Plan engagement',
  description: 'Create an end-to-end audit workflow leveraging LLM agents.',
}

const STOP_WORDS = new Set(['the', 'and', 'with', 'that', 'this', 'from', 'into', 'your', 'about', 'risk', 'audit'])

function extractKeywords(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((token) => token.length > 3 && !STOP_WORDS.has(token)),
    ),
  ).slice(0, 8)
}

export default function DynamicWorkflowCanvas() {
  const { generate, definition, nodes, edges, runNode, loading, error, applyDefinition } = useDynamicWorkflow()
  const [form, setForm] = useState(defaultPayload)
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<DynamicWorkflowNodeType>([])
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({})
  const [agents, setAgents] = useState<AgentDefinition[]>([])
  const [agentsLoading, setAgentsLoading] = useState(false)
  const [agentError, setAgentError] = useState<string | null>(null)
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])
  const [agentRunOutput, setAgentRunOutput] = useState<string | null>(null)
  const [assistQuestion, setAssistQuestion] = useState('')
  const [assistAnswer, setAssistAnswer] = useState<string | null>(null)
  const [assistSuggestions, setAssistSuggestions] = useState<WorkflowNode[]>([])
  const [assistLoading, setAssistLoading] = useState(false)
  const [assistError, setAssistError] = useState<string | null>(null)
  const [toolbarAgentId, setToolbarAgentId] = useState<string | null>(null)
  const [toolbarError, setToolbarError] = useState<string | null>(null)
  const [agentMatchScores, setAgentMatchScores] = useState<Record<string, number>>({})
  const [mafCatalog, setMafCatalog] = useState<WorkflowCatalogItem[]>([])
  const [mafCatalogLoading, setMafCatalogLoading] = useState(false)
  const [mafCatalogError, setMafCatalogError] = useState<string | null>(null)
  const [mafExecution, setMafExecution] = useState<WorkflowExecutionResponse | null>(null)
  const [mafExecutionLoading, setMafExecutionLoading] = useState(false)
  const [mafExecutionError, setMafExecutionError] = useState<string | null>(null)
  const [mafInputs, setMafInputs] = useState<Record<string, Record<string, string>>>({})
  const keywordSource = `${form.domain} ${form.intent} ${form.description ?? ''} ${assistQuestion}`
  const contextKeywords = useMemo(() => extractKeywords(keywordSource), [keywordSource])

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
    const workflow = await generate({ ...form, preferredHandlers, contextKeywords })
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
  }, [form, preferredHandlers, contextKeywords, generate, gridPosition, setRfEdges])

  useEffect(() => {
    if (!nodes.length) return
    syncNodes(nodes, nodePositions)
  }, [nodes, nodePositions, syncNodes])

  const workflowEdgeSignatureRef = useRef<string>('')
  useEffect(() => {
    const nextEdges = (edges ?? []).map((edge) => ({
      id: edge.id || nanoid(),
      source: edge.source,
      target: edge.target,
      animated: true,
      label: edge.label ?? undefined,
    }))
    const signature = JSON.stringify(nextEdges)
    if (workflowEdgeSignatureRef.current === signature) return
    workflowEdgeSignatureRef.current = signature
    setRfEdges(nextEdges)
  }, [edges, setRfEdges])

  useEffect(() => {
    let cancelled = false
    const loadAgents = async () => {
      setAgentsLoading(true)
      try {
        const result = await fetchAgents()
        if (cancelled) return
        const deduped = Array.from(new Map(result.map((agent) => [agent.id, agent])).values())
        const normalizedDomain = form.domain.trim().toLowerCase()
        const intentTokens = form.intent
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean)
        const keywordSet = new Set((contextKeywords ?? []).map((keyword) => keyword.toLowerCase()))
        const scoreAgent = (agent: AgentDefinition) => {
          let score = 0
          if (normalizedDomain && agent.domains.some((domain) => domain.toLowerCase().includes(normalizedDomain))) {
            score += 3
          }
          if (intentTokens.length > 0) {
            const intentMatches = intentTokens.filter((token) =>
              agent.intentTags.some((tag) => tag.toLowerCase().includes(token)),
            )
            score += intentMatches.length * 2
          }
          if (keywordSet.size > 0) {
            keywordSet.forEach((keyword) => {
              if (
                agent.capabilities?.some((capability) => capability.toLowerCase().includes(keyword)) ||
                agent.domains.some((domain) => domain.toLowerCase().includes(keyword)) ||
                agent.intentTags.some((tag) => tag.toLowerCase().includes(keyword))
              ) {
                score += 1
              }
            })
          }
          return score
        }
        const scores = deduped.reduce<Record<string, number>>((acc, agent) => {
          acc[agent.id] = scoreAgent(agent)
          return acc
        }, {})
        deduped.sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0))
        setAgentMatchScores(scores)
        setAgents(deduped)
        setAgentError(null)
        setSelectedAgentIds((prev) => prev.filter((id) => deduped.some((agent) => agent.id === id)))
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
  }, [form.domain, form.intent, contextKeywords])

  useEffect(() => {
    let cancelled = false
    const loadCatalog = async () => {
      setMafCatalogLoading(true)
      try {
        const workflows = await fetchMafWorkflowCatalog({
          domain: form.domain,
          intent: form.intent,
          query: form.description,
        })
        if (!cancelled) {
          setMafCatalog(workflows)
          setMafCatalogError(null)
        }
      } catch (error) {
        if (!cancelled) {
          setMafCatalogError((error as Error).message)
        }
      } finally {
        if (!cancelled) {
          setMafCatalogLoading(false)
        }
      }
    }
    void loadCatalog()
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
      setToolbarError(null)
    } catch (err) {
      setAgentRunOutput((err as Error).message)
    }
  }

  const handleInsertAgent = useCallback(
    async (agent: AgentDefinition) => {
      setToolbarAgentId(agent.id)
      setToolbarError(null)
      try {
        const response = await assistWorkflow({
          question: `Add agent ${agent.name} (${agent.handler}) to this workflow and highlight its strengths.`,
          workflowId: definition?.id,
          domain: form.domain,
          intent: form.intent,
          description: form.description,
          contextKeywords,
          preferredHandlers: Array.from(new Set([...preferredHandlers, agent.handler])),
          context: {
            agentId: agent.id,
            mcpTool: agent.mcpTool,
            description: agent.description,
          },
        })
        setAssistAnswer(response.answer)
        setAssistSuggestions(response.suggestedNodes ?? [])
        if (response.workflow) {
          applyDefinition(response.workflow)
          setNodePositions((prev) => ({ ...prev }))
        }
      } catch (err) {
        setToolbarError((err as Error).message)
      } finally {
        setToolbarAgentId(null)
      }
    },
    [definition?.id, form, contextKeywords, preferredHandlers, applyDefinition],
  )

  const handleAssist = useCallback(async () => {
    const question = assistQuestion.trim() || form.description || `Help me reason about ${form.intent}`
    if (!question) {
      return
    }
    setAssistLoading(true)
    setAssistError(null)
    try {
      const response = await assistWorkflow({
        question,
        workflowId: definition?.id,
        domain: form.domain,
        intent: form.intent,
        description: form.description,
        contextKeywords,
        preferredHandlers,
        context: { description: form.description },
      })
      setAssistAnswer(response.answer)
      setAssistSuggestions(response.suggestedNodes ?? [])
      if (response.workflow) {
        applyDefinition(response.workflow)
        setNodePositions((prev) => ({ ...prev }))
      }
      setAssistQuestion('')
    } catch (err) {
      setAssistError((err as Error).message)
    } finally {
      setAssistLoading(false)
    }
  }, [assistQuestion, definition?.id, form, contextKeywords, preferredHandlers, applyDefinition])

  const getRequestId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID()
    }
    return `req-${Date.now()}`
  }

  const updateMafInput = (workflowId: string, fieldId: string, value: string) => {
    setMafInputs((prev) => ({
      ...prev,
      [workflowId]: { ...(prev[workflowId] ?? {}), [fieldId]: value },
    }))
  }

  const handleLoadMafWorkflow = useCallback(
    (workflowId: string) => {
      const selected = mafCatalog.find((workflow) => workflow.id === workflowId)
      if (!selected) return
      applyDefinition(selected.definition)
      const positions = selected.definition.nodes.reduce<Record<string, { x: number; y: number }>>((acc, node, index) => {
        acc[node.id] = gridPosition(index)
        return acc
      }, {})
      setNodePositions(positions)
      setSelectedAgentIds([])
    },
    [mafCatalog, applyDefinition, gridPosition],
  )

  const handleExecuteMafWorkflow = useCallback(
    async (workflowId: string) => {
      setMafExecutionLoading(true)
      setMafExecutionError(null)
      try {
        const execution = await executeMafWorkflow(workflowId, {
          requestId: getRequestId(),
          input: form.description || form.intent,
          context: {
            domain: form.domain,
            intent: form.intent,
            inputs: mafInputs[workflowId] ?? {},
          },
        })
        setMafExecution(execution)
      } catch (error) {
        setMafExecutionError((error as Error).message)
      } finally {
        setMafExecutionLoading(false)
      }
    },
    [form],
  )

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
            <CardTitle>Ask the AI planner</CardTitle>
            <CardDescription>Use the LLM to refine your workflow or request new steps.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              value={assistQuestion}
              onChange={(event) => setAssistQuestion(event.target.value)}
              rows={3}
              placeholder="Describe a gap or question you want the AI to explore."
            />
            <Button
              type="button"
              className="w-full"
              disabled={assistLoading || (!assistQuestion.trim() && !form.description && !definition)}
              onClick={handleAssist}
            >
              {assistLoading ? 'Thinking…' : 'Ask AI for suggestions'}
            </Button>
            {assistError && <p className="text-sm text-red-600">{assistError}</p>}
            {assistAnswer && (
              <div className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <strong>AI insight:</strong>
                <p className="mt-1">{assistAnswer}</p>
              </div>
            )}
            {assistSuggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500">Suggested steps</p>
                <ul className="space-y-2">
                  {assistSuggestions.map((node) => (
                    <li key={node.id} className="rounded border border-dashed border-slate-300 px-3 py-2 text-sm">
                      <div className="font-medium">{node.name}</div>
                      {node.description && <p className="text-xs text-slate-500">{node.description}</p>}
                      <p className="mt-1 text-xs text-slate-400">Type: {node.type}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>MAF Workflow Catalog</CardTitle>
            <CardDescription>Import curated MCP workflows and replay their executions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mafCatalogLoading && <p className="text-sm text-slate-500">Loading workflows…</p>}
            {mafCatalogError && <p className="text-sm text-red-600">{mafCatalogError}</p>}
            {!mafCatalogLoading && mafCatalog.length === 0 && (
              <p className="text-sm text-slate-500">No workflows published yet.</p>
            )}
            {mafCatalog.map((workflow) => (
              <div key={workflow.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{workflow.title}</p>
                    {workflow.description && <p className="text-xs text-slate-500">{workflow.description}</p>}
                    <p className="text-[11px] uppercase tracking-wide text-slate-400">
                      {[workflow.category, workflow.source === 'devui' ? 'Dev UI' : 'Catalog']
                        .filter(Boolean)
                        .join(' • ')}
                    </p>
                    {workflow.domains && workflow.domains.length > 0 && (
                      <p className="text-xs text-slate-400">Domains: {workflow.domains.join(', ')}</p>
                    )}
                    {workflow.tags && workflow.tags.length > 0 && (
                      <p className="mt-1 text-xs text-slate-400">{workflow.tags.join(' • ')}</p>
                    )}
                  </div>
                </div>
                    {workflow.inputs && workflow.inputs.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {workflow.inputs.map((field) => (
                          <div key={`${workflow.id}-${field.id}`}>
                            <Label className="text-xs text-slate-500">{field.label}</Label>
                            <Input
                              value={mafInputs[workflow.id]?.[field.id] ?? ''}
                              placeholder={field.placeholder}
                              onChange={(event) => updateMafInput(workflow.id, field.id, event.target.value)}
                            />
                            {field.helperText && <p className="text-[11px] text-slate-400">{field.helperText}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => handleLoadMafWorkflow(workflow.id)}>
                    Load diagram
                  </Button>
                  <Button size="sm" onClick={() => handleExecuteMafWorkflow(workflow.id)} disabled={mafExecutionLoading}>
                    {mafExecutionLoading ? 'Running…' : 'Run in MCP'}
                  </Button>
                </div>
              </div>
            ))}
            {mafExecutionError && <p className="text-sm text-red-600">{mafExecutionError}</p>}
            {mafExecution && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last execution</p>
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-sm font-medium">Request {mafExecution.requestId}</p>
                  <p className="text-xs text-slate-500">Status: {mafExecution.status}</p>
                  <ul className="mt-3 space-y-2">
                    {mafExecution.steps.map((step) => (
                      <li key={step.nodeId} className="rounded border border-slate-100 p-2">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{step.agentName ?? step.name}</span>
                            {step.handler && <span className="text-[11px] uppercase text-slate-400">{step.handler}</span>}
                          </div>
                          <span className={step.status === 'success' ? 'text-green-600 font-semibold' : 'text-amber-600 font-semibold'}>
                            {step.status}
                          </span>
                        </div>
                        {step.output && <p className="text-xs text-slate-500">{step.output}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">
        <AgentToolbar
          agents={agents}
          selectedAgentIds={selectedAgentIds}
          onToggleAgent={toggleAgentSelection}
          onRunAgent={handleRunAgent}
          onInsertAgent={handleInsertAgent}
          loading={agentsLoading}
          busyAgentId={toolbarAgentId}
          fetchError={agentError}
          actionError={toolbarError}
          contextKeywords={contextKeywords}
          lastRunOutput={agentRunOutput}
          matchScores={agentMatchScores}
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
