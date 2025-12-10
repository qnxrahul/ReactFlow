import { memo } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { useNodeRegistry } from '../NodeRegistryProvider'
import type { WorkflowNode } from '../types'

export type DynamicNodeData = {
  node: WorkflowNode
  onRun?: (id: string) => void
}

export type DynamicWorkflowNodeType = Node<DynamicNodeData>

function DynamicWorkflowNodeComponent({ data }: NodeProps<DynamicWorkflowNodeType>) {
  const registry = useNodeRegistry()
  const Renderer = registry.resolve(data.node.ui.componentType)
  return (
    <div className="rounded-2xl bg-white p-2 shadow-lg">
      <Renderer node={data.node} onRun={() => data.onRun?.(data.node.id)} />
      <Handle type="target" position={Position.Top} className="h-2 w-2 rounded-full bg-slate-400" />
      <Handle type="source" position={Position.Bottom} className="h-2 w-2 rounded-full bg-slate-400" />
    </div>
  )
}

export const DynamicWorkflowNode = memo(DynamicWorkflowNodeComponent)
