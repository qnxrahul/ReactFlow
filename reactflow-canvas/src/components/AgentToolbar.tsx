import { memo } from 'react'
import { FiPlay, FiPlus, FiZap } from 'react-icons/fi'

import { cn } from '../lib/utils'
import type { AgentDefinition } from '../workflows/types'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

type AgentToolbarProps = {
  agents: AgentDefinition[]
  selectedAgentIds: string[]
  onToggleAgent: (agentId: string) => void
  onRunAgent: (agentId: string) => void
  onInsertAgent?: (agent: AgentDefinition) => void
  loading?: boolean
  busyAgentId?: string | null
  fetchError?: string | null
  actionError?: string | null
  contextKeywords?: string[]
  lastRunOutput?: string | null
  matchScores?: Record<string, number>
}

function AgentToolbarComponent({
  agents,
  selectedAgentIds,
  onToggleAgent,
  onRunAgent,
  onInsertAgent,
  loading,
  busyAgentId,
  fetchError,
  actionError,
  contextKeywords,
  lastRunOutput,
  matchScores,
}: AgentToolbarProps) {
  return (
    <section className="border-b border-slate-200 bg-white/95 px-6 py-4 text-slate-900 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Agent toolbar</p>
          <p className="text-sm text-slate-600">Pull existing MCP agents into the workflow or let the LLM planner decide.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <Badge variant="outline" className="text-[11px]">
            {selectedAgentIds.length} prioritized
          </Badge>
          {contextKeywords && contextKeywords.length > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <FiZap className="h-3 w-3 text-amber-500" />
              <span className="max-w-[220px] truncate">{contextKeywords.join(', ')}</span>
            </span>
          )}
        </div>
      </div>
      {fetchError && <p className="mt-3 text-xs text-red-600">{fetchError}</p>}
      {actionError && <p className="mt-1 text-xs text-amber-600">{actionError}</p>}
      <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading agents…</p>
        ) : agents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No agents matched this context.</p>
        ) : (
          agents.map((agent) => {
            const selected = selectedAgentIds.includes(agent.id)
            const matchScore = matchScores?.[agent.id] ?? 0
            return (
              <div
                key={agent.id}
                className={cn(
                  'min-w-[240px] max-w-[280px] shrink-0 rounded-2xl border bg-white p-4 shadow-sm transition-all',
                  selected ? 'border-emerald-200 ring-1 ring-emerald-200' : 'border-slate-200',
                  matchScore > 0 && !selected && 'border-amber-200 ring-1 ring-amber-100',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{agent.name}</p>
                    <p className="text-xs text-slate-500">{agent.handler}</p>
                  </div>
                  <Badge variant={selected ? 'success' : 'outline'} className="text-[10px] uppercase">
                    {selected ? 'Pinned' : agent.mcpTool || 'Agent'}
                  </Badge>
                </div>
                {matchScore > 0 && (
                  <p className="mt-1 text-[11px] font-medium text-amber-600">Matches current audit context</p>
                )}
                {agent.description && <p className="mt-2 text-xs text-slate-500">{agent.description}</p>}
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-500">
                  {agent.domains.slice(0, 2).map((domain) => (
                    <span key={domain} className="rounded-full bg-slate-100 px-2 py-0.5">
                      {domain}
                    </span>
                  ))}
                  {(agent.capabilities ?? []).slice(0, 2).map((capability) => (
                    <span key={capability} className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                      {capability}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={selected ? 'secondary' : 'outline'}
                    onClick={() => onToggleAgent(agent.id)}
                  >
                    {selected ? 'Prioritized' : 'Prioritize'}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => onRunAgent(agent.id)}>
                    <FiPlay className="mr-1 h-3.5 w-3.5" />
                    Run
                  </Button>
                  {onInsertAgent && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onInsertAgent(agent)}
                      disabled={busyAgentId === agent.id}
                    >
                      <FiPlus className="mr-1 h-3.5 w-3.5" />
                      {busyAgentId === agent.id ? 'Adding…' : 'Add to workflow'}
                    </Button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
      {lastRunOutput && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Last agent run</p>
          <p className="mt-1 whitespace-pre-wrap text-slate-700">{lastRunOutput}</p>
        </div>
      )}
    </section>
  )
}

export const AgentToolbar = memo(AgentToolbarComponent)
