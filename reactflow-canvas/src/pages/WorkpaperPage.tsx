import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FiMoreHorizontal } from 'react-icons/fi'
import { recordWorkflowStep } from '../services/workspaceApi'
import { LAST_CREATED_WORKSPACE_KEY } from '../constants/workspace'
import { useBoards } from '../state/BoardsProvider'
import workpaperPreview from '../assets/workpaper.jpg'
import '../workspace-board.css'
import './WorkpaperPage.css'

const SAMPLE_SECTION_ID = 'sample-documentation'

const expenseRows = [
  { id: 1, expense: 975.0, currency: 'USD' },
  { id: 2, expense: 579.6, currency: 'USD' },
  { id: 3, expense: 909.17, currency: 'USD' },
  { id: 4, expense: 381.19, currency: 'USD' },
  { id: 5, expense: 122.27, currency: 'USD' },
  { id: 6, expense: 565.75, currency: 'USD' },
]

export default function WorkpaperPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { boards } = useBoards()

  const workspaceId = useMemo(() => {
    const state = location.state as { workspaceId?: string } | null
    if (state?.workspaceId) return state.workspaceId
    if (typeof window !== 'undefined') {
      return window.sessionStorage.getItem(LAST_CREATED_WORKSPACE_KEY)
    }
    return null
  }, [location.state])
  const workflowNavState = workspaceId ? { state: { workspaceId } } : undefined

  const activeBoard = useMemo(
    () => (workspaceId ? boards.find((board) => board.id === workspaceId) ?? null : null),
    [boards, workspaceId],
  )

  const sampleFiles = useMemo(() => {
    const lane = activeBoard?.lanes?.find((item) => item.id === SAMPLE_SECTION_ID || item.title === 'Sample Documentation')
    return lane?.files ?? []
  }, [activeBoard])

  useEffect(() => {
    if (!workspaceId) return
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(LAST_CREATED_WORKSPACE_KEY, workspaceId)
    }
    void recordWorkflowStep(workspaceId, { step: 'workpaper' }).catch((error) => {
      if (import.meta.env.DEV) {
        console.error('Failed to record workpaper workflow step', error)
      }
    })
  }, [workspaceId])

  const handleReview = () => {
    navigate('/workpaper-detail', workflowNavState)
  }

  const handleSendForReview = () => {
    navigate('/workpaper-detail', workflowNavState)
  }

  const handleMoveToWorkflow = () => {
    navigate('/workspace', workflowNavState)
  }

  return (
    <div className="workpaper-page">
      <header className="workpaper-page__header">
        <div>
          <p>Engagement &gt; Spaces &gt; Workpaper</p>
          <h1>Workpaper mapping</h1>
          <span>Review mapped samples, confirm supporting evidence, and finalize the draft workpaper.</span>
        </div>
        <div className="workpaper-page__actions">
          <button type="button" onClick={handleReview}>
            Review workpaper
          </button>
          <button type="button" onClick={handleSendForReview}>
            Send for review
          </button>
          <button type="button" onClick={handleMoveToWorkflow}>
            Move to workflow
          </button>
        </div>
      </header>

      <main className="workpaper-page__body">
        <section className="workpaper-table-card">
          <header>
            <span>Mapping samples</span>
            <strong>Expense vs evidence</strong>
          </header>
          <table>
            <thead>
              <tr>
                <th>Expense</th>
                <th>Currency</th>
                <th>Find sample in</th>
                <th aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {expenseRows.map((row) => (
                <tr key={row.id}>
                  <td>${row.expense.toFixed(2)}</td>
                  <td>{row.currency}</td>
                  <td>
                    <div className="workpaper-tags">
                      {sampleFiles.length > 0 ? (
                        sampleFiles.map((file) => (
                          <span key={`${row.id}-${file}`}>{file}</span>
                        ))
                      ) : (
                        <span className="workpaper-tags__empty">No samples linked</span>
                      )}
                    </div>
                  </td>
                  <td className="workpaper-table__actions">
                    <button type="button" aria-label="row actions">
                      <FiMoreHorizontal />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <aside className="workpaper-preview-card">
          <header>
            <strong>[WORKPAPER NAME]</strong>
            <span>1 board</span>
          </header>
          <div className="workpaper-preview-card__image">
            <img src={workpaperPreview} alt="Workpaper preview" />
          </div>
          <div className="workpaper-preview-card__actions">
            <button type="button" onClick={handleReview}>
              Review workpaper
            </button>
            <button type="button" onClick={handleSendForReview}>
              Send for review
            </button>
            <button type="button" onClick={handleMoveToWorkflow}>
              Move to workflow
            </button>
          </div>
        </aside>
      </main>

      <div className="workpaper-agent-panel">
        <div>
          <strong>What's next?</strong>
          <ul>
            <li>Adjust any cards</li>
            <li>Recommend next steps</li>
            <li>Create a new flow chart</li>
            <li>Add more options</li>
          </ul>
        </div>
        <div className="workpaper-agent-panel__input">
          <label htmlFor="workpaper-agent-input">Ask me anything...</label>
          <div className="workpaper-agent-panel__input-row">
            <input id="workpaper-agent-input" placeholder="e.g., summarize evidence" />
            <button type="button" onClick={handleReview}>
              Send
            </button>
          </div>
        </div>
      </div>

      <div className="workpaper-action-bar">
        {Array.from({ length: 6 }).map((_, idx) => (
          <span key={idx}>+</span>
        ))}
        <span className="workpaper-action-bar__label">[Action bar]</span>
      </div>
    </div>
  )
}
