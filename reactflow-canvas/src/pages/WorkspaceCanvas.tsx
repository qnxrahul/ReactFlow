import { useMemo, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  type Edge,
  type Node,
  SelectionMode,
} from '@xyflow/react'
import { FiEdit3, FiExternalLink, FiPlay, FiTrash2 } from 'react-icons/fi'
import '../workspace-board.css'
import { WorkspaceNode, type WorkspaceNodeData } from '../components/WorkspaceNode'

type WorkspaceNodeType = Node<WorkspaceNodeData>

const initialNodes: WorkspaceNodeType[] = [
  {
    id: 'space-1',
    type: 'workspace',
    position: { x: 260, y: 120 },
    data: {
      title: 'GPT-45',
      description: 'Ideation space',
      owner: 'Marketing',
      status: '3 active threads',
      accent: '#6366f1',
    },
    draggable: false,
  },
  {
    id: 'space-2',
    type: 'workspace',
    position: { x: 520, y: 60 },
    data: {
      title: 'GPT-95',
      description: 'Draft review',
      owner: 'Product',
      status: 'Awaiting feedback',
      accent: '#0ea5e9',
    },
    draggable: false,
  },
  {
    id: 'space-3',
    type: 'workspace',
    position: { x: 520, y: 220 },
    data: {
      title: 'GPT-25',
      description: 'Customer intel',
      owner: 'CX team',
      status: 'Synced today',
      accent: '#f97316',
    },
    draggable: false,
  },
  {
    id: 'space-4',
    type: 'workspace',
    position: { x: 780, y: 140 },
    data: {
      title: 'GPT-05',
      description: 'Experiment',
      owner: 'Research',
      status: 'New prompts ready',
      accent: '#22c55e',
    },
    draggable: false,
  },
]

const edges: Edge[] = []

const menuItems = [
  { id: 'open', icon: <FiExternalLink />, label: 'Open space' },
  { id: 'rename', icon: <FiEdit3 />, label: 'Rename' },
  { id: 'start', icon: <FiPlay />, label: 'Start workflow' },
  { id: 'delete', icon: <FiTrash2 />, label: 'Remove' },
]

const nodeTypes = { workspace: WorkspaceNode }

export default function WorkspaceCanvas() {
  const [selectedId, setSelectedId] = useState<string>('space-2')
  const nodes = useMemo(
    () =>
      initialNodes.map((n) => ({
        ...n,
        selected: n.id === selectedId,
      })),
    [selectedId],
  )

  return (
    <div className="workspace-page">
      <header className="workspace-hero">
        <h1>Start from scratch in a new workspace</h1>
      </header>

      <div className="workspace-body">
        <nav className="workspace-rail" aria-label="Primary">
          {['??', '??', '???', '??'].map((glyph, idx) => (
            <button key={idx} type="button" aria-label={`Nav ${idx + 1}`}>
              <span style={{ fontSize: 18 }}>{glyph}</span>
            </button>
          ))}
        </nav>

        <aside className="workspace-sidebar">
          <h2>Engagement Spaces</h2>
          <ul>
            <li>
              <strong>GPT-45</strong>
              <span>Marketing launch messaging</span>
              <span>Last updated 2h ago</span>
            </li>
            <li>
              <strong>GPT-95</strong>
              <span>Draft feedback loop</span>
              <span>5 collaborators inside</span>
            </li>
            <li>
              <strong>GPT-05</strong>
              <span>Research experiments</span>
              <span>Private ? 3 automations</span>
            </li>
          </ul>
        </aside>

        <div className="workspace-canvas">
          <div className="workspace-flow">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              proOptions={{ hideAttribution: true }}
              defaultViewport={{ x: 0, y: 0, zoom: 1 }}
              zoomOnScroll={false}
              zoomOnPinch={false}
              zoomOnDoubleClick={false}
              panOnScroll
              panOnDrag={false}
              elementsSelectable
              nodesDraggable={false}
              edgesUpdatable={false}
              translateExtent={[[-200, -200], [1600, 900]]}
              selectionMode={SelectionMode.Partial}
              onNodeClick={(_, node) => setSelectedId(node.id)}
              onPaneClick={() => setSelectedId('space-2')}
              fitView
              fitViewOptions={{ padding: 0.2, includeHiddenNodes: true }}
            >
              <Background variant={BackgroundVariant.Dots} gap={40} size={1} color="#cbd5f5" />
            </ReactFlow>
          </div>

          <div className="workspace-action-bar">
            <button type="button">Create space</button>
            <button type="button">Duplicate</button>
            <button type="button">Share</button>
          </div>

          <div className="workspace-chat">
            <label htmlFor="workspace-chat-input">Ask the assistant</label>
            <textarea id="workspace-chat-input" placeholder="Describe what the new space should do..." />
            <button type="button">Send</button>
          </div>

          <div className="workspace-context-menu">
            <header>{initialNodes.find((n) => n.id === selectedId)?.data.title ?? 'Workspace actions'}</header>
            <ul>
              {menuItems.map((item) => (
                <li key={item.id}>
                  <span>{item.icon}</span>
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
