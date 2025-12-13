import type { ReactNode } from 'react'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card'
import { Progress } from '../components/ui/progress'
import { cn } from '../lib/utils'
import type { WorkflowInputField, WorkflowNode } from './types'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

export type NodeRendererProps = {
  node: WorkflowNode
  onRun?: () => void
  inputs?: Record<string, string>
  onInputChange?: (fieldId: string, value: string) => void
}

export type NodeRenderer = (props: NodeRendererProps) => ReactNode

function renderInputFields(
  fields: WorkflowInputField[] | undefined,
  inputs: Record<string, string> | undefined,
  onInputChange?: (fieldId: string, value: string) => void,
) {
  if (!fields || fields.length === 0) return null
  return (
    <div className="space-y-2">
      {fields.map((field) => (
        <div key={field.id} className="space-y-1">
          <Label className="text-[11px] uppercase tracking-wide text-slate-500">{field.label}</Label>
          <Input
            value={inputs?.[field.id] ?? ''}
            placeholder={field.placeholder}
            onChange={(event) => onInputChange?.(field.id, event.target.value)}
          />
          {field.helperText && <p className="text-[11px] text-slate-400">{field.helperText}</p>}
        </div>
      ))}
    </div>
  )
}

const baseRenderers: Record<string, NodeRenderer> = {
  agentCard: ({ node, onRun, inputs, onInputChange }) => {
    const status = node.runtime?.status ?? 'idle'
    const variant = status === 'success' ? 'success' : status === 'error' ? 'destructive' : 'default'
    const subtitle = (node.ui?.props?.subtitle as string) || ''
    const actions = Array.isArray(node.ui?.props?.actions) ? (node.ui?.props?.actions as Array<{ label: string }>) : []
    const fieldDefs = node.ui?.props?.__mafInputs as WorkflowInputField[] | undefined
    return (
      <Card className="w-[240px] border-l-4 border-l-accent">
        <CardHeader className="space-y-2">
          <CardTitle className="text-base">{node.name}</CardTitle>
          <CardDescription>{subtitle || node.description}</CardDescription>
          <Badge variant={variant}>{status}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{(node.runtime?.output as string) || 'Awaiting execution...'}</p>
          <div className="space-y-2">
            <Button size="sm" className="w-full" onClick={onRun}>
              Run Agent
            </Button>
            {actions.map((action) => (
              <Button key={action.label} variant="outline" size="sm" className="w-full">
                {action.label}
              </Button>
            ))}
            {renderInputFields(fieldDefs, inputs, onInputChange)}
          </div>
        </CardContent>
      </Card>
    )
  },
  evidenceCard: ({ node, onRun, inputs, onInputChange }) => {
    const progress = typeof node.runtime?.output === 'string' ? Math.min(node.runtime.output.length * 3, 100) : 0
    const subtitle = (node.ui?.props?.subtitle as string) || node.description
    const fieldDefs = node.ui?.props?.__mafInputs as WorkflowInputField[] | undefined
    return (
      <Card className="w-[260px]">
        <CardHeader>
          <CardTitle className="text-base">{node.name}</CardTitle>
          <CardDescription>{subtitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={progress} />
          <p className="text-xs text-muted-foreground">{node.description}</p>
          {renderInputFields(fieldDefs, inputs, onInputChange)}
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm" className="w-full" onClick={onRun}>
            Collect Evidence
          </Button>
        </CardFooter>
      </Card>
    )
  },
  decisionCard: ({ node, onRun, inputs, onInputChange }) => {
    const fieldDefs = node.ui?.props?.__mafInputs as WorkflowInputField[] | undefined
    return (
      <Card className="w-[220px] border-dashed border-2">
        <CardHeader>
          <CardTitle className="text-base">{node.name}</CardTitle>
          <CardDescription>{node.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Badge variant="warning">Decision</Badge>
          {renderInputFields(fieldDefs, inputs, onInputChange)}
        </CardContent>
        <CardFooter>
          <Button size="sm" className="w-full" onClick={onRun}>
            Evaluate
          </Button>
        </CardFooter>
      </Card>
    )
  },
  reportCard: ({ node, inputs, onInputChange }) => {
    const fieldDefs = node.ui?.props?.__mafInputs as WorkflowInputField[] | undefined
    return (
      <Card className="w-[260px]">
        <CardHeader>
          <CardTitle className="text-base">{node.name}</CardTitle>
          <CardDescription>{node.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-xs whitespace-pre-wrap">{node.runtime?.output || 'Report output will appear after execution.'}</pre>
          {renderInputFields(fieldDefs, inputs, onInputChange)}
        </CardContent>
      </Card>
    )
  },
}

const fallbackRenderer: NodeRenderer = ({ node }) => (
  <Card className="w-[240px]">
    <CardHeader>
      <CardTitle className="text-base">{node.name}</CardTitle>
      <CardDescription>Unmapped component: {node.ui.componentType}</CardDescription>
    </CardHeader>
    <CardContent>
      <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(node.ui.props, null, 2)}</pre>
    </CardContent>
  </Card>
)

export function getBaseRenderer(rendererType: string): NodeRenderer {
  return baseRenderers[rendererType] ?? fallbackRenderer
}

export function getFallbackRenderer(componentType: string): NodeRenderer {
  return ({ node, onRun, inputs, onInputChange }: NodeRendererProps) =>
    fallbackRenderer({
      node: {
        ...node,
        name: node.name || componentType,
      },
      onRun,
      inputs,
      onInputChange,
    })
}

export function nodeStatusClass(status: string | undefined) {
  return cn(
    'rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide',
    status === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
    status === 'error' && 'border-red-200 bg-red-50 text-red-700',
    status === 'running' && 'border-amber-200 bg-amber-50 text-amber-700',
    (!status || status === 'idle') && 'border-slate-200 bg-slate-50 text-slate-600',
  )
}
