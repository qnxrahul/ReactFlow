export type WorkflowNodeUI = {
  componentType: string
  props: Record<string, unknown>
}

export type WorkflowNodeBehavior = {
  kind: 'llm-agent' | 'service' | 'human-task'
  handler: string
  promptTemplateId?: string | null
  tools?: string[]
}

export type WorkflowNodeRuntime = {
  status: 'idle' | 'running' | 'success' | 'error'
  output?: string
  lastRunAt?: string
}

export type WorkflowNode = {
  id: string
  type: string
  name: string
  description?: string | null
  ui: WorkflowNodeUI
  behavior: WorkflowNodeBehavior
  runtime?: WorkflowNodeRuntime
}

export type WorkflowEdge = {
  id: string
  source: string
  target: string
  label?: string | null
  condition?: string | null
}

export type WorkflowDefinition = {
  id: string
  title: string
  domain: string
  intent?: string | null
  source: 'template' | 'generated' | 'uploaded'
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  createdAt: string
  updatedAt: string
}

export type GenerateWorkflowPayload = {
  domain: string
  intent: string
  description?: string
}

export type RunWorkflowNodeResponse = {
  status: WorkflowNodeRuntime['status']
  output: string
  lastRunAt: string
}
