import React, { useCallback, useMemo, useRef, useState } from 'react'
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

import '@xyflow/react/dist/base.css'
import './flow.css'

import { Palette } from './components/Palette'
import { TurboEdge } from './components/TurboEdge'
import { TurboNode, type TurboNodeData } from './components/TurboNode'
import { ReportNode, type ReportNodeData } from './components/ReportNode'
import { FiPlay, FiZap, FiGitBranch, FiCheckCircle, FiUploadCloud, FiDownloadCloud, FiMaximize2 } from 'react-icons/fi'
import { runNode } from './services/fastAgent'

type NodeType = 'input' | 'action' | 'decision' | 'output' | 'turbo' | 'report'

const initialNodes: Node<any>[] = [
  {
    id: 'n-1',
    type: 'turbo',
    position: { x: 150, y: 100 },
    data: { title: 'Start', subtitle: 'trigger' },
  },
]

const initialEdges: Edge[] = []

const nodeTypes = { turbo: TurboNode, report: ReportNode }
const edgeTypes = { turbo: TurboEdge }

const defaultEdgeOptions: Partial<Edge> = {
  type: 'turbo',
  markerEnd: { type: MarkerType.ArrowClosed, color: '#2a8af6' },
}

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<any>>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const rfRef = useRef<ReactFlowInstance<Node<any>, Edge> | null>(null)

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
      if (type === 'report') {
        const data: ReportNodeData = {
          title: 'AI Report',
          subtitle: 'summary',
          imageSrc: 'https://picsum.photos/seed/ai-report/200/120',
          summary: 'Detected 12 entities, 3 topics and 2 anomalies. Confidence score 0.86.',
          chartData: [12, 7, 5, 9, 3, 11],
          chartLabels: ['A', 'B', 'C', 'D', 'E', 'F'],
          confidence: 0.86,
        }
        setNodes((nds) => nds.concat({ id, type: 'report', position, data }))
      } else {
        const icon =
          type === 'input' ? <FiPlay /> : type === 'action' ? <FiZap /> : type === 'decision' ? <FiGitBranch /> : type === 'output' ? <FiCheckCircle /> : undefined
        const data: TurboNodeData = { title: type.charAt(0).toUpperCase() + type.slice(1), subtitle: type, icon }
        setNodes((nds) => nds.concat({ id, type: 'turbo', position, data }))
      }
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

  const onNodeContextMenu = useCallback((evt: React.MouseEvent, node: Node<TurboNodeData>) => {
    evt.preventDefault()
    setContextMenu({ id: node.id, x: evt.clientX, y: evt.clientY })
  }, [])

  const onPaneClick = useCallback(() => {
    setContextMenu(null)
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
      { id: 'trg', type: 'turbo', position: { x: 80, y: 140 }, data: { title: 'Trigger', subtitle: 'start', status: 'idle' } },
      { id: 'ingest', type: 'turbo', position: { x: 320, y: 60 }, data: { title: 'Ingest Docs', subtitle: 'ingest', status: 'idle' } },
      { id: 'embed', type: 'turbo', position: { x: 580, y: 60 }, data: { title: 'Embed', subtitle: 'vectorize', status: 'idle' } },
      { id: 'retr', type: 'turbo', position: { x: 320, y: 220 }, data: { title: 'Retrieve', subtitle: 'similarity', status: 'idle' } },
      { id: 'plan', type: 'turbo', position: { x: 580, y: 220 }, data: { title: 'Plan', subtitle: 'agent', status: 'idle' } },
      { id: 'call', type: 'turbo', position: { x: 840, y: 140 }, data: { title: 'Call Tool', subtitle: 'search', status: 'idle' } },
      { id: 'ans', type: 'turbo', position: { x: 1100, y: 140 }, data: { title: 'Answer', subtitle: 'LLM', status: 'idle' } },
      { id: 'rep', type: 'report', position: { x: 1360, y: 100 }, data: { title: 'AI Report', subtitle: 'summary', imageSrc: 'https://picsum.photos/seed/ai-report/200/120', summary: '', chartLabels: ['A','B','C','D','E','F'], chartData: [6,3,5,7,4,6], confidence: 0.8 } as ReportNodeData },
    ]
    const demoEdges: Edge[] = [
      { id: 'e1', source: 'trg', target: 'ingest' },
      { id: 'e2', source: 'ingest', target: 'embed' },
      { id: 'e3', source: 'trg', target: 'retr' },
      { id: 'e4', source: 'retr', target: 'plan' },
      { id: 'e5', source: 'embed', target: 'plan' },
      { id: 'e6', source: 'plan', target: 'call' },
      { id: 'e7', source: 'call', target: 'ans' },
      { id: 'e8', source: 'ans', target: 'rep' },
    ]
    setNodes(demoNodes)
    setEdges(demoEdges)
  }, [setNodes, setEdges])

  // Execute a single node via fast-agent, update status/output
  const executeNode = useCallback(async (nodeId: string) => {
    const n = nodes.find((x) => x.id === nodeId)
    if (!n || n.type !== 'turbo') return
    const nodeType = (n.data as TurboNodeData)?.subtitle ?? 'action'
    setNodes((nds) => nds.map((x) => x.id === nodeId ? ({ ...x, data: { ...(x.data as TurboNodeData), status: 'running' } }) : x))
    try {
      const res = await runNode({ type: nodeType })
      setNodes((nds) => {
        const updated = nds.map((x) => x.id === nodeId ? ({ ...x, data: { ...(x.data as TurboNodeData), status: 'success', output: res.output } }) : x)
        // Also push output to any connected Report nodes
        const targets = edges.filter((e) => e.source === nodeId).map((e) => e.target)
        return updated.map((x) => {
          if (x.type === 'report' && targets.includes(x.id)) {
            const rd = (x.data as ReportNodeData) ?? ({} as ReportNodeData)
            const newData: ReportNodeData = {
              ...rd,
              summary: res.output,
              selectedTab: rd.selectedTab ?? 'summary',
              chartLabels: rd.chartLabels ?? ['A','B','C','D','E','F'],
              chartData: (rd.chartLabels ?? ['A','B','C','D','E','F']).map(() => Math.max(2, Math.round(Math.random() * 12))),
              confidence: rd.confidence ?? Math.round((0.65 + Math.random() * 0.3) * 100) / 100,
            }
            return { ...x, data: newData }
          }
          return x
        })
      })
    } catch (e) {
      setNodes((nds) => nds.map((x) => x.id === nodeId ? ({ ...x, data: { ...(x.data as TurboNodeData), status: 'error', output: String(e) } }) : x))
    }
  }, [nodes, edges, setNodes])

  // Execute forward along edges starting from a node
  const executeFrom = useCallback(async (startId: string) => {
    // simple BFS over DAG
    const visited = new Set<string>()
    const queue: string[] = [startId]
    const produced: Record<string, string> = {}
    while (queue.length) {
      const current = queue.shift()!
      if (visited.has(current)) continue
      visited.add(current)
      // determine input from predecessors' outputs (concat newest)
      const preds = edges.filter((e) => e.target === current).map((e) => e.source)
      const input = preds.map((p) => produced[p]).filter(Boolean).join('\n') || undefined
      const n = nodes.find((x) => x.id === current)
      if (n && n.type === 'turbo') {
        const nodeType = (n.data as TurboNodeData)?.subtitle ?? 'action'
        setNodes((nds) => nds.map((x) => x.id === current ? ({ ...x, data: { ...(x.data as TurboNodeData), status: 'running' } }) : x))
        try {
          const res = await runNode({ type: nodeType, input })
          produced[current] = res.output
          setNodes((nds) => nds.map((x) => x.id === current ? ({ ...x, data: { ...(x.data as TurboNodeData), status: 'success', output: res.output } }) : x))
          // push to connected report nodes
          const targets = edges.filter((e) => e.source === current).map((e) => e.target)
          setNodes((nds) => nds.map((x) => {
            if (x.type === 'report' && targets.includes(x.id)) {
              const rd = (x.data as ReportNodeData) ?? ({} as ReportNodeData)
              return {
                ...x,
                data: {
                  ...rd,
                  summary: res.output,
                  selectedTab: rd.selectedTab ?? 'summary',
                  chartLabels: rd.chartLabels ?? ['A','B','C','D','E','F'],
                  chartData: (rd.chartLabels ?? ['A','B','C','D','E','F']).map(() => Math.max(2, Math.round(Math.random() * 12))),
                  confidence: rd.confidence ?? Math.round((0.65 + Math.random() * 0.3) * 100) / 100,
                } as ReportNodeData,
              }
            }
            return x
          }))
        } catch (e) {
          setNodes((nds) => nds.map((x) => x.id === current ? ({ ...x, data: { ...(x.data as TurboNodeData), status: 'error', output: String(e) } }) : x))
        }
      }
      const next = edges.filter((e) => e.source === current).map((e) => e.target)
      queue.push(...next)
    }
  }, [edges, executeNode])

  return (
    <div className="app-root">
      <div className="leftbar">
        <Palette />
        <div className="spacer" />
        <div className="section actions">
          <button onClick={loadAgenticDemo}>Load Agentic Demo</button>
        </div>
      </div>
      <div className="canvas" onDrop={onDrop} onDragOver={onDragOver}>
        <div className="topbar">
          <button onClick={() => rfRef.current?.fitView()} title="Fit View">
            <FiMaximize2 />
            <span>Fit</span>
          </button>
          <button onClick={() => fileInputRef.current?.click()} title="Import JSON">
            <FiUploadCloud />
            <span>Import</span>
          </button>
          <button onClick={exportJson} title="Export JSON">
            <FiDownloadCloud />
            <span>Export</span>
          </button>
          <input
            type="file"
            accept="application/json"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              const txt = await f.text()
              try {
                const { nodes: n, edges: ed } = JSON.parse(txt)
                setNodes(n)
                setEdges(ed)
              } catch {}
            }}
          />
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onNodeDoubleClick={(_, n) => executeFrom(n.id)}
          onNodeContextMenu={onNodeContextMenu}
          onPaneClick={onPaneClick}
          fitView
          onInit={(inst) => (rfRef.current = inst)}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          proOptions={proOptions}
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
        {contextMenu && (
          <div
            className="context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onMouseLeave={() => setContextMenu(null)}
          >
            <button
              onClick={() => {
                const n = nodes.find((x) => x.id === contextMenu.id)
                if (!n) return
                const newId = `n-${Date.now()}`
                setNodes((nds) => nds.concat({ ...n, id: newId, position: { x: n.position.x + 40, y: n.position.y + 40 } }))
                setContextMenu(null)
              }}
            >
              Duplicate
            </button>
            <button
              onClick={() => {
                executeNode(contextMenu.id)
                setContextMenu(null)
              }}
            >
              Run Node
            </button>
            <button
              onClick={() => {
                executeFrom(contextMenu.id)
                setContextMenu(null)
              }}
            >
              Run From Here
            </button>
            <button
              onClick={() => {
                const id = contextMenu.id
                setNodes((nds) => nds.filter((n) => n.id !== id))
                setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
                setContextMenu(null)
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
      <div className="rightbar">
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
                <span>Type</span>
                <select
                  value={selectedNode.data?.subtitle ?? 'action'}
                  onChange={(e) => {
                    const t = e.target.value as NodeType
                    const icon = t === 'input' ? <FiPlay /> : t === 'action' ? <FiZap /> : t === 'decision' ? <FiGitBranch /> : t === 'output' ? <FiCheckCircle /> : undefined
                    updateSelectedNode({ subtitle: t, icon })
                  }}
                >
                  <option value="input">Input</option>
                  <option value="action">Action</option>
                  <option value="decision">Decision</option>
                  <option value="output">Output</option>
                </select>
              </label>
              <label className="field">
                <span>Subtitle</span>
                <input
                  value={selectedNode.data?.subtitle ?? ''}
                  onChange={(e) => updateSelectedNode({ subtitle: e.target.value })}
                />
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => selectedNode && executeNode(selectedNode.id)}>Run</button>
                <button onClick={() => selectedNode && executeFrom(selectedNode.id)}>Run From Here</button>
              </div>
            </div>
          ) : (
            <div className="muted">Select a node to edit</div>
          )}
        </div>
      </div>
    </div>
  )
}
