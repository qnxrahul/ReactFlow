import { CommonModule } from '@angular/common'
import { Component, ViewChild, computed, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { FFlowModule, type FCreateConnectionEvent, type FCreateNodeEvent, type FMoveNodesEvent, FZoomDirective } from '@foblex/flow'
import type { IPoint } from '@foblex/2d'
import { RouterLink } from '@angular/router'
import { FastAgentService } from './fast-agent.service'
import type { CanvasEdge, CanvasNode, PaletteItem, ReportNodeData, TurboNodeData, WorkflowJson } from './models'

function nowId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

@Component({
  selector: 'app-flow-canvas-page',
  standalone: true,
  imports: [CommonModule, FormsModule, FFlowModule, RouterLink],
  templateUrl: './flow-canvas.page.html',
  styleUrl: './flow-canvas.page.css',
})
export class FlowCanvasPageComponent {
  @ViewChild('zoom', { read: FZoomDirective })
  protected zoom?: FZoomDirective

  protected readonly palette: PaletteItem[] = [
    { type: 'input', label: 'Input' },
    { type: 'action', label: 'Action' },
    { type: 'decision', label: 'Decision' },
    { type: 'output', label: 'Output' },
    { type: 'report', label: 'AI Report' },
  ]

  protected readonly nodes = signal<CanvasNode[]>([
    {
      id: 'n-1',
      type: 'turbo',
      position: { x: 150, y: 100 },
      data: { title: 'Start', subtitle: 'trigger', status: 'idle' } satisfies TurboNodeData,
    },
  ])
  protected readonly edges = signal<CanvasEdge[]>([])

  protected readonly selectedNodeId = signal<string | null>(null)
  protected readonly selectedNode = computed(() => {
    const id = this.selectedNodeId()
    if (!id) return null
    return this.nodes().find((n) => n.id === id) ?? null
  })

  protected readonly contextMenu = signal<{ id: string; x: number; y: number } | null>(null)

  protected readonly agentPrompt = signal('')

  constructor(private readonly fastAgent: FastAgentService) {}

  protected outputId(nodeId: string) {
    return `o:${nodeId}`
  }

  protected inputId(nodeId: string) {
    return `i:${nodeId}`
  }

  protected selectNode(nodeId: string) {
    this.selectedNodeId.set(nodeId)
    this.contextMenu.set(null)
  }

  protected clearContextMenu() {
    this.contextMenu.set(null)
  }

  protected openContextMenu(evt: MouseEvent, nodeId: string) {
    evt.preventDefault()
    evt.stopPropagation()
    this.selectNode(nodeId)
    this.contextMenu.set({ id: nodeId, x: evt.clientX, y: evt.clientY })
  }

  protected onCreateNode(evt: FCreateNodeEvent<PaletteItem>) {
    const item = evt.data
    if (!item?.type) return

    const pos = this.positionFromDrop(evt.fDropPosition, evt.rect)
    const id = nowId('n')

    if (item.type === 'report') {
      const data: ReportNodeData = {
        title: 'AI Report',
        subtitle: 'summary',
        summary: 'Drop a connection into this report and run upstream nodes.',
        confidence: 0.86,
      }
      this.nodes.update((prev) => prev.concat({ id, type: 'report', position: pos, data }))
      this.selectedNodeId.set(id)
      return
    }

    const data: TurboNodeData = {
      title: item.label,
      subtitle: item.type,
      status: 'idle',
    }
    this.nodes.update((prev) => prev.concat({ id, type: 'turbo', position: pos, data }))
    this.selectedNodeId.set(id)
  }

  protected onCreateConnection(evt: FCreateConnectionEvent) {
    if (!evt.fInputId) return
    this.edges.update((prev) =>
      prev.concat({
        id: nowId('e'),
        outputId: evt.fOutputId,
        inputId: evt.fInputId!,
      }),
    )
  }

  protected onMoveNodes(evt: FMoveNodesEvent) {
    const moved = new Map(evt.fNodes.map((n) => [n.id, n.position]))
    if (moved.size === 0) return
    this.nodes.update((prev) =>
      prev.map((n) => {
        const next = moved.get(n.id)
        return next ? { ...n, position: { x: next.x, y: next.y } } : n
      }),
    )
  }

  protected zoomIn() {
    this.zoom?.zoomIn()
  }

  protected zoomOut() {
    this.zoom?.zoomOut()
  }

  protected resetZoom() {
    this.zoom?.reset()
  }

  protected exportJson() {
    const workflow: WorkflowJson = { nodes: this.nodes(), edges: this.edges() }
    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'workflow.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  protected async importJson(file: File | null | undefined) {
    if (!file) return
    try {
      const txt = await file.text()
      const parsed = JSON.parse(txt) as Partial<WorkflowJson>
      if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) return
      this.nodes.set(parsed.nodes as CanvasNode[])
      this.edges.set(parsed.edges as CanvasEdge[])
      this.selectedNodeId.set(null)
      this.contextMenu.set(null)
    } catch {
      // ignore invalid JSON
    }
  }

  protected updateSelectedNodeTitle(next: string) {
    const id = this.selectedNodeId()
    if (!id) return
    this.nodes.update((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n
        if (n.type !== 'turbo') return n
        return { ...n, data: { ...(n.data as TurboNodeData), title: next } }
      }),
    )
  }

  protected updateSelectedNodeType(next: string) {
    const id = this.selectedNodeId()
    if (!id) return
    this.nodes.update((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n
        if (n.type !== 'turbo') return n
        return { ...n, data: { ...(n.data as TurboNodeData), subtitle: next } }
      }),
    )
  }

  protected updateSelectedNodeSubtitle(next: string) {
    this.updateSelectedNodeType(next)
  }

  protected async executeNode(nodeId: string, input?: string) {
    const node = this.nodes().find((n) => n.id === nodeId)
    if (!node || node.type !== 'turbo') return

    const nodeType = ((node.data as TurboNodeData)?.subtitle ?? 'action').toString()
    this.nodes.update((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, data: { ...(n.data as TurboNodeData), status: 'running' } } : n)),
    )

    try {
      const res = await this.fastAgent.runNode({ type: nodeType, input })
      this.nodes.update((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...(n.data as TurboNodeData), status: 'success', output: res.output } }
            : n,
        ),
      )

      // Push output into connected report nodes
      const targetNodeIds = this.edges()
        .filter((e) => e.outputId === this.outputId(nodeId))
        .map((e) => this.nodeIdFromInputId(e.inputId))
        .filter((x): x is string => Boolean(x))

      this.nodes.update((prev) =>
        prev.map((n) => {
          if (n.type !== 'report' || !targetNodeIds.includes(n.id)) return n
          const rd = (n.data as ReportNodeData) ?? ({} as ReportNodeData)
          return {
            ...n,
            data: {
              ...rd,
              summary: res.output,
              confidence: rd.confidence ?? Math.round((0.65 + Math.random() * 0.3) * 100) / 100,
            },
          }
        }),
      )
    } catch (e) {
      this.nodes.update((prev) =>
        prev.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...(n.data as TurboNodeData), status: 'error', output: String(e) } }
            : n,
        ),
      )
    }
  }

  protected async executeFrom(startId: string) {
    const nodes = this.nodes()
    const edges = this.edges()

    const visited = new Set<string>()
    const queue: string[] = [startId]
    const produced: Record<string, string> = {}

    while (queue.length) {
      const current = queue.shift()!
      if (visited.has(current)) continue
      visited.add(current)

      const preds = edges
        .filter((e) => this.nodeIdFromInputId(e.inputId) === current)
        .map((e) => this.nodeIdFromOutputId(e.outputId))
        .filter((x): x is string => Boolean(x))

      const input = preds.map((p) => produced[p]).filter(Boolean).join('\n') || undefined
      const n = nodes.find((x) => x.id === current)
      if (n?.type === 'turbo') {
        await this.executeNode(current, input)
        const latest = this.nodes().find((x) => x.id === current)
        const output = latest?.type === 'turbo' ? (latest.data as TurboNodeData).output : undefined
        if (output) produced[current] = output
      }

      const next = edges
        .filter((e) => this.nodeIdFromOutputId(e.outputId) === current)
        .map((e) => this.nodeIdFromInputId(e.inputId))
        .filter((x): x is string => Boolean(x))

      queue.push(...next)
    }
  }

  protected duplicateNode(nodeId: string) {
    const n = this.nodes().find((x) => x.id === nodeId)
    if (!n) return
    const newId = nowId('n')
    this.nodes.update((prev) =>
      prev.concat({
        ...n,
        id: newId,
        position: { x: n.position.x + 40, y: n.position.y + 40 },
      }),
    )
    this.selectedNodeId.set(newId)
  }

  protected deleteNode(nodeId: string) {
    const out = this.outputId(nodeId)
    const inp = this.inputId(nodeId)
    this.nodes.update((prev) => prev.filter((n) => n.id !== nodeId))
    this.edges.update((prev) => prev.filter((e) => e.outputId !== out && e.inputId !== inp))
    if (this.selectedNodeId() === nodeId) this.selectedNodeId.set(null)
    this.contextMenu.set(null)
  }

  protected async runSelectedNode() {
    const id = this.selectedNodeId()
    if (!id) return
    await this.executeNode(id)
  }

  protected async runFromSelectedNode() {
    const id = this.selectedNodeId()
    if (!id) return
    await this.executeFrom(id)
  }

  protected async runWithAgentPrompt() {
    const node = this.selectedNode()
    if (!node || node.type !== 'turbo') return
    const prompt = this.agentPrompt().trim()
    const input = prompt.length > 0 ? prompt : `Help me reason about node "${(node.data as TurboNodeData).title}".`
    await this.executeNode(node.id, input)
  }

  private positionFromDrop(drop: IPoint | undefined, rect: { x: number; y: number; width: number; height: number }) {
    if (drop && typeof drop.x === 'number' && typeof drop.y === 'number') {
      return { x: Math.round(drop.x), y: Math.round(drop.y) }
    }
    return { x: Math.round(rect.x), y: Math.round(rect.y) }
  }

  private nodeIdFromOutputId(outputId: string): string | null {
    const match = /^o:(.+)$/.exec(outputId)
    return match?.[1] ?? null
  }

  private nodeIdFromInputId(inputId: string): string | null {
    const match = /^i:(.+)$/.exec(inputId)
    return match?.[1] ?? null
  }
}

