export type NodeType = 'input' | 'action' | 'decision' | 'output' | 'turbo' | 'report'

export type TurboNodeData = {
  title: string
  subtitle?: string
  status?: 'idle' | 'running' | 'success' | 'error'
  output?: string
}

export type ReportNodeData = {
  title: string
  subtitle?: string
  summary?: string
  confidence?: number
}

export type CanvasNode = {
  id: string
  type: 'turbo' | 'report'
  position: { x: number; y: number }
  data: TurboNodeData | ReportNodeData
}

export type CanvasEdge = {
  id: string
  outputId: string
  inputId: string
}

export type WorkflowJson = {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

export type PaletteItem = {
  type: NodeType
  label: string
}
