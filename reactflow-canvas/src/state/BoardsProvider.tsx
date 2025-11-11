import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { computePosition } from '../utils/workspaceLayout'
import { createWorkspace, listWorkspaces, updateWorkspace, uploadWorkspaceFile } from '../services/workspaceApi'

export type WorkspaceLane = {
  id: string
  title: string
  files: string[]
}

export type WorkspaceFile = {
  id: string
  name: string
  url: string
  size: number
  contentType: string | null
  uploadedAt: string
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
  files: WorkspaceFile[]
  createdAt: string
  updatedAt: string
}

type NewBoardInput = {
  title?: string
  template?: string | null
  lanes?: WorkspaceLane[]
  tasksCount?: number
  meta?: string | null
  color?: string
  position?: { x: number; y: number }
}

type BoardsContextValue = {
  boards: WorkspaceBoard[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  createBoard: (input: NewBoardInput) => Promise<WorkspaceBoard>
  updateBoard: (id: string, updater: (prev: WorkspaceBoard) => WorkspaceBoard) => Promise<WorkspaceBoard | null>
  uploadFile: (workspaceId: string, file: File) => Promise<WorkspaceFile>
  resetBoards: () => Promise<void>
  promptNewBoard: () => Promise<void>
}

const BoardsContext = createContext<BoardsContextValue | undefined>(undefined)

const palette = ['#5f79c6', '#60a5fa', '#22d3ee', '#f97316', '#facc15', '#a855f7']

function computeMeta(lanes?: WorkspaceLane[], tasksCount?: number | null, filesCount?: number | null) {
  const metaParts: string[] = []
  if (lanes?.length) metaParts.push(`${lanes.length} lanes`)
  if (typeof tasksCount === 'number' && tasksCount > 0) metaParts.push(`${tasksCount} tasks`)
  if (typeof filesCount === 'number' && filesCount > 0) metaParts.push(`${filesCount} files`)
  return metaParts.length > 0 ? metaParts.join(', ') : 'Workspace board'
}

function ensureUniqueTitle(boards: WorkspaceBoard[], desiredTitle: string, currentId?: string | null): string {
  const base = desiredTitle.trim().length > 0 ? desiredTitle.trim() : 'Workspace Board'
  const existingTitles = new Set<string>(
    boards.filter((board) => !currentId || board.id !== currentId).map((board) => board.title.trim()),
  )
  if (!existingTitles.has(base)) return base
  let suffix = 2
  let candidate = `${base} ${suffix}`
  while (existingTitles.has(candidate)) {
    suffix += 1
    candidate = `${base} ${suffix}`
  }
  return candidate
}

export function BoardsProvider({ children }: { children: ReactNode }) {
  const [boardsState, setBoardsState] = useState<WorkspaceBoard[]>([])
  const boardsRef = useRef<WorkspaceBoard[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setBoards = useCallback((value: WorkspaceBoard[] | ((prev: WorkspaceBoard[]) => WorkspaceBoard[])) => {
    setBoardsState((prev) => {
      const next = typeof value === 'function' ? (value as (prev: WorkspaceBoard[]) => WorkspaceBoard[])(prev) : value
      boardsRef.current = next
      return next
    })
  }, [])

  const withDefaults = useCallback((board: WorkspaceBoard, index: number): WorkspaceBoard => {
    const position = board.position ?? computePosition(index)
    const lanes = board.lanes ?? []
    const filesCount = board.filesCount ?? board.files?.length ?? 0
    const tasksCount = board.tasksCount ?? 0
    const meta = board.meta && board.meta.trim().length > 0 ? board.meta : computeMeta(lanes, tasksCount, filesCount)
    const color = board.color ?? palette[index % palette.length]
    return {
      ...board,
      position,
      lanes,
      filesCount,
      tasksCount,
      meta,
      color,
      files: board.files ?? [],
    }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const fetched = await listWorkspaces()
      const normalized = fetched.map((board, index) => withDefaults(board, index))
      setBoards(normalized)
      setError(null)
    } catch (err) {
      console.error('Failed to load workspaces', err)
      setError((err as Error).message ?? 'Failed to load workspaces')
    } finally {
      setLoading(false)
    }
  }, [setBoards, withDefaults])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const createBoard = useCallback(
    async (input: NewBoardInput): Promise<WorkspaceBoard> => {
      const boards = boardsRef.current
      const index = boards.length
      const desiredTitle =
        input.title?.trim().length ? input.title.trim() : `Workspace ${(index + 1).toString().padStart(2, '0')}`
      const title = ensureUniqueTitle(boards, desiredTitle)
      const lanes = input.lanes ?? []
      const tasksCount = input.tasksCount ?? 0
      const filesCount = lanes.reduce((acc, lane) => acc + lane.files.length, 0)
      const position = input.position ?? computePosition(index)
      const color = input.color ?? palette[index % palette.length]
      const meta = input.meta ?? computeMeta(lanes, tasksCount, filesCount)

      const payload = {
        title,
        template: input.template ?? null,
        meta,
        color,
        position,
        lanes,
        tasksCount,
        filesCount,
      }

      try {
        const created = await createWorkspace(payload)
        const normalized = withDefaults(
          {
            ...created,
            color: created.color ?? color,
            meta: created.meta && created.meta.trim().length > 0 ? created.meta : meta,
            lanes: created.lanes ?? lanes,
            filesCount: created.filesCount ?? filesCount,
            tasksCount: created.tasksCount ?? tasksCount,
            position: created.position ?? position,
            files: created.files ?? [],
          },
          boards.length,
        )
        setBoards((prev) => [...prev, normalized])
        setError(null)
        return normalized
      } catch (err) {
        setError((err as Error).message ?? 'Failed to create workspace')
        throw err
      }
    },
    [setBoards, withDefaults],
  )

  const updateBoard = useCallback(
    async (id: string, updater: (prev: WorkspaceBoard) => WorkspaceBoard): Promise<WorkspaceBoard | null> => {
      const boards = boardsRef.current
      const current = boards.find((board) => board.id === id)
      if (!current) return null

      const updatedFromFn = updater(current)
      let nextBoard = {
        ...current,
        ...updatedFromFn,
      }

      nextBoard.title = ensureUniqueTitle(boards, nextBoard.title, id)
      nextBoard.lanes = nextBoard.lanes ?? []
      nextBoard.tasksCount = nextBoard.tasksCount ?? 0
      nextBoard.filesCount = nextBoard.filesCount ?? nextBoard.files?.length ?? 0
      nextBoard.meta = computeMeta(nextBoard.lanes, nextBoard.tasksCount, nextBoard.filesCount)
      nextBoard.files = nextBoard.files ?? current.files ?? []

      const previousBoards = [...boardsRef.current]
      setBoards((prev) =>
        prev.map((board) => (board.id === id ? { ...nextBoard, updatedAt: new Date().toISOString() } : board)),
      )

      const payload = {
        title: nextBoard.title,
        template: nextBoard.template ?? null,
        meta: nextBoard.meta,
        color: nextBoard.color,
        position: nextBoard.position,
        lanes: nextBoard.lanes,
        tasksCount: nextBoard.tasksCount,
        filesCount: nextBoard.filesCount,
      }

      try {
        const saved = await updateWorkspace(id, payload)
        const normalized = withDefaults(
          {
            ...nextBoard,
            ...saved,
            lanes: saved.lanes ?? nextBoard.lanes,
            files: saved.files ?? nextBoard.files,
          },
          Math.max(boards.findIndex((board) => board.id === id), 0),
        )
        setBoards((prev) => prev.map((board) => (board.id === id ? normalized : board)))
        setError(null)
        return normalized
      } catch (err) {
        console.error('Failed to update workspace', err)
        setBoards(previousBoards)
        setError((err as Error).message ?? 'Failed to update workspace')
        return null
      }
    },
    [setBoards, withDefaults],
  )

  const uploadFile = useCallback(
    async (workspaceId: string, file: File): Promise<WorkspaceFile> => {
      try {
        const uploaded = await uploadWorkspaceFile(workspaceId, file)
        setBoards((prev) =>
          prev.map((board) => {
            if (board.id !== workspaceId) return board
            const files = [...board.files, uploaded]
            const filesCount = (board.filesCount ?? board.files.length) + 1
            const meta = computeMeta(board.lanes, board.tasksCount, filesCount)
            return {
              ...board,
              files,
              filesCount,
              meta,
              updatedAt: new Date().toISOString(),
            }
          }),
        )
        setError(null)
        return uploaded
      } catch (err) {
        setError((err as Error).message ?? 'Failed to upload file')
        throw err
      }
    },
    [setBoards],
  )

  const resetBoards = useCallback(async () => {
    await refresh()
  }, [refresh])

  const promptNewBoard = useCallback(async () => {
    const index = boardsRef.current.length
    const defaultName = `Workspace ${(index + 1).toString().padStart(2, '0')}`
    const name =
      typeof window !== 'undefined' ? window.prompt('Name for the new board:', defaultName) ?? defaultName : defaultName
    try {
      const board = await createBoard({ title: name, template: null })
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('workspace:lastCreatedBoardId', board.id)
      }
    } catch {
      // errors already handled in createBoard
    }
  }, [createBoard])

  const value = useMemo<BoardsContextValue>(
    () => ({
      boards: boardsState,
      loading,
      error,
      refresh,
      createBoard,
      updateBoard,
      uploadFile,
      resetBoards,
      promptNewBoard,
    }),
    [boardsState, loading, error, refresh, createBoard, updateBoard, uploadFile, resetBoards, promptNewBoard],
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

