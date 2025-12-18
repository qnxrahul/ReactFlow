import { memo } from 'react'
import { FiPlay } from 'react-icons/fi'

import { cn } from '../lib/utils'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

export type DevUiAgentItem = {
  id: string
  name: string
  description?: string | null
  tools?: string[] | null
}

type DevUiAgentToolbarProps = {
  agents: DevUiAgentItem[]
  loading?: boolean
  fetchError?: string | null
  runningAgentId?: string | null
  lastRunOutput?: string | null
  onRunAgent: (agentId: string) => void
}

function DevUiAgentToolbarComponent({
  agents,
  loading,
  fetchError,
  runningAgentId,
  lastRunOutput,
  onRunAgent,
}: DevUiAgentToolbarProps) {
  return (
    <section className="border-b border-slate-200 bg-white/95 px-6 py-4 text-slate-900 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Agent toolbar</p>
          <p className="text-sm text-slate-600">Agents registered in `dev_ui.py` (DevUI entities).</p>
        </div>
      </div>
      {fetchError && <p className="mt-3 text-xs text-red-600">{fetchError}</p>}
      <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading agents…</p>
        ) : agents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No DevUI agents found.</p>
        ) : (
          agents.map((agent) => {
            const isRunning = runningAgentId === agent.id
            const toolCount = agent.tools?.length ?? 0
            return (
              <div
                key={agent.id}
                className={cn('min-w-[240px] max-w-[300px] shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm')}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{agent.name}</p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      <span className="font-mono">{agent.id}</span>
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {toolCount > 0 ? `${toolCount} tools` : 'Agent'}
                  </Badge>
                </div>
                {agent.description && <p className="mt-2 text-xs text-slate-500">{agent.description}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" size="sm" disabled={isRunning} onClick={() => onRunAgent(agent.id)}>
                    <FiPlay className="mr-1 h-3.5 w-3.5" />
                    {isRunning ? 'Running…' : 'Run'}
                  </Button>
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

export const DevUiAgentToolbar = memo(DevUiAgentToolbarComponent)

