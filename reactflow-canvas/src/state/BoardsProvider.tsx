import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as Y from 'yjs'
import type { YArrayEvent, YMapEvent } from 'yjs'
import { WebsocketProvider } from 'y-websocket'

export type WorkspaceLane = {
  id: string
  title: string
  files: string[]
}

export type WorkspaceBoard = {
  id: string
  title: string
  meta: string
  color: string
  position: { x: number; y: number }
  template?: string | null
  lanes?: WorkspaceLane[]
  tasksCount?: number
  filesCount?: number
  createdAt: string
  updatedAt: string
}

type NewBoardInput = {
  title?: string
  template?: string | null
  lanes?: WorkspaceLane[]
  tasksCount?: number
}

type BoardsContextValue = {
  boards: WorkspaceBoard[]
  createBoard: (input: NewBoardInput) => WorkspaceBoard
  updateBoard: (id: string, updater: (prev: WorkspaceBoard) => WorkspaceBoard) => void
  resetBoards: () => void
}

const STORAGE_KEY = 'fast-agent.workspace.boards'
const SYNC_ENDPOINT = import.meta.env.VITE_WORKSPACE_SYNC_ENDPOINT ?? 'wss://demos.yjs.dev'
const SYNC_ROOM = import.meta.env.VITE_WORKSPACE_SYNC_ROOM ?? 'reactflow-workspace-boards'

const BoardsContext = createContext<BoardsContextValue | undefined>(undefined)

const palette = ['#5f79c6', '#60a5fa', '#22d3ee', '#f97316', '#facc15', '#a855f7']

const INITIAL_BOARD_BLUEPRINTS: Array<Pick<WorkspaceBoard, 'id' | 'title' | 'meta' | 'color' | 'position'>> = [
  {
    id: 'space-q1',
    title: 'Q1 FY25',
    meta: '5 boards, 2 cards, 10 files',
    color: '#5f79c6',
    position: { x: 320, y: 110 },
  },
  {
    id: 'space-q2',
    title: 'Q2 FY25',
    meta: '5 boards, 2 cards, 10 files',
    color: '#60a5fa',
    position: { x: 540, y: 60 },
  },
  {
    id: 'space-q3',
    title: 'Q3 FY25',
    meta: '5 boards, 2 cards, 10 files',
    color: '#22d3ee',
    position: { x: 320, y: 260 },
  },
  {
    id: 'space-q4',
    title: 'Q4 FY25',
    meta: '5 boards, 2 cards, 10 files',
    color: '#f97316',
    position: { x: 760, y: 140 },
  },
]

function createInitialBoards(): WorkspaceBoard[] {
  const timestamp = new Date().toISOString()
  return INITIAL_BOARD_BLUEPRINTS.map((board) => ({
    ...board,
    createdAt: timestamp,
    updatedAt: timestamp,
  }))
}

function computePosition(index: number): { x: number; y: number } {
  const columnWidth = 220
  const rowHeight = 160
  const baseX = 320
  const baseY = 110
  const columns = 4
  const col = index % columns
  const row = Math.floor(index / columns)
  return {
    x: baseX + col * columnWidth,
    y: baseY + row * rowHeight,
  }
}

function deserializeBoards(): WorkspaceBoard[] {
  if (typeof window === 'undefined') return createInitialBoards()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return createInitialBoards()
    const parsed = JSON.parse(raw) as WorkspaceBoard[]
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : createInitialBoards()
  } catch (error) {
    console.warn('Failed to read workspace boards from storage', error)
    return createInitialBoards()
  }
}

function serializeBoards(boards: WorkspaceBoard[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(boards))
  } catch (error) {
    console.warn('Failed to persist workspace boards', error)
  }
}

function generateDefaultTitle(boardMap: Y.Map<WorkspaceBoard>, template?: string | null) {
  const base = (template?.trim().length ? template.trim() : 'Workspace Board')
  const existingTitles = new Set<string>()
  boardMap.forEach((board) => {
    existingTitles.add(board.title)
  })
  if (!existingTitles.has(base)) {
    return base
  }
  let suffix = 2
  while (existingTitles.has(`${base} ${suffix}`)) {
    suffix += 1
  }
  return `${base} ${suffix}`
}

function generateBoardId() {
  if (typeof window !== 'undefined' && typeof window.crypto?.randomUUID === 'function') {
    return `board-${window.crypto.randomUUID()}`
  }
  return `board-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function BoardsProvider({ children }: { children: ReactNode }) {
  const [doc] = useState(() => new Y.Doc())
  const boardMapRef = useRef<Y.Map<WorkspaceBoard>>(doc.getMap<WorkspaceBoard>('workspace:boards'))
  const orderRef = useRef<Y.Array<string>>(doc.getArray<string>('workspace:order'))
  const [boards, setBoards] = useState<WorkspaceBoard[]>(() => deserializeBoards())

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const boardMap = boardMapRef.current
    const order = orderRef.current

    if (boardMap.size === 0 && order.length === 0) {
      const seedBoards = deserializeBoards()
      doc.transact(() => {
        seedBoards.forEach((board) => {
          boardMap.set(board.id, board)
          order.push([board.id])
        })
      })
    }

    const syncFromDoc = () => {
      const orderIds = order.toArray()
      const seen = new Set<string>()
      const next: WorkspaceBoard[] = []

      for (const id of orderIds) {
        const board = boardMap.get(id)
        if (board) {
          next.push(board)
          seen.add(id)
        }
      }

      boardMap.forEach((board, id) => {
        if (!seen.has(id)) {
          next.push(board)
        }
      })

      setBoards(next)
      serializeBoards(next)
    }

    const handleOrder = (_event: YArrayEvent<string>) => {
      syncFromDoc()
    }

    const handleMap = (_event: YMapEvent<WorkspaceBoard>) => {
      syncFromDoc()
    }

    syncFromDoc()

    order.observe(handleOrder)
    boardMap.observe(handleMap)

    const provider = new WebsocketProvider(SYNC_ENDPOINT, SYNC_ROOM, doc)

    const handleSync = (synced: boolean) => {
      if (synced) {
        syncFromDoc()
      }
    }

    provider.on('sync', handleSync)

    return () => {
      order.unobserve(handleOrder)
      boardMap.unobserve(handleMap)
      provider.off('sync', handleSync)
      provider.destroy()
    }
  }, [doc])

  const createBoard = useCallback(
    (input: NewBoardInput): WorkspaceBoard => {
      const boardMap = boardMapRef.current
      const order = orderRef.current
      const now = new Date().toISOString()
      const filesCount = input.lanes?.reduce((acc, lane) => acc + lane.files.length, 0) ?? 0
      const tasksCount = input.tasksCount ?? 0
      const metaParts: string[] = []
      if (input.lanes?.length) metaParts.push(`${input.lanes.length} lanes`)
      if (tasksCount) metaParts.push(`${tasksCount} tasks`)
      if (filesCount) metaParts.push(`${filesCount} files`)
      const meta = metaParts.length > 0 ? metaParts.join(', ') : 'Workspace board'

      const index = order.length
      const title = input.title?.trim().length ? input.title.trim() : generateDefaultTitle(boardMap, input.template)
      const newBoard: WorkspaceBoard = {
        id: generateBoardId(),
        title,
        meta,
        color: palette[index % palette.length],
        position: computePosition(index),
        template: input.template ?? null,
        lanes: input.lanes,
        tasksCount,
        filesCount,
        createdAt: now,
        updatedAt: now,
      }

      doc.transact(() => {
        boardMap.set(newBoard.id, newBoard)
        order.push([newBoard.id])
      })

      return newBoard
    },
    [doc],
  )

  const updateBoard = useCallback(
    (id: string, updater: (prev: WorkspaceBoard) => WorkspaceBoard) => {
      const boardMap = boardMapRef.current
      const order = orderRef.current
      const existing = boardMap.get(id)
      if (!existing) return

      const orderIndex = order.toArray().indexOf(id)
      const fallbackPosition = orderIndex >= 0 ? existing.position ?? computePosition(orderIndex) : existing.position ?? computePosition(0)

      const updated = updater(existing)
      const next: WorkspaceBoard = {
        ...existing,
        ...updated,
        id: existing.id,
        position: updated.position ?? fallbackPosition,
        updatedAt: new Date().toISOString(),
      }

      doc.transact(() => {
        boardMap.set(id, next)
      })
    },
    [doc],
  )

  const resetBoards = useCallback(() => {
    const boardMap = boardMapRef.current
    const order = orderRef.current

    doc.transact(() => {
      boardMap.clear()
      order.delete(0, order.length)

      const seeded = createInitialBoards()
      seeded.forEach((board, index) => {
        const hydrated = {
          ...board,
          position: board.position ?? computePosition(index),
        }
        boardMap.set(hydrated.id, hydrated)
        order.push([hydrated.id])
      })
    })
  }, [doc])

  const value = useMemo<BoardsContextValue>(
    () => ({ boards, createBoard, updateBoard, resetBoards }),
    [boards, createBoard, updateBoard, resetBoards],
  )

  return <BoardsContext.Provider value={value}>{children}</BoardsContext.Provider>
}

export function useBoards() {
  const ctx = useContext(BoardsContext)
  if (!ctx) {
    throw new Error('useBoards must be used within BoardsProvider')
  }
  return ctx
}

