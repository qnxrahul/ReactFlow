import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent as ReactMouseEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  type ReactFlowInstance,
  type Edge,
  type Node,
  SelectionMode,
} from '@xyflow/react'
import { FiCompass, FiGrid, FiLayers, FiSettings, FiPlus, FiZoomIn, FiZoomOut, FiRotateCw, FiGrid as FiGridToggle, FiMessageCircle } from 'react-icons/fi'
import '../workspace-board.css'
import { WorkspaceNode, type WorkspaceNodeData } from '../components/WorkspaceNode'
import { useBoards } from '../state/BoardsProvider'
import { LAST_CREATED_WORKSPACE_KEY } from '../constants/workspace'
import { computePosition } from '../utils/workspaceLayout'
import agentImage from '../assets/agent.png'

type WorkspaceNodeType = Node<WorkspaceNodeData>

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
  const location = useLocation()
  const { boards, createBoard, updateBoard } = useBoards()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const flowRef = useRef<ReactFlowInstance | null>(null)
  const [showGrid, setShowGrid] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null)
  const [isNamingDialogOpen, setIsNamingDialogOpen] = useState(false)
  const [namingDraft, setNamingDraft] = useState('')
  const [namingError, setNamingError] = useState<string | null>(null)
  const [isCreatingBoard, setIsCreatingBoard] = useState(false)
  const namingInputRef = useRef<HTMLInputElement | null>(null)

  const handleRename = useCallback(
    async (boardId: string, nextTitle: string) => {
      const board = boards.find((item) => item.id === boardId)
      setEditingBoardId(null)
      if (!board) return
      const trimmed = nextTitle.trim()
      if (!trimmed || trimmed === board.title) {
        return
      }
      try {
        await updateBoard(boardId, (prev) => ({
          ...prev,
          title: trimmed,
        }))
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Failed to rename workspace board', error)
        }
      }
    },
    [boards, updateBoard],
  )

  const nodes = useMemo(
    () =>
      boards.map<WorkspaceNodeType>((board, index) => ({
        id: board.id,
        type: 'workspace',
        position: board.position ?? computePosition(index),
        data: {
          title: board.title,
          meta: board.meta,
          color: board.color,
          isEditing: editingBoardId === board.id,
          onRename: (nextTitle: string) => {
            void handleRename(board.id, nextTitle)
          },
          onRenameCancel: () => {
            setEditingBoardId(null)
          },
        } satisfies WorkspaceNodeData,
        draggable: true,
        selected: board.id === selectedId,
      })),
    [boards, selectedId, editingBoardId, handleRename],
  )

  useEffect(() => {
    if (boards.length === 0) {
      setSelectedId(null)
      setEditingBoardId(null)
      return
    }

    const state = location.state as { createdBoardId?: string } | null
    if (state?.createdBoardId) {
      const exists = boards.some((board) => board.id === state.createdBoardId)
      if (exists) {
        setSelectedId(state.createdBoardId)
        setEditingBoardId(null)
        navigate(location.pathname, { replace: true, state: {} })
        return
      }
    }

    if (typeof window !== 'undefined') {
      const storedId = window.sessionStorage.getItem(LAST_CREATED_WORKSPACE_KEY)
      if (storedId) {
        const exists = boards.some((board) => board.id === storedId)
        if (exists) {
          setSelectedId(storedId)
          setEditingBoardId(null)
          window.sessionStorage.removeItem(LAST_CREATED_WORKSPACE_KEY)
          return
        }
      }
    }

    if (!selectedId || !boards.some((board) => board.id === selectedId)) {
      setSelectedId(boards[0].id)
    }
  }, [boards, location, navigate, selectedId])

  const closeMenu = useCallback(() => setMenuPosition(null), [])

  const openNamingDialog = useCallback(() => {
    closeMenu()
    const defaultName = `Workspace ${(boards.length + 1).toString().padStart(2, '0')}`
    setNamingDraft(defaultName)
    setNamingError(null)
    setIsNamingDialogOpen(true)
  }, [boards.length, closeMenu])

  useEffect(() => {
    if (!isNamingDialogOpen) return
    const id = requestAnimationFrame(() => namingInputRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [isNamingDialogOpen])

  const handleDialogClose = useCallback(() => {
    if (isCreatingBoard) return
    setIsNamingDialogOpen(false)
    setNamingDraft('')
    setNamingError(null)
  }, [isCreatingBoard])

  useEffect(() => {
    if (!isNamingDialogOpen) return
    const handler = (evt: KeyboardEvent) => {
      if (evt.key === 'Escape') {
        evt.preventDefault()
        handleDialogClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleDialogClose, isNamingDialogOpen])

  const handleNameSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (isCreatingBoard) return
      const trimmed = namingDraft.trim()
      if (!trimmed) {
        setNamingError('Please enter a workspace name.')
        return
      }
      setIsCreatingBoard(true)
      try {
        const created = await createBoard({ template: null, title: trimmed })
        setSelectedId(created.id)
        setEditingBoardId(null)
        setIsNamingDialogOpen(false)
        setNamingDraft('')
        setNamingError(null)
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(LAST_CREATED_WORKSPACE_KEY, created.id)
        }
        navigate(`/workspace/new?boardId=${encodeURIComponent(created.id)}`)
      } catch (error) {
        setNamingError('Failed to create workspace. Please try again.')
        if (import.meta.env.DEV) {
          console.error('Failed to create workspace board', error)
        }
      } finally {
        setIsCreatingBoard(false)
      }
    },
    [createBoard, isCreatingBoard, namingDraft, navigate],
  )

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
        openNamingDialog()
      }
    },
    [closeMenu, openNamingDialog],
  )

  const handlePlusClick = useCallback(() => {
    openNamingDialog()
  }, [openNamingDialog])

  const handleZoomIn = useCallback(() => {
    if (!flowRef.current) return
    flowRef.current.zoomIn?.({ duration: 200 })
    setZoom(flowRef.current.getZoom?.() ?? 1)
  }, [])

  const handleZoomOut = useCallback(() => {
    if (!flowRef.current) return
    flowRef.current.zoomOut?.({ duration: 200 })
    setZoom(flowRef.current.getZoom?.() ?? 1)
  }, [])

  const handleResetView = useCallback(() => {
    if (!flowRef.current) return
    flowRef.current.fitView?.({ padding: 0.2, includeHiddenNodes: true, duration: 300 })
    setZoom(flowRef.current.getZoom?.() ?? 1)
  }, [])

  const handleToggleGrid = useCallback(() => {
    setShowGrid((prev) => !prev)
  }, [])

  const handleComment = useCallback(() => {
    // Placeholder: integrate with agent/chat panel.
    if (canvasRef.current) {
      canvasRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [])

  const handleAgentClick = useCallback(() => {
    if (selectedId) {
      navigate(`/workspace/new?boardId=${encodeURIComponent(selectedId)}`)
      return
    }
    navigate('/workspace/new')
  }, [navigate, selectedId])

  const zoomPercent = Math.round(zoom * 100)

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
          onClick={() => {
            setEditingBoardId(null)
            closeMenu()
          }}
        >
          <div className="workspace-flow">
            <div className="workspace-flow__overlay">
              <div className="workspace-toolbar" role="toolbar" aria-label="Workspace controls">
                <button type="button" onClick={handlePlusClick} title="Create new board" aria-label="Create new board">
                  <FiPlus />
                </button>
                <span className="workspace-toolbar__divider" />
                <button type="button" onClick={handleZoomOut} title="Zoom out" aria-label="Zoom out">
                  <FiZoomOut />
                </button>
                <span className="workspace-toolbar__label">{zoomPercent}%</span>
                <button type="button" onClick={handleZoomIn} title="Zoom in" aria-label="Zoom in">
                  <FiZoomIn />
                </button>
                <button type="button" onClick={handleResetView} title="Reset view" aria-label="Reset view">
                  <FiRotateCw />
                </button>
                <button
                  type="button"
                  onClick={handleToggleGrid}
                  className={showGrid ? 'workspace-toolbar__toggle workspace-toolbar__toggle--active' : 'workspace-toolbar__toggle'}
                  title="Toggle grid"
                  aria-pressed={showGrid}
                  aria-label="Toggle grid"
                >
                  <FiGridToggle />
                </button>
                <button type="button" onClick={handleComment} title="Comment" aria-label="Comment">
                  <FiMessageCircle />
                </button>
              </div>
            </div>

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
              nodesDraggable
              edgesUpdatable={false}
              translateExtent={[[-200, -200], [1600, 900]]}
              selectionMode={SelectionMode.Partial}
              onInit={(instance) => {
                flowRef.current = instance
              }}
              onNodeClick={(_, node) => {
                setSelectedId(node.id)
                setEditingBoardId(null)
                closeMenu()
              }}
              onNodeContextMenu={(evt) => {
                evt.preventDefault()
                setEditingBoardId(null)
                closeMenu()
              }}
              onPaneClick={() => {
                setEditingBoardId(null)
                closeMenu()
              }}
              onPaneContextMenu={handlePaneContextMenu}
              onNodeDoubleClick={(_, node) => {
                if (editingBoardId === node.id) {
                  return
                }
                if (typeof window !== 'undefined') {
                  window.sessionStorage.setItem(LAST_CREATED_WORKSPACE_KEY, node.id)
                }
                navigate(`/workspace/new?boardId=${encodeURIComponent(node.id)}`)
              }}
              onNodeDragStop={(_, node) => {
                updateBoard(node.id, (prev) => ({ ...prev, position: node.position }))
              }}
              fitView
              fitViewOptions={{ padding: 0.2, includeHiddenNodes: true }}
              onMoveEnd={(_, state) => setZoom(state.zoom)}
            >
              {showGrid && <Background variant={BackgroundVariant.Dots} gap={80} size={1} color="#d6dcec" />}
            </ReactFlow>
          </div>

          <button type="button" className="workspace-agent" onClick={handleAgentClick} aria-label="Open agent workspace">
            <img src={agentImage} alt="Ask me anything" />
          </button>

          {menuPosition && (
            <div
              className="workspace-context-menu"
              style={{ left: menuPosition.x, top: menuPosition.y }}
              onClick={(evt) => evt.stopPropagation()}
            >
              <header>{boards.find((n) => n.id === selectedId)?.title ?? 'Workspace actions'}</header>
              <ul>
                {menuItems.map((item, idx) => (
                  <li key={`${item}-${idx}`} onClick={() => handleMenuSelect(item)}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {isNamingDialogOpen && (
        <div className="workspace-name-dialog-overlay" role="dialog" aria-modal="true" onClick={handleDialogClose}>
          <form
            className="workspace-name-dialog"
            onSubmit={handleNameSubmit}
            onClick={(event) => event.stopPropagation()}
          >
            <h2>Name your workspace</h2>
            <label htmlFor="workspace-name-input">Workspace name</label>
            <input
              id="workspace-name-input"
              ref={namingInputRef}
              value={namingDraft}
              onChange={(event) => {
                setNamingDraft(event.target.value)
                if (namingError) setNamingError(null)
              }}
              placeholder="e.g., Q4 Testing Plan"
              aria-invalid={Boolean(namingError)}
            />
            {namingError && <p className="workspace-name-dialog__error">{namingError}</p>}
            <div className="workspace-name-dialog__actions">
              <button type="button" onClick={handleDialogClose} disabled={isCreatingBoard}>
                Cancel
              </button>
              <button type="submit" disabled={isCreatingBoard}>
                {isCreatingBoard ? 'Creating...' : 'Create workspace'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
