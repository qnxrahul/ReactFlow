import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import '../flow.css'
import { FiPlay, FiZap, FiGitBranch, FiCheckCircle } from 'react-icons/fi'
import {
  Input,
  Divider,
  Label,
  Toolbar,
  ToolbarButton,
  ToolbarDivider,
  ToolbarGroup,
  makeStyles,
  Caption1,
  Title3,
  tokens,
} from '@fluentui/react-components'

type NodeType = 'turbo' | 'report'
type TurboData = { title: string; subtitle?: string; icon?: React.ReactNode }
type ReportData = {
  title: string
  subtitle?: string
  imageSrc?: string
  summary?: string
  chartLabels?: string[]
  chartData?: number[]
  confidence?: number
}
type UINode = { id: string; type: NodeType; x: number; y: number; data: TurboData | ReportData }
type UIEdge = { id: string; source: string; target: string }

const useStyles = makeStyles({
  root: { display: 'grid', gridTemplateColumns: '280px 1fr 320px', gridTemplateRows: '100vh', background: '#0b0b0c', color: '#e5e7eb' },
  left: { borderRight: `1px solid ${tokens.colorNeutralStroke2}`, padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' },
  right: { borderLeft: `1px solid ${tokens.colorNeutralStroke2}`, padding: '12px', overflow: 'auto' },
  canvas: { position: 'relative', height: '100vh', background: '#0b0b0c' },
  paletteItem: { border: `1px dashed ${tokens.colorNeutralStroke2}`, padding: '8px 10px', borderRadius: '8px', cursor: 'grab', background: tokens.colorNeutralBackground1 },
  topbar: { position: 'absolute', top: '8px', left: '8px', display: 'flex', gap: '8px', background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(6px)', border: `1px solid ${tokens.colorNeutralStroke2}`, padding: '6px 8px', borderRadius: '8px', zIndex: 5 as any },
  nodeBox: { position: 'absolute', border: `1px solid ${tokens.colorNeutralStroke2}`, borderRadius: '10px', background: '#111316', color: '#e5e7eb', boxShadow: '0 8px 24px rgba(0,0,0,.3)' },
  nodeHeader: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderBottom: `1px solid ${tokens.colorNeutralStroke2}`, cursor: 'grab', userSelect: 'none' },
  nodeBody: { padding: '10px 12px' },
  selected: { outline: '2px solid #2a8af6' },
})

export default function FluentCanvas() {
  const classes = useStyles()
  const [nodes, setNodes] = useState<UINode[]>([])
  const [edges, setEdges] = useState<UIEdge[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [connectMode, setConnectMode] = useState(false)
  const [pendingSource, setPendingSource] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null)

  const onDragStartPalette = (evt: React.DragEvent, type: string) => {
    evt.dataTransfer.setData('application/fluent-canvas', type)
    evt.dataTransfer.effectAllowed = 'move'
  }

  const onDrop = useCallback((evt: React.DragEvent) => {
    evt.preventDefault()
    const bounds = canvasRef.current!.getBoundingClientRect()
    const type = (evt.dataTransfer.getData('application/fluent-canvas') || evt.dataTransfer.getData('application/reactflow')) as string
    if (!type) return
    const x = evt.clientX - bounds.left
    const y = evt.clientY - bounds.top
    const id = `n-${Date.now()}`
    if (type === 'report') {
      const data: ReportData = {
        title: 'AI Report',
        subtitle: 'summary',
        imageSrc: 'https://picsum.photos/seed/ai-fluent/200/120',
        summary: 'Fluent UI card with mock analytics and controls.',
        chartData: [8, 6, 4, 9, 7, 5],
        chartLabels: ['A', 'B', 'C', 'D', 'E', 'F'],
        confidence: 0.73,
      }
      setNodes((nds) => nds.concat({ id, type: 'report', x, y, data }))
    } else {
      const icon = type === 'input' ? <FiPlay /> : type === 'action' ? <FiZap /> : type === 'decision' ? <FiGitBranch /> : type === 'output' ? <FiCheckCircle /> : undefined
      const data: TurboData = { title: type.charAt(0).toUpperCase() + type.slice(1), subtitle: type, icon }
      setNodes((nds) => nds.concat({ id, type: 'turbo', x, y, data }))
    }
  }, [])

  const onDragOver = useCallback((evt: React.DragEvent) => {
    evt.preventDefault()
    evt.dataTransfer.dropEffect = 'move'
  }, [])

  const onMouseMove = useCallback((evt: MouseEvent) => {
    if (!dragRef.current || !canvasRef.current) return
    const bounds = canvasRef.current.getBoundingClientRect()
    const x = evt.clientX - bounds.left - dragRef.current.offsetX
    const y = evt.clientY - bounds.top - dragRef.current.offsetY
    const id = dragRef.current.id
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, x, y } : n)))
  }, [])

  const onMouseUp = useCallback(() => {
    dragRef.current = null
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [onMouseMove, onMouseUp])

  const beginDrag = (evt: React.MouseEvent, id: string) => {
    if (!canvasRef.current) return
    const bounds = (evt.currentTarget as HTMLElement).closest('[data-node]') as HTMLElement
    const rect = bounds.getBoundingClientRect()
    dragRef.current = {
      id,
      offsetX: evt.clientX - rect.left,
      offsetY: evt.clientY - rect.top,
    }
    evt.stopPropagation()
  }

  const nodeSize = (node: UINode) => {
    if (node.type === 'report') return { w: 320, h: 260 }
    return { w: 200, h: 80 }
  }

  const centers = (node: UINode) => {
    const { w, h } = nodeSize(node)
    return { cx: node.x + w / 2, cy: node.y + h / 2, w, h }
  }

  const handleNodeClick = (id: string) => {
    if (connectMode) {
      if (!pendingSource) {
        setPendingSource(id)
      } else if (pendingSource && pendingSource !== id) {
        const edgeId = `e-${pendingSource}-${id}-${Date.now()}`
        setEdges((eds) => eds.concat({ id: edgeId, source: pendingSource, target: id }))
        setPendingSource(null)
        setConnectMode(false)
      }
    } else {
      setSelectedNodeId(id)
    }
  }

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId), [nodes, selectedNodeId])

  const updateSelectedNode = (updates: Partial<TurboData & ReportData>) => {
    if (!selectedNodeId) return
    setNodes((nds) => nds.map((n) => (n.id === selectedNodeId ? { ...n, data: { ...(n.data as any), ...updates } } : n)))
  }

  const exportJson = () => {
    const workflow = { nodes, edges }
    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'workflow.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  // const importJson = async (file: File) => {
  //   const txt = await file.text()
  //   try {
  //     const { nodes: n, edges: e } = JSON.parse(txt)
  //     setNodes(n)
  //     setEdges(e)
  //   } catch {}
  // }

  return (
    <div className={classes.root}>
      <div className={classes.left}>
        <Title3>Palette</Title3>
        <Divider />
        {[
          { type: 'input', label: 'Input' },
          { type: 'action', label: 'Action' },
          { type: 'decision', label: 'Decision' },
          { type: 'output', label: 'Output' },
          { type: 'report', label: 'AI Report' },
        ].map((p) => (
          <div key={p.type} className={classes.paletteItem} draggable onDragStart={(e) => onDragStartPalette(e, p.type)}>
            {p.label}
          </div>
        ))}
      </div>

      <div className={classes.canvas} ref={canvasRef} onDrop={onDrop} onDragOver={onDragOver}>
        <div className={classes.topbar}>
          <Toolbar>
            <ToolbarGroup>
              <ToolbarButton onClick={() => { setNodes([]); setEdges([]) }}>Clear</ToolbarButton>
              <ToolbarDivider />
              <ToolbarButton appearance={connectMode ? 'primary' : 'subtle'} onClick={() => setConnectMode((v) => !v)}>
                {connectMode ? 'Connecting…' : 'Connect'}
              </ToolbarButton>
              <ToolbarDivider />
              <ToolbarButton onClick={exportJson}>Export</ToolbarButton>
            </ToolbarGroup>
          </Toolbar>
        </div>

        <svg className="edges-svg" width="100%" height="100%" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <defs>
            <linearGradient id="edge-gradient">
              <stop offset="0%" stopColor="#ae53ba" />
              <stop offset="100%" stopColor="#2a8af6" />
            </linearGradient>
          </defs>
          {edges.map((e) => {
            const s = nodes.find((n) => n.id === e.source)
            const t = nodes.find((n) => n.id === e.target)
            if (!s || !t) return null
            const sc = centers(s)
            const tc = centers(t)
            const x1 = sc.cx + sc.w / 2
            const y1 = sc.cy
            const x2 = tc.cx - tc.w / 2
            const y2 = tc.cy
            const c1x = x1 + 80, c1y = y1
            const c2x = x2 - 80, c2y = y2
            const d = `M ${x1},${y1} C ${c1x},${c1y} ${c2x},${c2y} ${x2},${y2}`
            return <path key={e.id} d={d} stroke="url(#edge-gradient)" strokeWidth={2} strokeOpacity={0.75} fill="none" />
          })}
        </svg>

        {nodes.map((n) => (
          <div
            key={n.id}
            data-node
            className={`${classes.nodeBox} ${n.id === selectedNodeId ? classes.selected : ''}`}
            style={{ left: n.x, top: n.y, width: n.type === 'report' ? 320 : 200 }}
            onClick={(e) => { e.stopPropagation(); handleNodeClick(n.id) }}
          >
            <div className={classes.nodeHeader} onMouseDown={(e) => beginDrag(e, n.id)}>
              {n.type === 'turbo' && (n.data as TurboData).icon}
              <strong>{(n.data as any).title}</strong>
              <span style={{ opacity: 0.7, marginLeft: 6 }}>{(n.data as any).subtitle}</span>
            </div>
            <div className={classes.nodeBody}>
              {n.type === 'report' ? (
                <div>
                  {(n.data as ReportData).imageSrc && (
                    <img src={(n.data as ReportData).imageSrc} alt={(n.data as any).title} style={{ width: '100%', borderRadius: 8, marginBottom: 8 }} />
                  )}
                  {(n.data as ReportData).summary && (
                    <div style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 8 }}>{(n.data as ReportData).summary}</div>
                  )}
                  {(n.data as ReportData).chartData && (n.data as ReportData).chartLabels && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 96 }}>
                      {(n.data as ReportData).chartData!.map((v, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, width: 28 }}>
                          <div style={{ width: '100%', background: 'linear-gradient(180deg, #2a8af6, #a853ba)', borderRadius: 4, height: `${Math.max(6, v * 8)}px` }} />
                          <span style={{ fontSize: 10, color: '#9ca3af' }}>{(n.data as ReportData).chartLabels![i]}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#9aa2b2' }}>Drag to reposition. Click Connect to link nodes.</div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={classes.right} onClick={() => setSelectedNodeId(selectedNodeId)}>
        <Title3>Properties</Title3>
        <Divider />
        {selectedNode ? (
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            <Label>Title</Label>
            <Input value={(selectedNode.data as any).title ?? ''} onChange={(_, d) => updateSelectedNode({ title: d.value })} />
            <Label>Subtitle</Label>
            <Input value={(selectedNode.data as any).subtitle ?? ''} onChange={(_, d) => updateSelectedNode({ subtitle: d.value })} />
            <Caption1>Node ID: {selectedNode.id}</Caption1>
          </div>
        ) : (
          <Caption1>Select a node to edit</Caption1>
        )}
      </div>
    </div>
  )
}
