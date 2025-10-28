import { memo, type ReactNode } from 'react'
import { FiCloud } from 'react-icons/fi'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'

export type TurboNodeData = {
  title: string
  icon?: ReactNode
  subtitle?: string
  status?: 'idle' | 'running' | 'success' | 'error'
  output?: string
}

export const TurboNode = memo(({ data }: NodeProps<Node<TurboNodeData>>) => {
  return (
    <>
      <div className="cloud gradient">
        <div>
          <FiCloud />
        </div>
      </div>
      <div className="wrapper gradient">
        <div className="inner">
          <div className="body">
            {data.icon && <div className="icon">{data.icon}</div>}
            <div>
              <div className="title">{data.title}</div>
              {data.subtitle && <div className="subtitle">{data.subtitle}</div>}
              {data.status && (
                <div className={`status status-${data.status}`}>
                  {data.status === 'running' ? 'Running…' : data.status === 'success' ? 'Done' : data.status === 'error' ? 'Error' : 'Idle'}
                </div>
              )}
              {data.output && (
                <div className="output-preview" title={data.output}>
                  {data.output.length > 60 ? `${data.output.slice(0, 57)}…` : data.output}
                </div>
              )}
            </div>
          </div>
          <Handle type="target" position={Position.Left} />
          <Handle type="source" position={Position.Right} />
        </div>
      </div>
    </>
  )
})
