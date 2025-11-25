import { useNavigate } from 'react-router-dom'
import { Background, BackgroundVariant, ReactFlow, useEdgesState, useNodesState, type Edge, type Node } from '@xyflow/react'
import { FiCompass, FiGrid, FiLayers, FiSettings } from 'react-icons/fi'
import UploadLaneNode, { type UploadLaneData } from '../components/UploadLaneNode'
import '../workspace-board.css'

type UploadLaneNodeType = Node<UploadLaneData>

const navIcons = [FiGrid, FiCompass, FiLayers, FiSettings]

const todoItems = [
  'Complete mapping checklist',
  'Review AI extracted tags',
  'Confirm control IDs',
  'Flag missing evidence',
  'Hand off to Workpaper',
]

const mappingColumns = [
  {
    title: 'Items to be tested',
    files: ['Invoice batch 1483', 'Revenue rec schedule', 'Billing summary export', 'Support ticket export'],
  },
  {
    title: 'Sample documentation',
    files: ['Contract set B', 'Variance memo', 'Sampling worksheet'],
  },
  {
    title: 'Document mapping',
    files: ['WP-REV-12', 'WP-REV-18', 'WP-REV-22', 'Pending pairing'],
  },
]

const mappingHighlights = [
  { label: 'Owner', value: 'Priya Shah' },
  { label: 'Approver', value: 'Marcus Le' },
  { label: 'AI status', value: 'Extraction finished · 2m ago' },
]

const mappingTags = ['Revenue', 'Q4 FY25', 'SOX 302', 'Sampling', 'AI summary', 'Pending approver']

const initialUploadNodes: UploadLaneNodeType[] = [
  {
    id: 'todo-lane',
    type: 'uploadLane',
    position: { x: 0, y: 0 },
    data: { title: 'Items to be tested', files: ['theprojektis-design-tokens.zip'] } satisfies UploadLaneData,
    draggable: false,
  },
  {
    id: 'sample-lane',
    type: 'uploadLane',
    position: { x: 320, y: 0 },
    data: { title: 'Sample Documentation', files: [] } satisfies UploadLaneData,
    draggable: false,
  },
  {
    id: 'mapping-lane',
    type: 'uploadLane',
    position: { x: 640, y: 0 },
    data: { title: 'Document Mapping', files: [] } satisfies UploadLaneData,
    draggable: false,
  },
]

const nodeTypes = { uploadLane: UploadLaneNode }
const initialEdges: Edge[] = []

export default function MappingPage() {
  const navigate = useNavigate()
  const [nodes, , onNodesChange] = useNodesState(initialUploadNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  const mappingMeta = mappingColumns.reduce((acc, column) => acc + column.files.length, 0)

  return (
    <div className="workspace-page workspace-page--new mapping-page">
      <header className="workspace-hero workspace-hero--new mapping-hero">
        <div>
          <h1>Document mapping before workpaper build-out.</h1>
          <p>Normalize ERP, billing, and manual uploads, then lock the pairings that will feed the workpaper canvas.</p>
        </div>
        <div className="mapping-hero__actions">
          <button type="button" className="mapping-hero__btn mapping-hero__btn--primary" onClick={() => navigate('/workpaper')}>
            Start workpaper build
          </button>
          <button type="button" className="mapping-hero__btn mapping-hero__btn--secondary">Share mapping</button>
        </div>
      </header>

      <div className="workspace-body workspace-body--single">
        <nav className="workspace-rail" aria-label="Primary">
          {navIcons.map((Icon, idx) => (
            <button key={idx} type="button" aria-label={`Nav ${idx + 1}`}>
              <Icon />
            </button>
          ))}
        </nav>

        <div className="workspace-new-canvas mapping-canvas">
          <div className="workspace-board-top mapping-board-top">
            <div>Engagement &gt; Spaces &gt; Mapping</div>
            <span>Frame 2110704769</span>
          </div>

          <div className="workspace-todo-card">
            <div className="workspace-todo-header">
              <strong>To Do List</strong>
              <span>{todoItems.length} cards</span>
            </div>
            <ul className="workspace-todo-items">
              {todoItems.map((item) => (
                <li key={item} className="workspace-todo-item">
                  <label>
                    <input type="checkbox" />
                    <span>{item}</span>
                  </label>
                </li>
              ))}
            </ul>
            <button type="button" className="workspace-todo-update">
              Update
            </button>
          </div>

          <div className="workspace-board-region mapping-board-region">
            <div className="workspace-board-actions">
              <div className="workspace-board-status">
                <span className="workspace-board-status__label">Mapping stage</span>
                <strong>Document pairing ready</strong>
                <button type="button" className="workspace-board-status__action" onClick={() => navigate('/workpaper')}>
                  Start workpaper build
                </button>
              </div>
            </div>

            <div className="mapping-columns-grid">
              {mappingColumns.map((column) => (
                <div key={column.title} className="mapping-column-card">
                  <header>
                    <span>{column.title}</span>
                    <strong>{column.files.length}</strong>
                  </header>
                  <ul>
                    {column.files.map((file) => (
                      <li key={file}>{file}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mapping-flow-preview">
              <div className="mapping-flow-preview__canvas">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  nodeTypes={nodeTypes}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  nodesDraggable={false}
                  zoomOnScroll={false}
                  zoomOnPinch={false}
                  panOnDrag
                  panOnScroll
                  fitView
                  fitViewOptions={{ padding: 0.4 }}
                  proOptions={{ hideAttribution: true }}
                >
                  <Background variant={BackgroundVariant.Dots} gap={96} size={1} color="#dce3f5" />
                </ReactFlow>
              </div>

              <aside className="mapping-flow-sidebar">
                {mappingHighlights.map((item) => (
                  <div key={item.label} className="mapping-flow-sidebar__item">
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
                <div className="mapping-flow-sidebar__item">
                  <span>Documents</span>
                  <strong>{mappingMeta}</strong>
                </div>
                <div className="mapping-flow-sidebar__tags">
                  {mappingTags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </aside>
            </div>

            <div className="workspace-action-bar">
              {Array.from({ length: 6 }).map((_, idx) => (
                <span key={idx} className="workspace-action-dot">
                  +
                </span>
              ))}
              <button type="button" className="workspace-action-label" onClick={() => navigate('/workpaper')}>
                [Action bar]
              </button>
            </div>

            <div className="workspace-chat workspace-chat--new">
              <label htmlFor="mapping-chat-input">Ask me anything...</label>
              <textarea id="mapping-chat-input" placeholder="Request automations, templates, or help." />
              <button type="button">Send</button>
            </div>
          </div>
        </div>
      </div>

      <div className="mapping-flow-nav">
        <button type="button" onClick={() => navigate('/workspace')}>
          Back to workspace
        </button>
        <button type="button" onClick={() => navigate('/workpaper')}>
          Next · Workpaper
        </button>
      </div>
    </div>
  )
}
