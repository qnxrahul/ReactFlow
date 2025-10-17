import React, { useCallback, useMemo } from 'react'
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

  return (
    <div className="app-root">
      <div className="sidebar">
        <Palette />
        <button className="export" onClick={exportJson}>
          Export JSON
        </button>
      </div>
      <div className="canvas" onDrop={onDrop} onDragOver={onDragOver}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          proOptions={proOptions}
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
