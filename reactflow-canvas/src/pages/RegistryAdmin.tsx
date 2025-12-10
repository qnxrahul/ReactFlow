import { useEffect, useMemo, useState } from 'react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { fetchComponentRegistry, registerComponent, registerHandler } from '../services/componentRegistryApi'
import { fetchAgents, registerAgent } from '../services/agentsApi'
import type { AgentDefinition, ComponentDefinition } from '../workflows/types'

const baseRendererOptions = [
  { value: 'agentCard', label: 'Agent Card' },
  { value: 'evidenceCard', label: 'Evidence Card' },
  { value: 'decisionCard', label: 'Decision Card' },
  { value: 'reportCard', label: 'Report Card' },
]
const handlerKindOptions = [
  { value: 'llm-agent', label: 'LLM Agent' },
  { value: 'service', label: 'Service' },
  { value: 'human-task', label: 'Human Task' },
]

export default function RegistryAdmin() {
  const [registry, setRegistry] = useState<{ components: ComponentDefinition[] } | null>(null)
  const [agents, setAgents] = useState<AgentDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [componentForm, setComponentForm] = useState({
    type: '',
    label: '',
    baseRenderer: 'agentCard',
    description: '',
    defaultProps: '',
  })
  const [handlerForm, setHandlerForm] = useState({ handler: '', kind: 'llm-agent', description: '' })
  const [agentForm, setAgentForm] = useState({
    name: '',
    handler: '',
    domains: '',
    intentTags: '',
    capabilities: '',
    mcpTool: '',
    defaultParams: '',
    description: '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const [registryResult, agentsResult] = await Promise.all([fetchComponentRegistry(), fetchAgents()])
        if (!cancelled) {
          setRegistry({ components: registryResult.components })
          setAgents(agentsResult)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const sortedComponents = useMemo(
    () => (registry?.components ?? []).slice().sort((a, b) => a.type.localeCompare(b.type)),
    [registry?.components],
  )
  const sortedAgents = useMemo(() => agents.slice().sort((a, b) => a.name.localeCompare(b.name)), [agents])

  const refetch = async () => {
    setLoading(true)
    try {
      const [registryResult, agentsResult] = await Promise.all([fetchComponentRegistry(), fetchAgents()])
      setRegistry({ components: registryResult.components })
      setAgents(agentsResult)
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleComponentSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!componentForm.type.trim()) return
    setSaving(true)
    try {
      let parsedProps: Record<string, unknown> | undefined
      if (componentForm.defaultProps.trim()) {
        parsedProps = JSON.parse(componentForm.defaultProps)
      }
      await registerComponent({
        type: componentForm.type.trim(),
        label: componentForm.label.trim() || componentForm.type.trim(),
        baseRenderer: componentForm.baseRenderer as ComponentDefinition['baseRenderer'],
        description: componentForm.description.trim() || undefined,
        defaultProps: parsedProps,
      })
      setComponentForm({ type: '', label: '', baseRenderer: componentForm.baseRenderer, description: '', defaultProps: '' })
      await refetch()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleHandlerSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!handlerForm.handler.trim()) return
    setSaving(true)
    try {
      await registerHandler({
        handler: handlerForm.handler.trim(),
        kind: handlerForm.kind as 'llm-agent' | 'service' | 'human-task',
        description: handlerForm.description.trim() || undefined,
      })
      setHandlerForm({ handler: '', kind: handlerForm.kind, description: '' })
      await refetch()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleAgentSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!agentForm.name.trim() || !agentForm.handler.trim() || !agentForm.mcpTool.trim()) return
    setSaving(true)
    try {
      let parsedAgentParams: Record<string, unknown> | undefined
      if (agentForm.defaultParams.trim()) {
        try {
          parsedAgentParams = JSON.parse(agentForm.defaultParams)
        } catch {
          parsedAgentParams = undefined
        }
      }
      const payload = {
        name: agentForm.name.trim(),
        handler: agentForm.handler.trim(),
        description: agentForm.description.trim() || undefined,
        domains: agentForm.domains.split(',').map((value) => value.trim()).filter(Boolean),
        intentTags: agentForm.intentTags.split(',').map((value) => value.trim()).filter(Boolean),
        capabilities: agentForm.capabilities.split(',').map((value) => value.trim()).filter(Boolean),
        mcpTool: agentForm.mcpTool.trim(),
        defaultParams: parsedAgentParams ?? {},
      }
      await registerAgent(payload)
      setAgentForm({ name: '', handler: '', domains: '', intentTags: '', capabilities: '', mcpTool: '', defaultParams: '', description: '' })
      await refetch()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-6 bg-slate-50 p-8">
      <header>
        <h1 className="text-2xl font-semibold">Component & Handler Registry</h1>
        <p className="text-sm text-slate-600">Register new workflow node renderers and backend handlers without touching the codebase.</p>
      </header>

      {error && <p className="text-sm text-red-600">Failed to load registry: {error}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Registered components</CardTitle>
              <CardDescription>These types can be referenced by the workflow generator.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                <ul className="space-y-3">
                  {sortedComponents.map((component) => (
                    <li key={component.id} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <strong>{component.type}</strong>
                          <span className="ml-2 text-slate-500">({component.baseRenderer})</span>
                        </div>
                        <span className="text-slate-500">{component.label}</span>
                      </div>
                      {component.description && <p className="mt-1 text-xs text-slate-500">{component.description}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Registered agents</CardTitle>
              <CardDescription>These MCP agents are surfaced in the dynamic workflow canvas.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : (
                <ul className="space-y-3">
                  {sortedAgents.map((agent) => (
                    <li key={agent.id} className="rounded-xl border border-slate-200 bg-white p-3">
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
                        {agent.intentTags.map((tag) => (
                          <span key={tag} className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
                  {sortedAgents.length === 0 && <p className="text-sm text-muted-foreground">No agents registered yet.</p>}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add component</CardTitle>
              <CardDescription>Map a component type to a base renderer with default props.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={handleComponentSubmit}>
                <div>
                  <Label htmlFor="component-type">Type</Label>
                  <Input
                    id="component-type"
                    value={componentForm.type}
                    onChange={(event) => setComponentForm((prev) => ({ ...prev, type: event.target.value }))}
                    placeholder="e.g., riskPlanner"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="component-label">Label</Label>
                  <Input
                    id="component-label"
                    value={componentForm.label}
                    onChange={(event) => setComponentForm((prev) => ({ ...prev, label: event.target.value }))}
                    placeholder="Display name"
                  />
                </div>
                <div>
                  <Label htmlFor="component-base">Base renderer</Label>
                  <select
                    id="component-base"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={componentForm.baseRenderer}
                    onChange={(event) => setComponentForm((prev) => ({ ...prev, baseRenderer: event.target.value }))}
                  >
                    {baseRendererOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="component-description">Description</Label>
                  <Textarea
                    id="component-description"
                    rows={3}
                    value={componentForm.description}
                    onChange={(event) => setComponentForm((prev) => ({ ...prev, description: event.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="component-props">Default props (JSON)</Label>
                  <Textarea
                    id="component-props"
                    rows={3}
                    value={componentForm.defaultProps}
                    onChange={(event) => setComponentForm((prev) => ({ ...prev, defaultProps: event.target.value }))}
                    placeholder='{ "subtitle": "Risk" }'
                  />
                </div>
                <Button type="submit" disabled={saving} className="w-full">
                  {saving ? 'Saving…' : 'Register component'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add handler</CardTitle>
              <CardDescription>Register a backend handler identifier the LLM can reference.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={handleHandlerSubmit}>
                <div>
                  <Label htmlFor="handler-id">Handler ID</Label>
                  <Input
                    id="handler-id"
                    value={handlerForm.handler}
                    onChange={(event) => setHandlerForm((prev) => ({ ...prev, handler: event.target.value }))}
                    placeholder="e.g., services.compliance.validate"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="handler-kind">Kind</Label>
                  <select
                    id="handler-kind"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={handlerForm.kind}
                    onChange={(event) => setHandlerForm((prev) => ({ ...prev, kind: event.target.value }))}
                  >
                    {handlerKindOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="handler-description">Description</Label>
                  <Textarea
                    id="handler-description"
                    rows={2}
                    value={handlerForm.description}
                    onChange={(event) => setHandlerForm((prev) => ({ ...prev, description: event.target.value }))}
                  />
                </div>
                <Button type="submit" disabled={saving} className="w-full">
                  {saving ? 'Saving…' : 'Register handler'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add agent</CardTitle>
              <CardDescription>Expose an MCP-backed agent with metadata so users can find it in the canvas.</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={handleAgentSubmit}>
                <div>
                  <Label htmlFor="agent-name">Agent name</Label>
                  <Input
                    id="agent-name"
                    value={agentForm.name}
                    onChange={(event) => setAgentForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="e.g., Compliance Scout"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="agent-handler">Handler ID</Label>
                  <Input
                    id="agent-handler"
                    value={agentForm.handler}
                    onChange={(event) => setAgentForm((prev) => ({ ...prev, handler: event.target.value }))}
                    placeholder="maps to handler.decl"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="agent-domains">Domains (comma separated)</Label>
                  <Input
                    id="agent-domains"
                    value={agentForm.domains}
                    onChange={(event) => setAgentForm((prev) => ({ ...prev, domains: event.target.value }))}
                    placeholder="Compliance, MESP"
                  />
                </div>
                <div>
                  <Label htmlFor="agent-intents">Intent tags (comma separated)</Label>
                  <Input
                    id="agent-intents"
                    value={agentForm.intentTags}
                    onChange={(event) => setAgentForm((prev) => ({ ...prev, intentTags: event.target.value }))}
                    placeholder="evidence, review"
                  />
                </div>
                <div>
                  <Label htmlFor="agent-capabilities">Capabilities (comma separated)</Label>
                  <Input
                    id="agent-capabilities"
                    value={agentForm.capabilities}
                    onChange={(event) => setAgentForm((prev) => ({ ...prev, capabilities: event.target.value }))}
                    placeholder="fraud, compliance, automation"
                  />
                </div>
                <div>
                  <Label htmlFor="agent-mcp">MCP tool name</Label>
                  <Input
                    id="agent-mcp"
                    value={agentForm.mcpTool}
                    onChange={(event) => setAgentForm((prev) => ({ ...prev, mcpTool: event.target.value }))}
                    placeholder="compliance_scout"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="agent-description">Description</Label>
                  <Textarea
                    id="agent-description"
                    rows={2}
                    value={agentForm.description}
                    onChange={(event) => setAgentForm((prev) => ({ ...prev, description: event.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="agent-params">Default params (JSON)</Label>
                  <Textarea
                    id="agent-params"
                    rows={2}
                    value={agentForm.defaultParams}
                    onChange={(event) => setAgentForm((prev) => ({ ...prev, defaultParams: event.target.value }))}
                    placeholder='{ "temperature": 0.1 }'
                  />
                </div>
                <Button type="submit" disabled={saving} className="w-full">
                  {saving ? 'Saving…' : 'Register agent'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
