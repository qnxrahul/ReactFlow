import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FiCompass, FiGrid, FiLayers, FiSettings } from 'react-icons/fi'
import '../workspace-board.css'
import { recordWorkflowStep } from '../services/workspaceApi'
import { LAST_CREATED_WORKSPACE_KEY } from '../constants/workspace'

const navIcons = [FiGrid, FiCompass, FiLayers, FiSettings]

const workpaperStats = [
  { label: 'Tests in scope', value: '05' },
  { label: 'Attachments', value: '32' },
  { label: 'AI notes', value: '07' },
  { label: 'Review cycle', value: '1 of 2' },
]

const workpaperSteps = [
  { label: '00 Overview', status: 'Pinned' },
  { label: '01 Planning', status: 'Ready' },
  { label: '02 Testing', status: 'In progress' },
  { label: '03 Results', status: 'Review' },
]

const workpaperCards = [
  {
    title: 'Testing step · Revenue cut-off',
    meta: 'Linked to WP-REV-18 · Assertions A/R/C',
    footer: ['Owner · Alex', 'Last edit · 2m ago'],
  },
  {
    title: 'AI summary',
    meta: 'Variance noted on sample 11 · flagged for review',
    footer: ['Confidence 0.92', 'Auto note'],
  },
]

const workpaperStream = [
  { actor: 'Marcus', detail: 'Add reasoning for sampling expansion' },
  { actor: 'AI agent', detail: 'Drafted summary for attachment set B' },
  { actor: 'Dana', detail: 'Ready to review once notes addressed' },
]

const workpaperChecklist = [
  'Summarize the mapped evidence into testing steps',
  'Attach sampling tables and variance explanations',
  'Capture reviewer notes directly on the canvas',
  'Queue the draft for manager review with AI highlights',
]

const workpaperTags = ['Control 12.9', 'Assertions', 'Population tie-out', 'AI summary', 'Awaiting reviewer']

const todoItems = ['Confirm mapping', 'Add variance note', 'Attach sampling set', 'Ping Marcus for review']

export default function WorkpaperPage() {
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
    void recordWorkflowStep(workspaceId, { step: 'workpaper' }).catch((error) => {
      if (import.meta.env.DEV) {
        console.error('Failed to record workpaper workflow step', error)
      }
    })
  }, [workspaceId])

  return (
    <div className="workspace-page workspace-page--new workpaper-page">
      <div className="workspace-body workspace-body--single">
        <nav className="workspace-rail" aria-label="Primary">
          {navIcons.map((Icon, idx) => (
            <button key={idx} type="button" aria-label={`Nav ${idx + 1}`}>
              <Icon />
            </button>
          ))}
        </nav>

        <div className="workspace-new-canvas workpaper-canvas">
          <div className="workspace-board-top workpaper-board-top">
            <div>Engagement &gt; Spaces &gt; Workpaper</div>
            <span>Frame 2110704770</span>
          </div>

          <div className="workpaper-cta">
            <button
              type="button"
              className="workpaper-cta__btn workpaper-cta__btn--primary"
              onClick={() => navigate('/workpaper-detail', workflowNavState)}
            >
              Send for review
            </button>
            <button type="button" className="workpaper-cta__btn" onClick={() => navigate('/mapping', workflowNavState)}>
              Revisit mapping
            </button>
          </div>

          <div className="workpaper-summary">
            {workpaperStats.map((stat) => (
              <div key={stat.label} className="workpaper-summary__card">
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </div>
            ))}
          </div>

          <div className="workspace-board-region workpaper-board-region">
            <div className="workpaper-board-actions">
              <div className="workpaper-board-status">
                <span className="workpaper-board-status__label">Workpaper</span>
                <strong>REV-23 · Revenue cut-off</strong>
                <div className="workpaper-board-status__actions">
                  <button type="button">Attach file</button>
                  <button type="button" onClick={() => navigate('/workpaper-detail', workflowNavState)}>
                    View detail
                  </button>
                </div>
              </div>
              <div className="workpaper-board-meta">Draft owner · Alex Chen · Last update 14m ago</div>
            </div>

            <div className="workpaper-grid">
              <aside className="workpaper-panel">
                <header>
                  <span>Sections</span>
                  <button type="button">Reorder</button>
                </header>
                <ul>
                  {workpaperSteps.map((step) => (
                    <li key={step.label}>
                      <span>{step.label}</span>
                      <span className="workpaper-chip">{step.status}</span>
                    </li>
                  ))}
                </ul>
              </aside>

              <section className="workpaper-main">
                <div className="workpaper-main__header">
                  <div>
                    <span>Testing canvas</span>
                    <strong>Evidence assembly</strong>
                  </div>
                  <div className="workpaper-main__actions">
                    <button type="button">AI summary</button>
                    <button type="button">Add step</button>
                  </div>
                </div>

                <div className="workpaper-main__cards">
                  {workpaperCards.map((card) => (
                    <article key={card.title} className="workpaper-main-card">
                      <header>
                        <strong>{card.title}</strong>
                        <span className="workpaper-chip">Linked</span>
                      </header>
                      <p>{card.meta}</p>
                      <footer>
                        {card.footer.map((item) => (
                          <span key={item}>{item}</span>
                        ))}
                      </footer>
                    </article>
                  ))}
                </div>

                <div className="workpaper-checklist">
                  <header>Checklist</header>
                  <ul>
                    {workpaperChecklist.map((item) => (
                      <li key={item}>
                        <span />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              <aside className="workpaper-activity">
                <header>Activity</header>
                <ul>
                  {workpaperStream.map((entry) => (
                    <li key={entry.detail}>
                      <strong>{entry.actor}</strong>
                      <span>{entry.detail}</span>
                    </li>
                  ))}
                </ul>

                <div className="workpaper-tags">
                  {workpaperTags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>

                <div className="workpaper-todo">
                  <header>Quick actions</header>
                  <ul>
                    {todoItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </aside>
            </div>

            <div className="workspace-action-bar">
              {Array.from({ length: 6 }).map((_, idx) => (
                <span key={idx} className="workspace-action-dot">
                  +
                </span>
              ))}
              <button
                type="button"
                className="workspace-action-label"
                onClick={() => navigate('/workpaper-detail', workflowNavState)}
              >
                [Action bar]
              </button>
            </div>

            <div className="workspace-chat workspace-chat--new workpaper-chat">
              <label htmlFor="workpaper-chat-input">Ask me anything...</label>
              <textarea id="workpaper-chat-input" placeholder="Request automations, templates, or help." />
              <button type="button">Send</button>
            </div>
          </div>
        </div>
      </div>

      <div className="workpaper-nav">
        <button type="button" onClick={() => navigate('/mapping', workflowNavState)}>
          Back to mapping
        </button>
        <button type="button" onClick={() => navigate('/workpaper-detail', workflowNavState)}>
          Next · Workpaper detail
        </button>
      </div>
    </div>
  )
}
