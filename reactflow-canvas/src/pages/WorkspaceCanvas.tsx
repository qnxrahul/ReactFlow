import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  type Edge,
  type Node,
  SelectionMode,
} from '@xyflow/react'
import { FiCompass, FiGrid, FiLayers, FiSettings } from 'react-icons/fi'
import '../workspace-board.css'
import { WorkspaceNode, type WorkspaceNodeData } from '../components/WorkspaceNode'

type WorkspaceNodeType = Node<WorkspaceNodeData>

const initialNodes: WorkspaceNodeType[] = [
  {
    id: 'space-q1',
    type: 'workspace',
    position: { x: 320, y: 110 },
    data: {
      title: 'Q1 FY25',
      meta: '5 boards, 2 cards, 10 files',
      color: '#5f79c6',
    } satisfies WorkspaceNodeData,
    draggable: false,
  },
  {
    id: 'space-q2',
    type: 'workspace',
    position: { x: 540, y: 60 },
    data: {
      title: 'Q2 FY25',
      meta: '5 boards, 2 cards, 10 files',
      color: '#5f79c6',
    } satisfies WorkspaceNodeData,
    draggable: false,
  },
  {
    id: 'space-q3',
    type: 'workspace',
    position: { x: 320, y: 260 },
    data: {
      title: 'Q3 FY25',
      meta: '5 boards, 2 cards, 10 files',
      color: '#5f79c6',
    } satisfies WorkspaceNodeData,
    draggable: false,
  },
  {
    id: 'space-q4',
    type: 'workspace',
    position: { x: 760, y: 140 },
    data: {
      title: 'Q4 FY25',
      meta: '5 boards, 2 cards, 10 files',
      color: '#5f79c6',
    } satisfies WorkspaceNodeData,
    draggable: false,
  },
]

const edges: Edge[] = []

const menuItems = [
  'Create board',
  'Add task',
  'Add connection',
  'Copy',
  'Paste here',
  'Fit Page >',
  'Option',
  'Option',
  'Option',
  'Invite/Share',
  'Lock/Unlock',
]

const nodeTypes = { workspace: WorkspaceNode }

export default function WorkspaceCanvas() {
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<string>('space-q2')
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const nodes = useMemo(
    () =>
      initialNodes.map((n) => ({
        ...n,
        selected: n.id === selectedId,
      })),
    [selectedId],
  )

  const closeMenu = useCallback(() => setMenuPosition(null), [])

  useEffect(() => {
    const handler = (evt: KeyboardEvent) => {
      if (evt.key === 'Escape') closeMenu()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [closeMenu])

  const handlePaneContextMenu = useCallback(
    (evt: ReactMouseEvent) => {
      evt.preventDefault()
      const bounds = canvasRef.current?.getBoundingClientRect()
      if (!bounds) return
      setMenuPosition({
        x: evt.clientX - bounds.left,
        y: evt.clientY - bounds.top,
      })
    },
    [],
  )

  const handleMenuSelect = useCallback(
    (item: string) => {
      closeMenu()
      if (item === 'Create board') {
        navigate('/workspace/new')
      }
    },
    [closeMenu, navigate],
  )

  return (
    <div className="workspace-page">
      <header className="workspace-hero">
        <h1>Start from scratch in a new workspace</h1>
      </header>

      <div className="workspace-body">
        <nav className="workspace-rail" aria-label="Primary">
          {[FiGrid, FiCompass, FiLayers, FiSettings].map((Icon, idx) => (
            <button key={idx} type="button" aria-label={`Nav ${idx + 1}`}>
              <Icon />
            </button>
          ))}
        </nav>

        <aside className="workspace-sidebar">
          <h2>To do list</h2>
          <ul className="workspace-tasks">
            {['Task label', 'Task label', 'Task label'].map((label, idx) => (
              <li key={idx} className="workspace-task">
                <input type="checkbox" aria-label={label} />
                <span>{label}</span>
              </li>
            ))}
          </ul>
          <div className="workspace-sidebar-links">
            <button type="button">Send for digital signature</button>
            <button type="button">Updates</button>
          </div>
        </aside>

        <div
          className="workspace-canvas"
          ref={canvasRef}
          onClick={() => closeMenu()}
        >
          <div className="workspace-board-top">
            <div>Engagement > Spaces</div>
            <span>Frame 2110704767</span>
          </div>
          <div className="workspace-flow">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              proOptions={{ hideAttribution: true }}
              defaultViewport={{ x: 0, y: 0, zoom: 1 }}
              style={{ width: '100%', height: '100%' }}
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
              onNodeClick={(_, node) => {
                setSelectedId(node.id)
                closeMenu()
              }}
              onNodeContextMenu={(evt) => {
                evt.preventDefault()
                closeMenu()
              }}
              onPaneClick={() => {
                closeMenu()
              }}
              onPaneContextMenu={handlePaneContextMenu}
              fitView
              fitViewOptions={{ padding: 0.2, includeHiddenNodes: true }}
            >
              <Background variant={BackgroundVariant.Dots} gap={80} size={1} color="#d6dcec" />
            </ReactFlow>
          </div>

          <div className="workspace-action-bar">
            {Array.from({ length: 6 }).map((_, idx) => (
              <span key={idx} className="workspace-action-dot">+</span>
            ))}
            <span className="workspace-action-label">[Action bar]</span>
          </div>

          <div className="workspace-chat">
            <label htmlFor="workspace-chat-input">Chat about the next step in the process</label>
            <textarea id="workspace-chat-input" placeholder="Ask me anything..." />
            <button type="button">Send</button>
          </div>

          {menuPosition && (
            <div
              className="workspace-context-menu"
              style={{ left: menuPosition.x, top: menuPosition.y }}
              onClick={(evt) => evt.stopPropagation()}
            >
              <header>{initialNodes.find((n) => n.id === selectedId)?.data.title ?? 'Workspace actions'}</header>
              <ul>
                {menuItems.map((item, idx) => (
                  <li key={`${item}-${idx}`} onClick={() => handleMenuSelect(item)}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
