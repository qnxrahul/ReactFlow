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
  workflow?: WorkflowStateDTO | null
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

type WorkflowStateDTO = {
  currentStep?: string | null
  lastFileName?: string | null
  mappingSavedAt?: string | null
  workpaperSavedAt?: string | null
  detailSavedAt?: string | null
}

type FileUploadResponse = {
  workspaceId: string
  file: WorkspaceFileDTO
}

export type WorkflowStep = 'mapping' | 'workpaper' | 'workpaper-detail'

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

function normalizeWorkflow(dto?: WorkflowStateDTO | null): WorkspaceBoard['workflow'] {
  return {
    currentStep: dto?.currentStep ?? 'workspace',
    lastFileName: dto?.lastFileName ?? null,
    mappingSavedAt: dto?.mappingSavedAt ?? null,
    workpaperSavedAt: dto?.workpaperSavedAt ?? null,
    detailSavedAt: dto?.detailSavedAt ?? null,
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
    workflow: normalizeWorkflow(dto.workflow),
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

export async function recordWorkflowStep(
  workspaceId: string,
  payload: { step: WorkflowStep; fileName?: string },
): Promise<WorkspaceBoard> {
  const response = await fetch(`${API_BASE}/workspaces/${workspaceId}/workflow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await handle<WorkspaceBoardDTO>(response)
  return normalizeWorkspace(data)
}
