import { memo, useCallback, useEffect } from 'react'
import { Handle, Position, type Node, type NodeProps, useReactFlow, useUpdateNodeInternals } from '@xyflow/react'

export type ReportNodeData = {
  title: string
  subtitle?: string
  imageSrc?: string
  summary?: string
  chartLabels?: string[]
  chartData?: number[]
  confidence?: number
  selectedTab?: 'summary' | 'chart' | 'gallery' | 'controls'
  showImage?: boolean
  showChart?: boolean
  showSummary?: boolean
  notes?: string
  fromNodeOutputId?: string
}

export const ReportNode = memo(({ id, data }: NodeProps<Node<ReportNodeData>>) => {
  const { setNodes } = useReactFlow<Node<ReportNodeData>, any>()
  const updateInternals = useUpdateNodeInternals()

  const patch = useCallback(
    (delta: Partial<ReportNodeData>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? ({ ...n, data: { ...n.data, ...delta } as any }) : n)),
      )
    },
    [id, setNodes],
  )

  useEffect(() => {
    // ensure handles reposition after content size changes
    const t = setTimeout(() => updateInternals(id), 0)
    return () => clearTimeout(t)
  }, [id, data.selectedTab, data.showChart, data.showImage, data.showSummary, data.summary, data.chartData, updateInternals])

  const selectedTab = data.selectedTab ?? 'summary'
  const showImage = data.showImage ?? true
  const showChart = data.showChart ?? true
  const showSummary = data.showSummary ?? true

  const regenerate = () => {
    const gen = () => Math.max(2, Math.round(Math.random() * 12))
    const labels = data.chartLabels ?? ['A', 'B', 'C', 'D', 'E', 'F']
    patch({ chartData: labels.map(gen), confidence: Math.round((0.5 + Math.random() * 0.5) * 100) / 100 })
  }

  const copySummary = async () => {
    try { await navigator.clipboard.writeText(data.summary ?? '') } catch {}
  }

  return (
    <div className="report-node">
      <div className="report-header">
        <div className="report-title">{data.title}</div>
        {data.subtitle && <div className="report-subtitle">{data.subtitle}</div>}
      </div>

      <div className="tabs">
        {(['summary','chart','gallery','controls'] as const).map((t) => (
          <button
            key={t}
            className={selectedTab === t ? 'active' : ''}
            onClick={() => patch({ selectedTab: t })}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {selectedTab === 'summary' && (
        <div className="report-section">
          {showImage && data.imageSrc && (
            <img src={data.imageSrc} alt={data.title} className="report-image" />
          )}
          {showSummary && (
            <div className="report-summary">
              {data.summary || 'No summary yet. Run upstream nodes to populate output.'}
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
          <div className="actions">
            <button onClick={regenerate}>Regenerate</button>
            <button onClick={copySummary}>Copy Summary</button>
          </div>
        </div>
      )}

      {selectedTab === 'chart' && (
        <div className="report-section">
          {showChart && data.chartData && data.chartLabels ? (
            <div className="report-chart">
              {data.chartData.map((v, i) => (
                <div key={i} className="bar" title={`${data.chartLabels![i]}: ${v}`}>
                  <div style={{ height: `${Math.max(6, v * 8)}px` }} />
                  <span>{data.chartLabels![i]}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="muted">No chart data</div>
          )}
        </div>
      )}

      {selectedTab === 'gallery' && (
        <div className="report-section gallery">
          <img src={data.imageSrc ?? 'https://picsum.photos/seed/gal1/160/100'} alt="gal1" />
          <img src={'https://picsum.photos/seed/gal2/160/100'} alt="gal2" />
          <img src={'https://picsum.photos/seed/gal3/160/100'} alt="gal3" />
        </div>
      )}

      {selectedTab === 'controls' && (
        <div className="report-section controls">
          <label className="ctrl">
            <span>Confidence</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={data.confidence ?? 0}
              onChange={(e) => patch({ confidence: Number(e.target.value) })}
            />
          </label>

          <label className="ctrl">
            <span>Show</span>
            <div className="toggles">
              <label><input type="checkbox" checked={showImage} onChange={(e) => patch({ showImage: e.target.checked })} /> Image</label>
              <label><input type="checkbox" checked={showSummary} onChange={(e) => patch({ showSummary: e.target.checked })} /> Summary</label>
              <label><input type="checkbox" checked={showChart} onChange={(e) => patch({ showChart: e.target.checked })} /> Chart</label>
            </div>
          </label>

          <label className="ctrl">
            <span>Notes</span>
            <textarea
              rows={3}
              placeholder="Add your notes"
              value={data.notes ?? ''}
              onChange={(e) => patch({ notes: e.target.value })}
            />
          </label>

          <details className="accordion">
            <summary>Advanced</summary>
            <div className="adv">
              <label><input type="radio" name={`chart-${id}`} defaultChecked /> Bars</label>
              <label><input type="radio" name={`chart-${id}`} /> Lines</label>
              <label><input type="checkbox" /> Normalize</label>
            </div>
          </details>
        </div>
      )}

      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  )
})
