import type { WorkspaceBoard, WorkspaceFile, WorkspaceLane } from '../state/BoardsProvider'

const API_BASE = (import.meta.env.VITE_WORKSPACE_API_URL as string | undefined)?.replace(/\/+$/, '') || 'http://localhost:9000'

type WorkspacePayload = {
  title: string
  template?: string | null
  meta?: string | null
  color?: string | null
  position?: { x: number; y: number } | null
  lanes?: WorkspaceLane[]
  tasksCount?: number | null
  filesCount?: number | null
}

type WorkspaceListResponse = {
  items: WorkspaceBoardDTO[]
}

type WorkspaceBoardDTO = {
  id: string
  title: string
  template: string | null
  meta: string | null
  color: string | null
  position: { x: number; y: number } | null
  lanes: WorkspaceLane[]
  tasksCount: number | null
  filesCount: number | null
  files: WorkspaceFileDTO[]
  createdAt: string
  updatedAt: string
}

type WorkspaceFileDTO = {
  id: string
  name: string
  url: string
  size: number
  content_type?: string | null
  contentType?: string | null
  uploadedAt: string
}

type FileUploadResponse = {
  workspaceId: string
  file: WorkspaceFileDTO
}

function normalizeFile(dto: WorkspaceFileDTO): WorkspaceFile {
  return {
    id: dto.id,
    name: dto.name,
    url: dto.url,
    size: dto.size,
    contentType: dto.contentType ?? dto.content_type ?? null,
    uploadedAt: dto.uploadedAt,
  }
}

function normalizeWorkspace(dto: WorkspaceBoardDTO): WorkspaceBoard {
  return {
    id: dto.id,
    title: dto.title,
    template: dto.template ?? null,
    meta: dto.meta ?? 'Workspace board',
    color: dto.color ?? '#5f79c6',
    position: dto.position ?? undefined,
    lanes: dto.lanes ?? [],
    tasksCount: dto.tasksCount ?? undefined,
    filesCount: dto.filesCount ?? undefined,
    files: (dto.files ?? []).map(normalizeFile),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  }
}

async function handle<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Request failed with status ${response.status}`)
  }
  return (await response.json()) as T
}

export async function listWorkspaces(): Promise<WorkspaceBoard[]> {
  const response = await fetch(`${API_BASE}/workspaces/`)
  const data = await handle<WorkspaceListResponse>(response)
  return data.items.map(normalizeWorkspace)
}

export async function createWorkspace(payload: WorkspacePayload): Promise<WorkspaceBoard> {
  const response = await fetch(`${API_BASE}/workspaces/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await handle<WorkspaceBoardDTO>(response)
  return normalizeWorkspace(data)
}

export async function updateWorkspace(workspaceId: string, payload: Partial<WorkspacePayload>): Promise<WorkspaceBoard> {
  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await handle<WorkspaceBoardDTO>(response)
  return normalizeWorkspace(data)
}

export async function uploadWorkspaceFile(workspaceId: string, file: File): Promise<WorkspaceFile> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/files`, {
    method: 'POST',
    body: formData,
  })
  const data = await handle<FileUploadResponse>(response)
  return normalizeFile(data.file)
}
