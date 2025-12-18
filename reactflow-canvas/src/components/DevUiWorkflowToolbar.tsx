import { memo } from 'react'
import { FiLayers, FiPlay } from 'react-icons/fi'

import { cn } from '../lib/utils'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

export type DevUiWorkflowItem = {
  id: string
  name: string
  description?: string | null
}

type DevUiWorkflowToolbarProps = {
  workflows: DevUiWorkflowItem[]
  loading?: boolean
  fetchError?: string | null
  activeWorkflowId?: string | null
  runningWorkflowId?: string | null
  onLoadWorkflow: (workflowId: string) => void
  onRunWorkflow: (workflowId: string) => void
}

function DevUiWorkflowToolbarComponent({
  workflows,
  loading,
  fetchError,
  activeWorkflowId,
  runningWorkflowId,
  onLoadWorkflow,
  onRunWorkflow,
}: DevUiWorkflowToolbarProps) {
  return (
    <section className="border-b border-slate-200 bg-white/95 px-6 py-4 text-slate-900 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Workflow toolbar</p>
          <p className="text-sm text-slate-600">Workflows registered in `dev_ui.py` (DevUI entities).</p>
        </div>
      </div>
      {fetchError && <p className="mt-3 text-xs text-red-600">{fetchError}</p>}
      <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading workflows…</p>
        ) : workflows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No DevUI workflows found.</p>
        ) : (
          workflows.map((workflow) => {
            const isActive = activeWorkflowId === workflow.id
            const isRunning = runningWorkflowId === workflow.id
            return (
              <div
                key={workflow.id}
                className={cn(
                  'min-w-[260px] max-w-[320px] shrink-0 rounded-2xl border bg-white p-4 shadow-sm transition-all',
                  isActive ? 'border-emerald-200 ring-1 ring-emerald-200' : 'border-slate-200',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{workflow.name}</p>
                    {workflow.description && <p className="text-xs text-slate-500">{workflow.description}</p>}
                    <p className="mt-1 text-[11px] text-slate-400">
                      <span className="font-mono">{workflow.id}</span>
                    </p>
                  </div>
                  <Badge variant={isActive ? 'success' : 'outline'} className="text-[10px] uppercase">
                    {isActive ? 'Loaded' : 'DevUI'}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={isActive ? 'secondary' : 'outline'}
                    onClick={() => onLoadWorkflow(workflow.id)}
                  >
                    <FiLayers className="mr-1 h-3.5 w-3.5" />
                    {isActive ? 'On canvas' : 'Load diagram'}
                  </Button>
                  <Button type="button" size="sm" disabled={isRunning} onClick={() => onRunWorkflow(workflow.id)}>
                    <FiPlay className="mr-1 h-3.5 w-3.5" />
                    {isRunning ? 'Running…' : 'Run'}
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}

export const DevUiWorkflowToolbar = memo(DevUiWorkflowToolbarComponent)

