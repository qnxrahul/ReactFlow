import { useMemo, useState, useCallback } from 'react'
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
} from '@xyflow/react'
import { FiCompass, FiGrid, FiLayers, FiSettings } from 'react-icons/fi'
import '../workspace-board.css'
import UploadLaneNode, { type UploadLaneData } from '../components/UploadLaneNode'

const initialUploadNodes = [
  {
    id: 'todo-lane',
    type: 'uploadLane',
    position: { x: 360, y: 20 },
    data: { title: 'Items to be tested', files: ['theprojektis-design-tokens.zip'] } satisfies UploadLaneData,
    draggable: false,
  },
  {
    id: 'sample-lane',
    type: 'uploadLane',
    position: { x: 660, y: 20 },
    data: { title: 'Sample Documentation', files: [] } satisfies UploadLaneData,
    draggable: false,
  },
  {
    id: 'mapping-lane',
    type: 'uploadLane',
    position: { x: 960, y: 20 },
    data: { title: 'Document Mapping', files: [] } satisfies UploadLaneData,
    draggable: false,
  },
]

const initialEdges: Edge[] = []

const navIcons = [FiGrid, FiCompass, FiLayers, FiSettings]

const templateOptions = [
  { label: 'Empty board', description: 'Start from scratch' },
  { label: 'Project plan', description: 'Outline deliverables' },
  { label: 'Account response report', description: 'Summarise key updates' },
  { label: 'Walkthrough', description: 'Guide stakeholders' },
  { label: 'Contracts', description: 'Review legal docs' },
  { label: 'Weekly plan', description: 'Sprint priorities' },
]

const todoItems = [
  'Upload items to be test',
  'Review data extraction',
  'Approve data extraction',
  'Confirm document mapping',
  'Create workpaper',
  'Review work paper',
  'Approve work paper',
]

const nodeTypes = { uploadLane: UploadLaneNode }

export default function WorkspaceNewBoard() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialUploadNodes)
  const [edges, _setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  const handleFilesChange = useCallback(
    (laneId: string, files: string[]) => {
      setNodes((prev) =>
        prev.map((node) =>
          node.id === laneId
            ? {
                ...node,
                data: {
                  ...(node.data as UploadLaneData),
                  files: Array.from(new Set([...(node.data as UploadLaneData).files, ...files])),
                } as UploadLaneData,
              }
            : node,
        ),
      )
    },
    [setNodes],
  )

  const nodesWithHandlers = useMemo(
    () =>
      nodes.map((node) =>
        node.type === 'uploadLane'
          ? {
              ...node,
              data: {
                ...(node.data as UploadLaneData),
                onFilesChange: (fileList: FileList | null) => {
                  if (!fileList) return
                  const names = Array.from(fileList).map((f) => f.name)
                  handleFilesChange(node.id, names)
                },
              },
            }
          : node,
      ),
    [nodes, handleFilesChange],
  )

  const boardVisible = selectedTemplate !== null

  return (
    <div className="workspace-page workspace-page--new">
      <header className="workspace-hero workspace-hero--new">
        <h1>Navigating to new board/canvas, user will be able to create freely.</h1>
        <p>In the chat the user can activate an agent, prompt, or generate a template to get started.</p>
      </header>

      <div className="workspace-body workspace-body--single">
        <nav className="workspace-rail" aria-label="Primary">
          {navIcons.map((Icon, idx) => (
            <button key={idx} type="button" aria-label={`Nav ${idx + 1}`}>
              <Icon />
            </button>
          ))}
        </nav>

        <div className="workspace-new-canvas">
          <div className="workspace-board-top">
            <div>Engagement &gt; Spaces &gt; New board</div>
            <span>Frame 2110704769</span>
          </div>

          {!boardVisible ? (
            <div className="workspace-template-card">
              <div className="workspace-template-header">
                <span>Choose template</span>
                <button type="button">Top picks</button>
              </div>
              <ul className="workspace-template-list">
                {templateOptions.map((tpl) => (
                  <li
                    key={tpl.label}
                    className={
                      tpl.label === selectedTemplate
                        ? 'workspace-template-item workspace-template-item--active'
                        : 'workspace-template-item'
                    }
                    onClick={() => setSelectedTemplate(tpl.label)}
                  >
                    <div>{tpl.label}</div>
                    <small>{tpl.description}</small>
                  </li>
                ))}
                <li className="workspace-template-more">More templates</li>
              </ul>
            </div>
          ) : (
            <>
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
                <button type="button" className="workspace-todo-update">Update</button>
              </div>

              <div className="workspace-board-region">
                <div className="workspace-flow workspace-flow--blank">
                  <ReactFlow
                    nodes={nodesWithHandlers}
                    edges={edges}
                    proOptions={{ hideAttribution: true }}
                    fitView
                    nodesDraggable={false}
                    elementsSelectable={false}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    panOnDrag
                    panOnScroll
                    zoomOnScroll={false}
                    zoomOnPinch={false}
                    zoomOnDoubleClick={false}
                    style={{ width: '100%', height: '100%' }}
                    nodeTypes={nodeTypes}
                  >
                    <Background variant={BackgroundVariant.Dots} gap={96} size={1} color="#dce3f5" />
                  </ReactFlow>
                </div>

                <div className="workspace-action-bar">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <span key={idx} className="workspace-action-dot">+</span>
                  ))}
                  <span className="workspace-action-label">[Action bar]</span>
                </div>

                <div className="workspace-chat workspace-chat--new">
                  <label htmlFor="workspace-chat-template">Ask me anything...</label>
                  <textarea id="workspace-chat-template" placeholder="Request automations, templates, or help." />
                  <button type="button">Send</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
