import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

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
  title: string
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

const INITIAL_BOARDS: WorkspaceBoard[] = [
  {
    id: 'space-q1',
    title: 'Q1 FY25',
    meta: '5 boards, 2 cards, 10 files',
    color: '#5f79c6',
    position: { x: 320, y: 110 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'space-q2',
    title: 'Q2 FY25',
    meta: '5 boards, 2 cards, 10 files',
    color: '#60a5fa',
    position: { x: 540, y: 60 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'space-q3',
    title: 'Q3 FY25',
    meta: '5 boards, 2 cards, 10 files',
    color: '#22d3ee',
    position: { x: 320, y: 260 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'space-q4',
    title: 'Q4 FY25',
    meta: '5 boards, 2 cards, 10 files',
    color: '#f97316',
    position: { x: 760, y: 140 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

const BoardsContext = createContext<BoardsContextValue | undefined>(undefined)

const palette = ['#5f79c6', '#60a5fa', '#22d3ee', '#f97316', '#facc15', '#a855f7']

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
  if (typeof window === 'undefined') return INITIAL_BOARDS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return INITIAL_BOARDS
    const parsed = JSON.parse(raw) as WorkspaceBoard[]
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_BOARDS
  } catch (error) {
    console.warn('Failed to read workspace boards from storage', error)
    return INITIAL_BOARDS
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

export function BoardsProvider({ children }: { children: ReactNode }) {
  const [boards, setBoards] = useState<WorkspaceBoard[]>(() => deserializeBoards())
  const isInitialised = useRef(false)

  useEffect(() => {
    if (!isInitialised.current) {
      isInitialised.current = true
      return
    }
    serializeBoards(boards)
  }, [boards])

  const createBoard = useCallback(
    (input: NewBoardInput): WorkspaceBoard => {
      const now = new Date().toISOString()
      const filesCount = input.lanes?.reduce((acc, lane) => acc + lane.files.length, 0) ?? 0
      const tasksCount = input.tasksCount ?? 0
      const metaParts = []
      if (input.lanes?.length) metaParts.push(`${input.lanes.length} lanes`)
      if (tasksCount) metaParts.push(`${tasksCount} tasks`)
      if (filesCount) metaParts.push(`${filesCount} files`)
      const meta = metaParts.length > 0 ? metaParts.join(', ') : 'Workspace board'

      const newBoard: WorkspaceBoard = {
        id: `board-${Date.now()}`,
        title: input.title,
        meta,
        color: palette[boards.length % palette.length],
        position: computePosition(boards.length),
        template: input.template ?? null,
        lanes: input.lanes,
        tasksCount,
        filesCount,
        createdAt: now,
        updatedAt: now,
      }

      setBoards((prev) => prev.concat(newBoard))
      return newBoard
    },
    [boards],
  )

  const updateBoard = useCallback((id: string, updater: (prev: WorkspaceBoard) => WorkspaceBoard) => {
    setBoards((prev) =>
      prev.map((board, index) =>
        board.id === id
          ? {
              ...updater(board),
              updatedAt: new Date().toISOString(),
              position: board.position ?? computePosition(index),
            }
          : board,
      ),
    )
  }, [])

  const resetBoards = useCallback(() => {
    setBoards(INITIAL_BOARDS)
  }, [])

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

