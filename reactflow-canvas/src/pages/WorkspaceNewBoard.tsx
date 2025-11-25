import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
import { recordWorkflowStep } from '../services/workspaceApi'
import { LAST_CREATED_WORKSPACE_KEY } from '../constants/workspace'

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

export default function WorkspaceNewBoard() {
  const navigate = useNavigate()
  const [nodes, setNodes, onNodesChange] = useNodesState(initialUploadNodes)
  const [edges, _setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const { createBoard, updateBoard, boards, uploadFile } = useBoards()
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
  const initializedFromBoardRef = useRef<string | null>(null)
  const hydratingRef = useRef(false)

  useEffect(() => {
    if (isEditing) return
    hasAutoCreatedRef.current = false
    autoCreatedBoardIdRef.current = null
    initializedFromBoardRef.current = null
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

  const handleLaneFilesSelected = useCallback(
    async (laneId: string, fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return
      const filesArray = Array.from(fileList)
      const fileNames = filesArray.map((file) => file.name)

      setNodes((prev) =>
        prev.map((node) =>
          node.id === laneId
            ? {
                ...node,
                data: {
                  ...(node.data as UploadLaneData),
                  files: Array.from(
                    new Set([...(node.data as UploadLaneData).files ?? [], ...fileNames]),
                  ),
                } as UploadLaneData,
              }
            : node,
        ),
      )

      if (!activeBoardId) return

      try {
        await Promise.all(filesArray.map((file) => uploadFile(activeBoardId, file)))
        const nextLaneData = laneData.map((lane) =>
          lane.id === laneId ? { ...lane, files: Array.from(new Set([...lane.files, ...fileNames])) } : lane,
        )
        const filesCount = nextLaneData.reduce((total, lane) => total + lane.files.length, 0)
        await updateBoard(activeBoardId, (prev) => ({
          ...prev,
          lanes: nextLaneData,
          filesCount,
        }))
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Failed to upload files for lane', error)
        }
        setNodes((prev) =>
          prev.map((node) =>
            node.id === laneId
              ? {
                  ...node,
                  data: {
                    ...(node.data as UploadLaneData),
                    files: ((node.data as UploadLaneData).files ?? []).filter((name) => !fileNames.includes(name)),
                  } as UploadLaneData,
                }
              : node,
          ),
        )
      }
    },
    [activeBoardId, laneData, setNodes, updateBoard, uploadFile],
  )

  const handleLaneFileClick = useCallback(
    async (fileName: string) => {
      if (!activeBoardId) return
      try {
        await recordWorkflowStep(activeBoardId, { step: 'mapping', fileName })
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(LAST_CREATED_WORKSPACE_KEY, activeBoardId)
        }
        navigate('/mapping', { state: { workspaceId: activeBoardId } })
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Failed to advance workflow to mapping', error)
        }
      }
    },
    [activeBoardId, navigate],
  )

  const handleTodoUpdateClick = useCallback(async () => {
    if (!activeBoardId) return
    try {
      await recordWorkflowStep(activeBoardId, { step: 'mapping' })
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(LAST_CREATED_WORKSPACE_KEY, activeBoardId)
      }
      navigate('/mapping', { state: { workspaceId: activeBoardId } })
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to advance workflow from todo update', error)
      }
    }
  }, [activeBoardId, navigate])

  const nodesWithHandlers = useMemo(
    () =>
      nodes.map((node) =>
        node.type === 'uploadLane'
          ? {
              ...node,
              data: {
                ...(node.data as UploadLaneData),
                onFilesChange: (fileList: FileList | null) => {
                  void handleLaneFilesSelected(node.id, fileList)
                },
                onFileClick: (fileName: string) => {
                  void handleLaneFileClick(fileName)
                },
              },
            }
          : node,
      ),
    [nodes, handleLaneFileClick, handleLaneFilesSelected],
  )

  useEffect(() => {
    if (!editingBoard) return
    if (initializedFromBoardRef.current === editingBoard.id) return
    initializedFromBoardRef.current = editingBoard.id
    hasAutoCreatedRef.current = true
    autoCreatedBoardIdRef.current = editingBoard.id
    hydratingRef.current = true
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
    hydratingRef.current = false

    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(LAST_CREATED_WORKSPACE_KEY, editingBoard.id)
    }
  }, [editingBoard, setNodes])

  const activeBoard = useMemo(
    () => (activeBoardId ? boards.find((board) => board.id === activeBoardId) ?? null : null),
    [activeBoardId, boards],
  )

  const activeTemplateLabel = selectedTemplate ?? activeBoard?.template ?? null
  const boardVisible = isEditing || activeTemplateLabel !== null

  useEffect(() => {
    if (isEditing || hasAutoCreatedRef.current) return
    let cancelled = false

    const bootstrap = async () => {
      hasAutoCreatedRef.current = true
      try {
        const created = await createBoard({
          template: null,
          lanes: laneData,
          tasksCount: todoItems.length,
        })
        if (cancelled) return
        autoCreatedBoardIdRef.current = created.id
        setActiveBoardId(created.id)
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(LAST_CREATED_WORKSPACE_KEY, created.id)
        }
      } catch (error) {
        hasAutoCreatedRef.current = false
        if (import.meta.env.DEV) {
          console.error('Failed to bootstrap workspace board', error)
        }
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [createBoard, isEditing, laneData])

  const handleTemplateSelect = useCallback(
    async (templateLabel: string) => {
      setSelectedTemplate(templateLabel)
      let targetId = activeBoardId ?? autoCreatedBoardIdRef.current ?? null

      if (!targetId) {
        try {
          const created = await createBoard({
            template: templateLabel,
            lanes: laneData,
            tasksCount: todoItems.length,
            title: templateLabel,
          })
          targetId = created.id
          autoCreatedBoardIdRef.current = created.id
          setActiveBoardId(created.id)
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('Failed to create workspace for template', error)
          }
          return
        }
      } else {
        await updateBoard(targetId, (prev) => ({
          ...prev,
          template: templateLabel,
          title: templateLabel,
        }))
        setActiveBoardId(targetId)
      }

      if (!targetId) return

      autoCreatedBoardIdRef.current = targetId

      const idToStore = autoCreatedBoardIdRef.current ?? targetId
      if (idToStore && typeof window !== 'undefined') {
        window.sessionStorage.setItem(LAST_CREATED_WORKSPACE_KEY, idToStore)
      }
    },
    [activeBoardId, createBoard, laneData, updateBoard],
  )

  useEffect(() => {
    if (!activeBoardId) return
    if (hydratingRef.current) return
    const filesCount = laneData.reduce((total, lane) => total + lane.files.length, 0)
    const metaParts: string[] = []
    if (laneData.length) metaParts.push(`${laneData.length} lanes`)
    if (todoItems.length) metaParts.push(`${todoItems.length} tasks`)
    if (filesCount) metaParts.push(`${filesCount} files`)
    const meta = metaParts.length > 0 ? metaParts.join(', ') : 'Workspace board'

      void updateBoard(activeBoardId, (prev) => ({
      ...prev,
      lanes: laneData,
      filesCount,
      tasksCount: todoItems.length,
      meta,
    }))
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(LAST_CREATED_WORKSPACE_KEY, activeBoardId)
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
                  <button type="button" className="workspace-todo-update" onClick={handleTodoUpdateClick}>
                    Update
                  </button>
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
