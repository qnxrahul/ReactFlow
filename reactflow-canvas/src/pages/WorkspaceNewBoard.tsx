import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
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
import { useBoards } from '../state/BoardsProvider'

const initialUploadNodes = [
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

const LAST_CREATED_STORAGE_KEY = 'workspace:lastCreatedBoardId'

export default function WorkspaceNewBoard() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialUploadNodes)
  const [edges, _setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const { createBoard, updateBoard, boards } = useBoards()
  const [searchParams] = useSearchParams()
  const boardIdParam = searchParams.get('boardId')
  const editingBoard = useMemo(
    () => (boardIdParam ? boards.find((board) => board.id === boardIdParam) ?? null : null),
    [boardIdParam, boards],
  )
  const isEditing = editingBoard !== null
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null)
  const hasAutoCreatedRef = useRef(false)
  const autoCreatedBoardIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (isEditing) return
    hasAutoCreatedRef.current = false
    autoCreatedBoardIdRef.current = null
    setActiveBoardId(null)
    setSelectedTemplate(null)
    setNodes(
      initialUploadNodes.map((node) => ({
        ...node,
        data: {
          ...(node.data as UploadLaneData),
          files: [...((node.data as UploadLaneData).files ?? [])],
        },
      })),
    )
  }, [isEditing, setNodes])

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

  const laneData = useMemo(
    () =>
      nodes
        .filter((node) => node.type === 'uploadLane')
        .map((node) => {
          const data = node.data as UploadLaneData
          return {
            id: node.id,
            title: data.title,
            files: data.files,
          }
        }),
    [nodes],
  )

  useEffect(() => {
    if (!editingBoard) return
    hasAutoCreatedRef.current = true
    autoCreatedBoardIdRef.current = editingBoard.id
    setActiveBoardId(editingBoard.id)
    setSelectedTemplate(editingBoard.template ?? null)

    const lanesSource =
      editingBoard.lanes && editingBoard.lanes.length > 0
        ? editingBoard.lanes
        : initialUploadNodes.map((node) => ({
            id: node.id,
            title: (node.data as UploadLaneData).title,
            files: (node.data as UploadLaneData).files ?? [],
          }))

    setNodes(
      lanesSource.map((lane, idx) => ({
        id: lane.id ?? initialUploadNodes[idx]?.id ?? `lane-${idx}`,
        type: 'uploadLane' as const,
        position: initialUploadNodes[idx]?.position ?? { x: idx * 320, y: 0 },
        data: {
          title: lane.title,
          files: [...lane.files],
        } satisfies UploadLaneData,
        draggable: false,
      })),
    )

    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(LAST_CREATED_STORAGE_KEY, editingBoard.id)
    }
  }, [editingBoard, setNodes])

  const activeBoard = useMemo(
    () => (activeBoardId ? boards.find((board) => board.id === activeBoardId) ?? null : null),
    [activeBoardId, boards],
  )

  const activeTemplateLabel = selectedTemplate ?? activeBoard?.template ?? null
  const boardVisible = activeTemplateLabel !== null

  useEffect(() => {
    if (isEditing || hasAutoCreatedRef.current) return
    hasAutoCreatedRef.current = true
    const created = createBoard({
      template: null,
      lanes: laneData,
      tasksCount: todoItems.length,
    })
    autoCreatedBoardIdRef.current = created.id
    setActiveBoardId(created.id)
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(LAST_CREATED_STORAGE_KEY, created.id)
    }
  }, [createBoard, isEditing, laneData])

  const handleTemplateSelect = useCallback(
    (templateLabel: string) => {
      setSelectedTemplate(templateLabel)
      setActiveBoardId((current) => {
        if (!current) {
          const existingId = autoCreatedBoardIdRef.current
          if (existingId) {
            updateBoard(existingId, (prev) => ({ ...prev, template: templateLabel }))
            if (typeof window !== 'undefined') {
              window.sessionStorage.setItem(LAST_CREATED_STORAGE_KEY, existingId)
            }
            return existingId
          }
          const created = createBoard({
            template: templateLabel,
            lanes: laneData,
            tasksCount: todoItems.length,
          })
          autoCreatedBoardIdRef.current = created.id
          if (typeof window !== 'undefined') {
            window.sessionStorage.setItem(LAST_CREATED_STORAGE_KEY, created.id)
          }
          return created.id
        }
        updateBoard(current, (prev) => ({ ...prev, template: templateLabel }))
        return current
      })
      const idToStore = autoCreatedBoardIdRef.current ?? activeBoardId
      if (idToStore && typeof window !== 'undefined') {
        window.sessionStorage.setItem(LAST_CREATED_STORAGE_KEY, idToStore)
      }
    },
    [activeBoardId, createBoard, laneData, updateBoard],
  )

  useEffect(() => {
    if (!activeBoardId) return
    const filesCount = laneData.reduce((total, lane) => total + lane.files.length, 0)
    const metaParts: string[] = []
    if (laneData.length) metaParts.push(`${laneData.length} lanes`)
    if (todoItems.length) metaParts.push(`${todoItems.length} tasks`)
    if (filesCount) metaParts.push(`${filesCount} files`)
    const meta = metaParts.length > 0 ? metaParts.join(', ') : 'Workspace board'

    updateBoard(activeBoardId, (prev) => ({
      ...prev,
      lanes: laneData,
      filesCount,
      tasksCount: todoItems.length,
      meta,
    }))
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(LAST_CREATED_STORAGE_KEY, activeBoardId)
    }
  }, [activeBoardId, laneData, updateBoard])

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
                        tpl.label === activeTemplateLabel
                          ? 'workspace-template-item workspace-template-item--active'
                          : 'workspace-template-item'
                      }
                      onClick={() => handleTemplateSelect(tpl.label)}
                    >
                      <div>{tpl.label}</div>
                      <small>{tpl.description}</small>
                    </li>
                  ))}
                  <li className="workspace-template-more">More templates</li>
                </ul>
                {activeBoard && (
                  <div className="workspace-template-status">
                    Autosaved as <strong>{activeBoard.title}</strong>
                  </div>
                )}
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
                  <div className="workspace-board-actions">
                    <div className="workspace-board-status">
                      {activeBoard ? (
                        <>
                          <span className="workspace-board-status__label">Autosaved as</span>
                          <strong>{activeBoard.title}</strong>
                          <button
                            type="button"
                            className="workspace-board-status__action"
                              onClick={() => {
                                if (activeBoard) {
                                  updateBoard(activeBoard.id, (prev) => ({ ...prev, template: null }))
                                }
                                setSelectedTemplate(null)
                              }}
                          >
                            Change template
                          </button>
                        </>
                      ) : (
                        <span>Select a template to auto-create a board.</span>
                      )}
                    </div>
                  </div>

                  <div className="workspace-board-canvas">
                    <ReactFlow
                      nodes={nodesWithHandlers}
                      edges={edges}
                      proOptions={{ hideAttribution: true }}
                      fitView
                      fitViewOptions={{ padding: 0.4 }}
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
