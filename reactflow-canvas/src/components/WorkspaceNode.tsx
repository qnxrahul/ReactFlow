import type { NodeProps } from '@xyflow/react'

export type WorkspaceNodeData = {
  title: string
  description: string
  owner: string
  status: string
  accent?: string
}

export function WorkspaceNode({ data, selected }: NodeProps<WorkspaceNodeData>) {
  const accent = data.accent ?? '#4f46e5'

  return (
    <div
      className={`workspace-node ${selected ? 'workspace-node--selected' : ''}`}
      style={{ borderTopColor: accent }}
    >
      <div className="workspace-node__title">{data.title}</div>
      <div className="workspace-node__meta">
        <span>{data.description}</span>
        <span className="workspace-node__dot" />
        <span>{data.owner}</span>
      </div>
      <div className="workspace-node__status">{data.status}</div>
    </div>
  )
}

export default WorkspaceNode
