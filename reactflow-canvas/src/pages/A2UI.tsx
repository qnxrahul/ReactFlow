import { useMemo, useRef, useState } from 'react'
import '../flow.css'
import DocumentAnalyzerStepper from '../components/DocumentAnalyzerStepper'
import { convertToA2UI, type A2UIProject } from '../utils/documentAnalyzerToA2UI'

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function A2UIPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [project, setProject] = useState<A2UIProject | null>(null)
  const [activeStepId, setActiveStepId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [sourceError, setSourceError] = useState<string | null>(null)

  const steps = project?.steps ?? []

  const activeIndex = useMemo(() => (activeStepId ? steps.findIndex((s) => s.id === activeStepId) : -1), [activeStepId, steps])
  const activeStep = useMemo(() => (activeIndex >= 0 ? steps[activeIndex] : null), [activeIndex, steps])

  const canPrev = !showAll && activeIndex > 0
  const canNext = !showAll && activeIndex >= 0 && activeIndex < steps.length - 1

  return (
    <div className="app-root">
      <div className="leftbar">
        {project && (
          <DocumentAnalyzerStepper
            steps={steps.map((s) => ({ id: s.id, title: s.title, subtitle: s.subtitle }))}
            activeId={activeStepId}
            showAll={showAll}
            onSelect={(id) => setActiveStepId(id)}
            onPrev={() => canPrev && setActiveStepId(steps[activeIndex - 1].id)}
            onNext={() => canNext && setActiveStepId(steps[activeIndex + 1].id)}
            onToggleShowAll={() => setShowAll((v) => !v)}
          />
        )}

        <div className="section">
          <div className="section-title">A2UI converter</div>
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            Import DocumentAnalyzer JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json,text/plain,.txt"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const f = e.target.files?.[0]
              if (!f) return
              const txt = await f.text()
              try {
                const parsed = JSON.parse(txt)
                const converted = convertToA2UI(parsed)
                if (!converted) {
                  setProject(null)
                  setActiveStepId(null)
                  setShowAll(false)
                  setSourceError('Unsupported JSON. Please upload a Document Analyzer AppSettings JSON.')
                  return
                }
                setProject(converted)
                setShowAll(false)
                setSourceError(null)
                setActiveStepId(converted.steps[0]?.id ?? null)
              } catch (err) {
                setProject(null)
                setActiveStepId(null)
                setShowAll(false)
                setSourceError((err as Error).message || 'Invalid JSON')
              }
            }}
          />
          {sourceError && <div className="muted" style={{ marginTop: 8, color: '#b91c1c' }}>{sourceError}</div>}
          {project && (
            <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => navigator.clipboard.writeText(JSON.stringify(project, null, 2))}>
                Copy A2UI JSON
              </button>
              <button type="button" onClick={() => downloadJson('a2ui-project.json', project)}>
                Download
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="canvas" style={{ padding: 16, overflow: 'auto' }}>
        {!project ? (
          <div className="muted">Import a Document Analyzer AppSettings JSON to generate an A2UI project.</div>
        ) : showAll ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 750 }}>{project.title}</div>
                <div className="muted">A2UI project preview (all steps)</div>
              </div>
              <div className="muted">{steps.length} agents</div>
            </div>
            <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
              {steps.map((s, idx) => (
                <div key={s.id} style={{ border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700 }}>{idx + 1}. {s.title}</div>
                      {s.subtitle && <div className="muted">{s.subtitle}</div>}
                      {s.dependsOn.length > 0 && <div className="muted">Depends on: {s.dependsOn.join(', ')}</div>}
                    </div>
                    <div className="muted">{s.cards.length} cards</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : activeStep ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 750 }}>{activeStep.title}</div>
                {activeStep.subtitle && <div className="muted">{activeStep.subtitle}</div>}
                {activeStep.dependsOn.length > 0 && <div className="muted">Depends on: {activeStep.dependsOn.join(', ')}</div>}
              </div>
              <div className="muted">{activeStep.cards.length} cards</div>
            </div>

            <div style={{ marginTop: 12 }}>
              {activeStep.cards.length === 0 ? (
                <div className="muted">No adaptive cards attached to this agent.</div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {activeStep.cards.map((c) => (
                    <details key={c.id} style={{ border: '1px solid #e2e8f0', borderRadius: 14, background: '#fff', padding: 12 }}>
                      <summary style={{ cursor: 'pointer', fontWeight: 700 }}>{c.title}</summary>
                      <pre style={{ marginTop: 10, whiteSpace: 'pre-wrap', fontSize: 12 }}>{JSON.stringify(c.raw, null, 2)}</pre>
                    </details>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="muted">Select an agent step from the left.</div>
        )}
      </div>

      <div className="rightbar">
        <div className="section">
          <div className="section-title">A2UI JSON output</div>
          {!project ? (
            <div className="muted">No output yet.</div>
          ) : (
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 12 }}>
              {JSON.stringify(project, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}

