import type { NodeProps } from '@xyflow/react'

export type WorkspaceNodeData = {
  title: string
  meta: string
  color?: string
}

export function WorkspaceNode({ data, selected }: NodeProps<WorkspaceNodeData>) {
  const color = data.color ?? '#5f79c6'

  return (
    <div className={`workspace-node ${selected ? 'workspace-node--selected' : ''}`}>
      <div className="workspace-node__square" style={{ backgroundColor: color }} />
      <div className="workspace-node__caption">
        <div className="workspace-node__title">{data.title}</div>
        <div className="workspace-node__meta">{data.meta}</div>
      </div>
    </div>
  )
}

export default WorkspaceNode
