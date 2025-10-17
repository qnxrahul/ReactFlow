import React, { useCallback, useMemo, useState } from 'react'
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
  MarkerType,
  ConnectionMode,
} from '@xyflow/react'

import '@xyflow/react/dist/base.css'
import './flow.css'

import { Palette } from './components/Palette'
import { TurboEdge } from './components/TurboEdge'
import { TurboNode, type TurboNodeData } from './components/TurboNode'

type NodeType = 'input' | 'action' | 'decision' | 'output' | 'turbo'

const initialNodes: Node<TurboNodeData>[] = [
  {
    id: 'n-1',
    type: 'turbo',
    position: { x: 150, y: 100 },
    data: { title: 'Start', subtitle: 'trigger' },
  },
]

const initialEdges: Edge[] = []

const nodeTypes = { turbo: TurboNode }
const edgeTypes = { turbo: TurboEdge }

const defaultEdgeOptions: Partial<Edge> = {
  type: 'turbo',
  markerEnd: { type: MarkerType.ArrowClosed, color: '#2a8af6' },
}

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const onConnect: OnConnect = useCallback(
    (params) => setEdges((els) => addEdge(params, els)),
    [],
  )

  const onDrop = useCallback(
    (evt: React.DragEvent) => {
      evt.preventDefault()
      const bounds = (evt.target as HTMLDivElement).getBoundingClientRect()
      const type = evt.dataTransfer.getData('application/reactflow') as NodeType
      if (!type) return

      const position = {
        x: evt.clientX - bounds.left,
        y: evt.clientY - bounds.top,
      }

      const id = `n-${Date.now()}`
      const data: TurboNodeData = {
        title: type.charAt(0).toUpperCase() + type.slice(1),
        subtitle: type,
      }

      setNodes((nds) => nds.concat({ id, type: 'turbo', position, data }))
    },
    [setNodes],
  )

  const onDragOver = useCallback((evt: React.DragEvent) => {
    evt.preventDefault()
    evt.dataTransfer.dropEffect = 'move'
  }, [])

  const exportJson = useCallback(() => {
    const workflow = { nodes, edges }
    const blob = new Blob([JSON.stringify(workflow, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'workflow.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [nodes, edges])

  const proOptions = useMemo(() => ({ hideAttribution: true }), [])

  const onNodeClick = useCallback((_: any, node: Node<TurboNodeData>) => {
    setSelectedNodeId(node.id)
  }, [])

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) as Node<TurboNodeData> | undefined,
    [nodes, selectedNodeId],
  )

  const updateSelectedNode = useCallback(
    (updates: Partial<TurboNodeData>) => {
      if (!selectedNodeId) return
      setNodes((nds) =>
        nds.map((n) =>
          n.id === selectedNodeId ? { ...n, data: { ...n.data, ...updates } } : n,
        ),
      )
    },
    [selectedNodeId, setNodes],
  )

  const loadAgenticDemo = useCallback(() => {
    const demoNodes: Node<TurboNodeData>[] = [
      { id: 'trg', type: 'turbo', position: { x: 80, y: 140 }, data: { title: 'Trigger', subtitle: 'start' } },
      { id: 'ingest', type: 'turbo', position: { x: 320, y: 60 }, data: { title: 'Ingest Docs', subtitle: 'loader' } },
      { id: 'embed', type: 'turbo', position: { x: 580, y: 60 }, data: { title: 'Embed', subtitle: 'vectorize' } },
      { id: 'retr', type: 'turbo', position: { x: 320, y: 220 }, data: { title: 'Retrieve', subtitle: 'similarity' } },
      { id: 'plan', type: 'turbo', position: { x: 580, y: 220 }, data: { title: 'Plan', subtitle: 'agent' } },
      { id: 'call', type: 'turbo', position: { x: 840, y: 140 }, data: { title: 'Call Tool', subtitle: 'search' } },
      { id: 'ans', type: 'turbo', position: { x: 1100, y: 140 }, data: { title: 'Answer', subtitle: 'LLM' } },
    ]
    const demoEdges: Edge[] = [
      { id: 'e1', source: 'trg', target: 'ingest' },
      { id: 'e2', source: 'ingest', target: 'embed' },
      { id: 'e3', source: 'trg', target: 'retr' },
      { id: 'e4', source: 'retr', target: 'plan' },
      { id: 'e5', source: 'embed', target: 'plan' },
      { id: 'e6', source: 'plan', target: 'call' },
      { id: 'e7', source: 'call', target: 'ans' },
    ]
    setNodes(demoNodes)
    setEdges(demoEdges)
  }, [setNodes, setEdges])

  return (
    <div className="app-root">
      <div className="sidebar">
        <Palette />
        <div className="section">
          <div className="section-title">Properties</div>
          {selectedNode ? (
            <div className="form">
              <label className="field">
                <span>Title</span>
                <input
                  value={selectedNode.data?.title ?? ''}
                  onChange={(e) => updateSelectedNode({ title: e.target.value })}
                />
              </label>
              <label className="field">
                <span>Subtitle</span>
                <input
                  value={selectedNode.data?.subtitle ?? ''}
                  onChange={(e) => updateSelectedNode({ subtitle: e.target.value })}
                />
              </label>
            </div>
          ) : (
            <div className="muted">Select a node to edit</div>
          )}
        </div>
        <div className="section actions">
          <button onClick={loadAgenticDemo}>Load Agentic Demo</button>
          <button className="export" onClick={exportJson}>
            Export JSON
          </button>
        </div>
      </div>
      <div className="canvas" onDrop={onDrop} onDragOver={onDragOver}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          fitView
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          proOptions={proOptions}
          connectionMode={ConnectionMode.Loose}
          connectOnClick
          connectionLineStyle={{ stroke: '#2a8af6', strokeWidth: 2, opacity: 0.85 }}
        >
          <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
          <MiniMap pannable zoomable />
          <Controls showInteractive={false} />
          <svg>
            <defs>
              <linearGradient id="edge-gradient">
                <stop offset="0%" stopColor="#ae53ba" />
                <stop offset="100%" stopColor="#2a8af6" />
              </linearGradient>
              <marker
                id="edge-circle"
                viewBox="-5 -5 10 10"
                refX="0"
                refY="0"
                markerUnits="strokeWidth"
                markerWidth="10"
                markerHeight="10"
                orient="auto"
              >
                <circle stroke="#2a8af6" strokeOpacity="0.75" r="2" cx="0" cy="0" />
              </marker>
            </defs>
          </svg>
        </ReactFlow>
      </div>
    </div>
  )
}
