import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { recordWorkflowStep } from '../services/workspaceApi'
import { LAST_CREATED_WORKSPACE_KEY } from '../constants/workspace'
import './WorkpaperDetailPage.css'

const workpaperTable = [
  { control: 'Sample 1', date: 'Mar 30 2025', ref: '183278', description: 'Lorem ipsum dolor sit amet', record: 'Record.pdf' },
  { control: 'Sample 2', date: 'Apr 02 2025', ref: 'E29-06777', description: 'Porem ipsum dolor sit', record: 'Record.pdf' },
  { control: 'Sample 3', date: 'Dec 06 2024', ref: '108722', description: 'Lorem ipsum dolor sit amet', record: 'Record.pdf' },
  { control: 'Sample 4', date: 'Apr 09 2025', ref: 'WX-18Z452', description: 'Lorem ipsum dolor sit amet', record: 'Record.pdf' },
  { control: 'Sample 5', date: 'Apr 09 2025', ref: 'WX-18Z459', description: 'Porem ipsum dolor sit', record: 'Record.pdf' },
  { control: 'Sample 6', date: 'Apr 30 2025', ref: 'INV007509', description: 'Lorem ipsum dolor sit amet', record: 'Record.pdf' },
  { control: 'Sample 7', date: 'Mar 31 2025', ref: '10547952', description: 'Lorem ipsum dolor sit amet', record: 'Record.pdf' },
]

export default function WorkpaperDetailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isChatOpen, setIsChatOpen] = useState(false)

  const workspaceId = useMemo(() => {
    const state = location.state as { workspaceId?: string } | null
    if (state?.workspaceId) return state.workspaceId
    if (typeof window !== 'undefined') {
      return window.sessionStorage.getItem(LAST_CREATED_WORKSPACE_KEY)
    }
    return null
  }, [location.state])

  const workflowNavState = workspaceId ? { state: { workspaceId } } : undefined

  useEffect(() => {
    if (!workspaceId) return
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(LAST_CREATED_WORKSPACE_KEY, workspaceId)
    }
    void recordWorkflowStep(workspaceId, { step: 'workpaper-detail' }).catch((error) => {
      if (import.meta.env.DEV) {
        console.error('Failed to record workpaper detail workflow step', error)
      }
    })
  }, [workspaceId])

  return (
    <div className="workpaper-detail-ux">
      <div className="workpaper-detail-ux__header">
        <span>Engagement &gt; Spaces &gt; New Board</span>
        <strong>WORK PAPER NAME</strong>
        <em>1 board</em>
      </div>

      <div className="workpaper-detail-ux__canvas">
        <section className="workpaper-detail-ux__table-card">
          <header>
            <div>
              <span>Expense</span>
              <span>Currency</span>
              <span>Find sample in</span>
            </div>
          </header>
          <div className="workpaper-detail-ux__table">
            {workpaperTable.map((row) => (
              <div key={row.control} className="workpaper-detail-ux__row">
                <div className="workpaper-detail-ux__col">
                  <strong>$975.00</strong>
                  <span>{row.control}</span>
                </div>
                <div className="workpaper-detail-ux__col">USD</div>
                <div className="workpaper-detail-ux__col workpaper-detail-ux__tags">
                  <button type="button">Invoice 1.xlsx</button>
                  <button type="button">Invoice 2.xlsx</button>
                  <button type="button">Shipping Doc.pdf</button>
                </div>
                <div className="workpaper-detail-ux__col workpaper-detail-ux__menu">⋯</div>
              </div>
            ))}
          </div>
        </section>

        <aside className="workpaper-detail-ux__preview">
          <div className="workpaper-detail-ux__preview-header">[WORK PAPER NAME]</div>
          <div className="workpaper-detail-ux__preview-body">
            <div className="workpaper-detail-ux__preview-box">Editable workpaper content</div>
          </div>
          <div className="workpaper-detail-ux__preview-actions">
            <button type="button" onClick={() => navigate('/workpaper', workflowNavState)}>Review work paper</button>
            <button type="button" onClick={() => navigate('/workpaper-detail', workflowNavState)}>Send for review</button>
            <button type="button" onClick={() => navigate('/workspace', workflowNavState)}>Move to workflow</button>
          </div>
        </aside>
      </div>

      <div className={isChatOpen ? 'workpaper-detail-ux__agent workpaper-detail-ux__agent--open' : 'workpaper-detail-ux__agent'}>
        {isChatOpen ? (
          <div className="workpaper-detail-ux__agent-panel">
            <header>
              <strong>Ask me anything</strong>
              <button type="button" onClick={() => setIsChatOpen(false)}>
                Close
              </button>
            </header>
            <div className="workpaper-detail-ux__agent-body">
              <textarea placeholder="e.g., summarize this workpaper or flag missing steps" />
              <button type="button">Send</button>
            </div>
          </div>
        ) : (
          <button type="button" className="workpaper-detail-ux__agent-toggle" onClick={() => setIsChatOpen(true)}>
            Ask me anything...
          </button>
        )}
      </div>

      <div className="workpaper-detail-ux__action-bar">
        {Array.from({ length: 6 }).map((_, idx) => (
          <span key={idx}>+</span>
        ))}
        <span>[Action bar]</span>
      </div>
    </div>
  )
}
