import { memo } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'

export type AdaptiveCardNodeData = {
  kind: 'adaptive-card' | 'agent'
  title: string
  subtitle?: string
  description?: string
  fieldCount?: number
  fieldSummary?: Array<{ type?: string; label?: string; name?: string }>
  toolCount?: number
  dependsOn?: string[]
  raw?: unknown
}

function chipText(field: { type?: string; label?: string; name?: string }) {
  const label = field.label || field.name || ''
  const type = field.type || ''
  const core = label ? `${label}` : type ? `${type}` : 'field'
  return core.length > 26 ? `${core.slice(0, 23)}…` : core
}

export const AdaptiveCardNode = memo(({ data }: NodeProps<Node<AdaptiveCardNodeData>>) => {
  const isAgent = data.kind === 'agent'
  const fields = data.fieldSummary ?? []
  const dependsOn = data.dependsOn ?? []

  return (
    <div className={`ac-node ${isAgent ? 'ac-node--agent' : 'ac-node--card'}`}>
      <div className="ac-node__header">
        <div className="ac-node__title">{data.title}</div>
        <div className="ac-node__meta">
          <span className="ac-node__badge">{isAgent ? 'Agent' : 'Adaptive Card'}</span>
          {typeof data.fieldCount === 'number' && !isAgent && <span className="ac-node__pill">{data.fieldCount} fields</span>}
          {typeof data.toolCount === 'number' && isAgent && <span className="ac-node__pill">{data.toolCount} tools</span>}
        </div>
        {data.subtitle && <div className="ac-node__subtitle">{data.subtitle}</div>}
      </div>

      {data.description && <div className="ac-node__desc">{data.description}</div>}

      {!isAgent && fields.length > 0 && (
        <div className="ac-node__chips">
          {fields.map((f, idx) => (
            <span key={`${f.type ?? 't'}-${f.name ?? 'n'}-${idx}`} className="ac-node__chip" title={`${f.type ?? ''} ${f.name ?? ''}`}>
              {chipText(f)}
            </span>
          ))}
        </div>
      )}

      {isAgent && dependsOn.length > 0 && (
        <div className="ac-node__depends">
          <span className="ac-node__dependsLabel">Depends on:</span>
          <span className="ac-node__dependsValue">{dependsOn.join(', ')}</span>
        </div>
      )}

      <details className="ac-node__raw">
        <summary>View JSON</summary>
        <pre>{JSON.stringify(data.raw, null, 2)}</pre>
      </details>

      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  )
})

