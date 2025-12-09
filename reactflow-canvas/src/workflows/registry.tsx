import type { ReactNode } from 'react'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card'
import { Progress } from '../components/ui/progress'
import { cn } from '../lib/utils'
import type { WorkflowNode } from './types'

export type NodeRendererProps = {
  node: WorkflowNode
  onRun?: () => void
}

export type NodeRenderer = (props: NodeRendererProps) => ReactNode

const registry = new Map<string, NodeRenderer>()

registry.set('agentCard', ({ node, onRun }) => {
  const status = node.runtime?.status ?? 'idle'
  const variant = status === 'success' ? 'success' : status === 'error' ? 'destructive' : 'default'
  return (
    <Card className="w-[240px] border-l-4 border-l-accent">
      <CardHeader className="space-y-2">
        <CardTitle className="text-base">{node.name}</CardTitle>
        <CardDescription>{node.description}</CardDescription>
        <Badge variant={variant}>{status}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {(node.runtime?.output as string) || 'Awaiting execution...'}
        </p>
        <Button size="sm" className="w-full" onClick={onRun}>
          Run Agent
        </Button>
      </CardContent>
    </Card>
  )
})

registry.set('evidenceCard', ({ node, onRun }) => {
  const progress = typeof node.runtime?.output === 'string' ? Math.min(node.runtime.output.length * 3, 100) : 0
  return (
    <Card className="w-[260px]">
      <CardHeader>
        <CardTitle className="text-base">{node.name}</CardTitle>
        <CardDescription>{node.ui.props?.subtitle as string}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={progress} />
        <p className="text-xs text-muted-foreground">{node.description}</p>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" className="w-full" onClick={onRun}>
          Collect Evidence
        </Button>
      </CardFooter>
    </Card>
  )
})

registry.set('decisionCard', ({ node, onRun }) => (
  <Card className="w-[220px] border-dashed border-2">
    <CardHeader>
      <CardTitle className="text-base">{node.name}</CardTitle>
      <CardDescription>{node.description}</CardDescription>
    </CardHeader>
    <CardContent>
      <Badge variant="warning">Decision</Badge>
    </CardContent>
    <CardFooter>
      <Button size="sm" className="w-full" onClick={onRun}>
        Evaluate
      </Button>
    </CardFooter>
  </Card>
))

export function getNodeRenderer(type: string): NodeRenderer {
  return registry.get(type) ?? (({ node }) => (
    <Card className="w-[240px]">
      <CardHeader>
        <CardTitle className="text-base">{node.name}</CardTitle>
        <CardDescription>Unmapped component: {type}</CardDescription>
      </CardHeader>
      <CardContent>
        <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(node.ui.props, null, 2)}</pre>
      </CardContent>
    </Card>
  ))
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
