import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { NodeProps } from '@xyflow/react'

export type WorkspaceNodeData = {
  title: string
  meta: string
  color?: string
  isEditing?: boolean
  onRename?: (title: string) => void
  onRenameCancel?: () => void
}

export function WorkspaceNode({ data, selected }: NodeProps<WorkspaceNodeData>) {
  const color = data.color ?? '#5f79c6'
  const [draft, setDraft] = useState(data.title)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const submittedRef = useRef(false)
  const cancelledRef = useRef(false)

  useEffect(() => {
    if (data.isEditing) {
      setDraft(data.title)
      submittedRef.current = false
      cancelledRef.current = false
    }
  }, [data.isEditing, data.title])

  useEffect(() => {
    if (data.isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [data.isEditing])

  const commit = useMemo(() => {
    return () => {
      if (submittedRef.current || cancelledRef.current) return
      submittedRef.current = true
      data.onRename?.(draft)
    }
  }, [data, draft])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    commit()
  }

  const handleCancel = () => {
    cancelledRef.current = true
    data.onRenameCancel?.()
  }

  return (
    <div
      className={`workspace-node ${selected ? 'workspace-node--selected' : ''} ${data.isEditing ? 'workspace-node--editing' : ''}`}
    >
      <div className="workspace-node__square" style={{ backgroundColor: color }} />
      {data.isEditing ? (
        <form className="workspace-node__caption" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            className="workspace-node__input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.stopPropagation()
                handleCancel()
              }
            }}
            onMouseDown={(event) => event.stopPropagation()}
            placeholder="Name your workspace"
            aria-label="Workspace name"
          />
          <div className="workspace-node__meta">Press Enter to save</div>
        </form>
      ) : (
        <div className="workspace-node__caption">
          <div className="workspace-node__title">{data.title}</div>
          <div className="workspace-node__meta">{data.meta}</div>
        </div>
      )}
    </div>
  )
}

export default WorkspaceNode
