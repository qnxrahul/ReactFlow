import { memo } from 'react'
import { FiLayers, FiPlay, FiZap } from 'react-icons/fi'

import { cn } from '../lib/utils'
import type { WorkflowCatalogItem } from '../workflows/types'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

type MafWorkflowToolbarProps = {
  workflows: WorkflowCatalogItem[]
  loading?: boolean
  fetchError?: string | null
  contextKeywords?: string[]
  activeWorkflowId?: string | null
  runningWorkflowId?: string | null
  onLoadWorkflow: (workflowId: string) => void
  onRunWorkflow: (workflowId: string) => void
}

function MafWorkflowToolbarComponent({
  workflows,
  loading,
  fetchError,
  contextKeywords,
  activeWorkflowId,
  runningWorkflowId,
  onLoadWorkflow,
  onRunWorkflow,
}: MafWorkflowToolbarProps) {
  return (
    <section className="border-b border-slate-200 bg-white/95 px-6 py-4 text-slate-900 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Workflow toolbar</p>
          <p className="text-sm text-slate-600">
            Pull curated MAF workflows onto the canvas and run them with MCP.
          </p>
        </div>
        {contextKeywords && contextKeywords.length > 0 && (
          <span className="flex items-center gap-1 text-[11px] text-slate-500">
            <FiZap className="h-3 w-3 text-amber-500" />
            <span className="max-w-[260px] truncate">{contextKeywords.join(', ')}</span>
          </span>
        )}
      </div>
      {fetchError && <p className="mt-3 text-xs text-red-600">{fetchError}</p>}
      <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading workflows…</p>
        ) : workflows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No workflows matched this context yet.</p>
        ) : (
          workflows.map((workflow) => {
            const isActive = activeWorkflowId === workflow.id
            const isRunning = runningWorkflowId === workflow.id
            const inputLabels = (workflow.inputs ?? []).map((input) => input.label).filter(Boolean)
            return (
              <div
                key={workflow.id}
                className={cn(
                  'min-w-[260px] max-w-[300px] shrink-0 rounded-2xl border bg-white p-4 shadow-sm transition-all',
                  isActive ? 'border-emerald-200 ring-1 ring-emerald-200' : 'border-slate-200',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{workflow.title}</p>
                    {workflow.description && <p className="text-xs text-slate-500">{workflow.description}</p>}
                  </div>
                  <Badge variant={isActive ? 'success' : 'outline'} className="text-[10px] uppercase">
                    {isActive ? 'Loaded' : workflow.category || 'MAF'}
                  </Badge>
                </div>
                {workflow.domains && workflow.domains.length > 0 && (
                  <p className="mt-2 text-[11px] uppercase tracking-wide text-slate-400">
                    {workflow.domains.join(' • ')}
                  </p>
                )}
                {workflow.tags && workflow.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                    {workflow.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {inputLabels.length > 0 && (
                  <p className="mt-2 text-[11px] text-slate-500">
                    Requires: {inputLabels.join(', ')}
                  </p>
                )}
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
                  <Button
                    type="button"
                    size="sm"
                    disabled={isRunning}
                    onClick={() => onRunWorkflow(workflow.id)}
                  >
                    <FiPlay className="mr-1 h-3.5 w-3.5" />
                    {isRunning ? 'Running…' : 'Run in MCP'}
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

export const MafWorkflowToolbar = memo(MafWorkflowToolbarComponent)
