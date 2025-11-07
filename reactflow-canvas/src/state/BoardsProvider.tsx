import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import * as Y from 'yjs'
import type { YArrayEvent, YMapEvent } from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { computePosition } from '../utils/workspaceLayout'

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
  promptNewBoard: () => void
}

const STORAGE_KEY = 'fast-agent.workspace.boards'
const STORAGE_VERSION = 2
const SYNC_ENDPOINT = (import.meta.env.VITE_WORKSPACE_SYNC_ENDPOINT ?? '').trim()
const SYNC_ROOM = (import.meta.env.VITE_WORKSPACE_SYNC_ROOM ?? 'reactflow-workspace-boards').trim()

const BoardsContext = createContext<BoardsContextValue | undefined>(undefined)

const palette = ['#5f79c6', '#60a5fa', '#22d3ee', '#f97316', '#facc15', '#a855f7']

function ensureUniqueTitle(
  boardMap: Y.Map<WorkspaceBoard>,
  desiredTitle: string,
  currentId?: string | null,
): string {
  const base = desiredTitle.trim().length > 0 ? desiredTitle.trim() : 'Workspace Board'
  const existingTitles = new Set<string>()
  boardMap.forEach((board, id) => {
    if (!currentId || id !== currentId) {
      existingTitles.add(board.title.trim())
    }
  })
  if (!existingTitles.has(base)) return base
  let suffix = 2
  let candidate = `${base} ${suffix}`
  while (existingTitles.has(candidate)) {
    suffix += 1
    candidate = `${base} ${suffix}`
  }
  return candidate
}

function createInitialBoards(): WorkspaceBoard[] {
  return []
}

function deserializeBoards(): WorkspaceBoard[] {
  if (typeof window === 'undefined') return createInitialBoards()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return createInitialBoards()
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) {
      window.localStorage.removeItem(STORAGE_KEY)
      return createInitialBoards()
    }
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'version' in parsed &&
      (parsed as any).version === STORAGE_VERSION &&
      Array.isArray((parsed as any).boards)
    ) {
      return (parsed as any).boards as WorkspaceBoard[]
    }
    window.localStorage.removeItem(STORAGE_KEY)
    return createInitialBoards()
  } catch (error) {
    console.warn('Failed to read workspace boards from storage', error)
    return createInitialBoards()
  }
}

function serializeBoards(boards: WorkspaceBoard[], options: { disabledRef: MutableRefObject<boolean> }) {
  if (typeof window === 'undefined' || options.disabledRef.current) return
  try {
    const payload = JSON.stringify({ version: STORAGE_VERSION, boards })
    window.localStorage.setItem(STORAGE_KEY, payload)
  } catch (error) {
    options.disabledRef.current = true
    if (import.meta.env.DEV) {
      console.info('Disabling workspace board persistence due to storage quota', error)
    }
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
  const storageDisabledRef = useRef(false)
  const createBoardRef = useRef<(input: NewBoardInput) => WorkspaceBoard>()
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
      serializeBoards(next, { disabledRef: storageDisabledRef })
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

    let provider: WebsocketProvider | null = null
    if (SYNC_ENDPOINT) {
      try {
        provider = new WebsocketProvider(SYNC_ENDPOINT, SYNC_ROOM, doc)
        provider.on('sync', (synced: boolean) => {
          if (synced) {
            syncFromDoc()
          }
        })
        provider.on('status', (event: { status: 'connected' | 'connecting' | 'disconnected' }) => {
          if (event.status === 'disconnected' && import.meta.env.DEV) {
            console.info('Workspace realtime sync disconnected; continuing in offline mode')
          }
        })
      } catch (error) {
        if (import.meta.env.DEV) {
          console.info('Workspace realtime sync unavailable; running offline', error)
        }
      }
    }

    return () => {
      order.unobserve(handleOrder)
      boardMap.unobserve(handleMap)
      if (provider) {
        provider.destroy()
      }
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
        const baseTitle = input.title?.trim().length ? input.title.trim() : generateDefaultTitle(boardMap, input.template)
        const title = ensureUniqueTitle(boardMap, baseTitle)

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
  createBoardRef.current = createBoard

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
        next.title = ensureUniqueTitle(boardMap, next.title, id)

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
    () => ({
      boards,
      createBoard,
      updateBoard,
      resetBoards,
      promptNewBoard: () => {
        if (!createBoardRef.current) return
        const defaultName = `Workspace ${(boards.length + 1).toString().padStart(2, '0')}`
        const name = typeof window !== 'undefined' ? window.prompt('Name for the new board:', defaultName) : defaultName
        if (name === null) return
        const board = createBoardRef.current({ title: name || defaultName, template: null })
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(LAST_CREATED_STORAGE_KEY, board.id)
        }
      },
    }),
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

