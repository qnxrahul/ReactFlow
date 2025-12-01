import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { recordWorkflowStep } from '../services/workspaceApi'
import { LAST_CREATED_WORKSPACE_KEY } from '../constants/workspace'
import workpaperPreview from '../assets/workpaper-detail.jpg'
import './WorkpaperDetailPage.css'

const expenseRows = [
  { amount: '$975.00', currency: 'USD', tags: ['Invoice 1.xlsx', 'Invoice 2.xlsx', 'Shipping Doc.pdf'] },
  { amount: '$579.60', currency: 'USD', tags: ['Invoice 3.xlsb', 'Invoice 2.xlsb', 'Shipping Doc.pdf'] },
  { amount: '$909.17', currency: 'USD', tags: ['Invoice 3.xlsb', 'Invoice 2.xlsb'] },
  { amount: '$381.10', currency: 'USD', tags: ['Invoice 3.xlsb', 'Invoice 2.xlsb', 'Shipping Doc.pdf'] },
  { amount: '$122.27', currency: 'USD', tags: ['Invoice 3.xlsb', 'Shipping Doc.pdf'] },
  { amount: '$565.75', currency: 'USD', tags: ['Invoice 3.xlsb', 'Invoice 2.xlsb', 'Shipping Doc.pdf'] },
]

const agentSuggestions = ['Adjust any cards', 'Recommend next steps', 'Create a new Flow chart', 'Add more options']

export default function WorkpaperDetailPage() {
  const navigate = useNavigate()
  const location = useLocation()

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
    <div className="workpaper-detail-screen">
      <header className="workpaper-detail-screen__banner">
        <div>
          <span>Engagement &gt; Spaces &gt; New Board</span>
          <h1>Work Paper Name</h1>
          <p>Confirm samples are mapped to their source evidence before moving the workpaper into review.</p>
        </div>
        <div className="workpaper-detail-screen__banner-actions">
          <button type="button" onClick={() => navigate('/workpaper', workflowNavState)}>
            Review work paper
          </button>
          <button type="button" onClick={() => navigate('/workpaper-detail', workflowNavState)}>
            Send for review
          </button>
          <button type="button" onClick={() => navigate('/workspace', workflowNavState)}>
            Move to workflow
          </button>
        </div>
      </header>

      <main className="workpaper-detail-screen__board">
        <section className="workpaper-detail-screen__table">
          <header>
            <span>Expense</span>
            <span>Currency</span>
            <span>Find sample in</span>
          </header>
          <div className="workpaper-detail-screen__rows">
            {expenseRows.map((row, idx) => (
              <div key={idx} className="workpaper-detail-screen__row">
                <div className="workpaper-detail-screen__cell">
                  <strong>{row.amount}</strong>
                  <em>Expense</em>
                </div>
                <div className="workpaper-detail-screen__cell">{row.currency}</div>
                <div className="workpaper-detail-screen__cell workpaper-detail-screen__tags">
                  {row.tags.map((tag) => (
                    <span key={`${idx}-${tag}`}>{tag}</span>
                  ))}
                </div>
                <div className="workpaper-detail-screen__cell workpaper-detail-screen__menu">⋯</div>
              </div>
            ))}
          </div>
        </section>

        <aside className="workpaper-detail-screen__preview">
          <div className="workpaper-detail-screen__preview-title">[WORK PAPER NAME]</div>
          <div className="workpaper-detail-screen__preview-body">
            <img src={workpaperPreview} alt="Workpaper preview" />
          </div>
        </aside>
      </main>

      <div className="workpaper-detail-screen__agent">
        <div className="workpaper-detail-screen__agent-card">
          <header>What's next?</header>
          <ul>
            {agentSuggestions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <label htmlFor="agent-input">Ask me anything...</label>
          <textarea id="agent-input" placeholder="e.g., summarize mappings, flag gaps" />
          <button type="button">Send</button>
        </div>
      </div>

      <div className="workpaper-detail-screen__action-bar">
        {Array.from({ length: 6 }).map((_, idx) => (
          <span key={idx}>+</span>
        ))}
        <span>[Action bar]</span>
      </div>
    </div>
  )
}
