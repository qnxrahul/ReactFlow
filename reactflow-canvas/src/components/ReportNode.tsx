import { memo } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'

export type ReportNodeData = {
  title: string
  subtitle?: string
  imageSrc?: string
  summary?: string
  chartLabels?: string[]
  chartData?: number[]
  confidence?: number
}

export const ReportNode = memo(({ data }: NodeProps<Node<ReportNodeData>>) => {
  return (
    <div className="report-node">
      <div className="report-header">
        <div className="report-title">{data.title}</div>
        {data.subtitle && <div className="report-subtitle">{data.subtitle}</div>}
      </div>
      {data.imageSrc && (
        <img src={data.imageSrc} alt={data.title} className="report-image" />
      )}
      {data.summary && <div className="report-summary">{data.summary}</div>}
      {data.chartData && data.chartLabels && (
        <div className="report-chart">
          {data.chartData.map((v, i) => (
            <div key={i} className="bar" title={`${data.chartLabels![i]}: ${v}`}>
              <div style={{ height: `${Math.max(6, v * 8)}px` }} />
              <span>{data.chartLabels![i]}</span>
            </div>
          ))}
        </div>
      )}
      {typeof data.confidence === 'number' && (
        <div className="report-meter">
          <div className="meter-bg">
            <div className="meter-fill" style={{ width: `${Math.round(data.confidence * 100)}%` }} />
          </div>
          <span>{Math.round(data.confidence * 100)}%</span>
        </div>
      )}
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  )
})
