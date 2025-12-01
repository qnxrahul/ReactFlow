import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { recordWorkflowStep } from '../services/workspaceApi'
import { LAST_CREATED_WORKSPACE_KEY } from '../constants/workspace'
import './WorkpaperDetailPage.css'

const sections = [
  {
    id: 'overview',
    title: 'Overview',
    content:
      'This workpaper summarizes the revenue cut-off testing performed for REV-23. All assertions have been tested and supporting evidence has been linked to the respective samples.',
  },
  {
    id: 'testing',
    title: 'Testing steps',
    content:
      '1. Selected 25 samples across Q4 shipments. 2. Reconciled invoice dates to shipping documents. 3. Verified posting dates and ensured recognition within the correct period. 4. Documented exceptions and prepared tie-out notes.',
  },
  {
    id: 'results',
    title: 'Results & conclusions',
    content:
      'No material exceptions identified. Minor delays were noted on Sample 18 and 22; both resolved with management explanations. Control conclusion: Operating effectively.',
  },
]

export default function WorkpaperDetailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [activeSection, setActiveSection] = useState(sections[0])

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
    <div className="workpaper-detail-page">
      <header className="workpaper-detail-page__header">
        <div>
          <p>Engagement &gt; Spaces &gt; Workpaper detail</p>
          <h1>Editable workpaper</h1>
          <span>Review annotations, edit inline, and finalize the draft before publishing.</span>
        </div>
        <div className="workpaper-detail-page__actions">
          <button type="button" onClick={() => navigate('/workspace', workflowNavState)}>
            Publish to workspace
          </button>
          <button type="button" onClick={() => navigate('/workpaper', workflowNavState)}>
            Reopen draft
          </button>
        </div>
      </header>

      <section className="workpaper-detail-editor">
        <aside className="workpaper-detail-sidebar">
          <h2>Sections</h2>
          <ul>
            {sections.map((section) => (
              <li key={section.id}>
                <button
                  type="button"
                  className={activeSection.id === section.id ? 'active' : ''}
                  onClick={() => setActiveSection(section)}
                >
                  {section.title}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="workpaper-detail-content">
          <header>
            <h3 contentEditable suppressContentEditableWarning>
              {activeSection.title}
            </h3>
            <span>Last edited 5 minutes ago · Auto-saved</span>
          </header>
          <article contentEditable suppressContentEditableWarning>
            {activeSection.content}
          </article>
          <div className="workpaper-detail-controls">
            <button type="button">Add annotation</button>
            <button type="button">Attach evidence</button>
          </div>
        </div>
      </section>

      <div className={isChatOpen ? 'workpaper-chat workpaper-chat--open' : 'workpaper-chat'}>
        {isChatOpen ? (
          <div className="workpaper-chat__panel">
            <header>
              <strong>Review assistant</strong>
              <button type="button" onClick={() => setIsChatOpen(false)}>
                Close
              </button>
            </header>
            <div className="workpaper-chat__body">
              <p>Ask the agent to summarize comments, draft responses, or highlight missing evidence.</p>
              <div className="workpaper-chat__input">
                <textarea placeholder="e.g., summarize changes in this section" />
                <button type="button">Send</button>
              </div>
            </div>
          </div>
        ) : (
          <button type="button" className="workpaper-chat__toggle" onClick={() => setIsChatOpen(true)}>
            Ask agent
          </button>
        )}
      </div>

      <div className="workpaper-detail-nav">
        <button type="button" onClick={() => navigate('/workpaper', workflowNavState)}>
          Back to workpaper
        </button>
        <button type="button" onClick={() => navigate('/workspace', workflowNavState)}>
          Finish & publish
        </button>
      </div>
    </div>
  )
}
