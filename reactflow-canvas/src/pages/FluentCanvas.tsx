import { useCallback, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type OnConnect,
  type ReactFlowInstance,
  MarkerType,
  ConnectionMode,
  SelectionMode,
} from '@xyflow/react'
import { TurboEdge } from '../components/TurboEdge'
import { TurboNode, type TurboNodeData } from '../components/TurboNode'
import { ReportNode, type ReportNodeData } from '../components/ReportNode'
import { FiPlay, FiZap, FiGitBranch, FiCheckCircle } from 'react-icons/fi'

import '@xyflow/react/dist/base.css'
import '../flow.css'
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

const useStyles = makeStyles({
  root: { display: 'grid', gridTemplateColumns: '280px 1fr 320px', gridTemplateRows: '100vh', background: '#0b0b0c', color: '#e5e7eb' },
  left: { borderRight: `1px solid ${tokens.colorNeutralStroke2}`, padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' },
  right: { borderLeft: `1px solid ${tokens.colorNeutralStroke2}`, padding: '12px', overflow: 'auto' },
  canvas: { position: 'relative' },
  paletteItem: { border: `1px dashed ${tokens.colorNeutralStroke2}`, padding: '8px 10px', borderRadius: '8px', cursor: 'grab', background: tokens.colorNeutralBackground1 },
  topbar: { position: 'absolute', top: '8px', left: '8px', display: 'flex', gap: '8px', background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(6px)', border: `1px solid ${tokens.colorNeutralStroke2}`, padding: '6px 8px', borderRadius: '8px', zIndex: 5 as any },
})

const nodeTypes = { turbo: TurboNode, report: ReportNode }
const edgeTypes = { turbo: TurboEdge }

const defaultEdgeOptions: Partial<Edge> = {
  type: 'turbo',
  markerEnd: { type: MarkerType.ArrowClosed, color: '#2a8af6' },
}

export default function FluentCanvas() {
  const classes = useStyles()
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<any>>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const rfRef = useRef<ReactFlowInstance<Node<any>, Edge> | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((els) => addEdge(params, els)),
    [],
  )

  const onDragStart = (evt: React.DragEvent, type: string) => {
    evt.dataTransfer.setData('application/reactflow', type)
    evt.dataTransfer.effectAllowed = 'move'
  }

  const onDrop = useCallback(
    (evt: React.DragEvent) => {
      evt.preventDefault()
      const bounds = (evt.target as HTMLDivElement).getBoundingClientRect()
      const type = evt.dataTransfer.getData('application/reactflow') as string
      if (!type) return
      const position = { x: evt.clientX - bounds.left, y: evt.clientY - bounds.top }
      const id = `n-${Date.now()}`
      if (type === 'report') {
        const data: ReportNodeData = {
          title: 'AI Report',
          subtitle: 'summary',
          imageSrc: 'https://picsum.photos/seed/ai-fluent/200/120',
          summary: 'Fluent UI card with mock analytics and controls.',
          chartData: [8, 6, 4, 9, 7, 5],
          chartLabels: ['A', 'B', 'C', 'D', 'E', 'F'],
          confidence: 0.73,
        }
        setNodes((nds) => nds.concat({ id, type: 'report', position, data }))
      } else {
        const icon = type === 'input' ? <FiPlay /> : type === 'action' ? <FiZap /> : type === 'decision' ? <FiGitBranch /> : type === 'output' ? <FiCheckCircle /> : undefined
        const data: TurboNodeData = { title: type, subtitle: type, icon }
        setNodes((nds) => nds.concat({ id, type: 'turbo', position, data }))
      }
    },
    [setNodes],
  )

  const onDragOver = useCallback((evt: React.DragEvent) => {
    evt.preventDefault(); evt.dataTransfer.dropEffect = 'move'
  }, [])

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) as Node<any> | undefined, [nodes, selectedNodeId])

  const updateSelectedNode = useCallback((updates: any) => {
    if (!selectedNodeId) return
    setNodes((nds) => nds.map((n) => (n.id === selectedNodeId ? { ...n, data: { ...n.data, ...updates } } : n)))
  }, [selectedNodeId, setNodes])

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
          <div key={p.type} className={classes.paletteItem} draggable onDragStart={(e) => onDragStart(e, p.type)}>
            {p.label}
          </div>
        ))}
      </div>

      <div className={classes.canvas} onDrop={onDrop} onDragOver={onDragOver}>
        <div className={classes.topbar}>
          <Toolbar>
            <ToolbarGroup>
              <ToolbarButton onClick={() => rfRef.current?.fitView()}>Fit View</ToolbarButton>
              <ToolbarDivider />
              <ToolbarButton onClick={() => setNodes([])}>Clear</ToolbarButton>
            </ToolbarGroup>
          </Toolbar>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, n) => setSelectedNodeId(n.id)}
          fitView
          onInit={(inst) => (rfRef.current = inst)}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          proOptions={{ hideAttribution: true }}
          connectionMode={ConnectionMode.Loose}
          connectOnClick
          snapToGrid
          snapGrid={[16, 16]}
          selectionOnDrag
          selectionMode={SelectionMode.Partial}
          panOnScroll
          panOnDrag
          zoomOnDoubleClick={false}
          connectionLineStyle={{ stroke: '#2a8af6', strokeWidth: 2, opacity: 0.85 }}
        >
          <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
          <MiniMap pannable zoomable />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      <div className={classes.right}>
        <Title3>Properties</Title3>
        <Divider />
        {selectedNode ? (
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            <Label>Title</Label>
            <Input value={selectedNode.data?.title ?? ''} onChange={(_, d) => updateSelectedNode({ title: d.value })} />
            <Label>Subtitle</Label>
            <Input value={selectedNode.data?.subtitle ?? ''} onChange={(_, d) => updateSelectedNode({ subtitle: d.value })} />
            <Caption1>Node ID: {selectedNode.id}</Caption1>
          </div>
        ) : (
          <Caption1>Select a node to edit</Caption1>
        )}
      </div>
    </div>
  )
}
