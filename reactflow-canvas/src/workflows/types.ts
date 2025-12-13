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
  inputs?: string[]
  outputs?: string[]
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
  preferredHandlers?: string[]
  contextKeywords?: string[]
}

export type RunWorkflowNodeResponse = {
  status: WorkflowNodeRuntime['status']
  output: string
  lastRunAt: string
}

export type ComponentDefinition = {
  id: string
  type: string
  label: string
  baseRenderer: 'agentCard' | 'evidenceCard' | 'decisionCard' | 'reportCard'
  description?: string | null
  category?: string | null
  defaultProps?: Record<string, unknown>
}

export type HandlerDefinition = {
  id: string
  handler: string
  kind: WorkflowNodeBehavior['kind']
  description?: string | null
  defaultPrompt?: string | null
}

export type AgentDefinition = {
  id: string
  name: string
  handler: string
  description?: string | null
  domains: string[]
  intentTags: string[]
  mcpTool: string
  capabilities?: string[]
  isGlobal?: boolean
}

export type AgentRunResponse = {
  status: WorkflowNodeRuntime['status']
  output: string
  logs?: string[]
}

export type WorkflowAssistRequest = {
  question: string
  workflowId?: string
  domain?: string
  intent?: string
  description?: string
  contextKeywords?: string[]
  preferredHandlers?: string[]
  context?: Record<string, unknown>
}

export type WorkflowAssistResponse = {
  answer: string
  suggestedNodes: WorkflowNode[]
  workflow?: WorkflowDefinition
}

export type WorkflowCatalogItem = {
  id: string
  title: string
  description?: string | null
  category?: string | null
  tags?: string[]
  domains?: string[]
  source?: string | null
  inputs?: WorkflowInputField[]
  definition: WorkflowDefinition
}

export type WorkflowInputField = {
  id: string
  label: string
  placeholder?: string
  required?: boolean
  helperText?: string
}

export type WorkflowExecutionStep = {
  nodeId: string
  name: string
  handler?: string
  agentId?: string
  agentName?: string
  status: WorkflowNodeRuntime['status']
  output?: string
  startedAt: string
  finishedAt: string
}

export type WorkflowExecutionResponse = {
  workflowId: string
  requestId: string
  status: WorkflowNodeRuntime['status']
  steps: WorkflowExecutionStep[]
  startedAt: string
  finishedAt: string
}
