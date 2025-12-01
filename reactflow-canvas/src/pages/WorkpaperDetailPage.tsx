import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { recordWorkflowStep } from '../services/workspaceApi'
import { LAST_CREATED_WORKSPACE_KEY } from '../constants/workspace'
import workpaperDetailImage from '../assets/workpaper-detail.jpg'
import './WorkpaperDetailPage.css'

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
    <div className="workpaper-detail-page">
      <header className="workpaper-detail-page__header">
        <div>
          <p>Engagement &gt; Spaces &gt; Workpaper detail</p>
          <h1>Editable workpaper</h1>
          <span>Review annotations, edit inline, and finalize the PDF before publishing.</span>
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

      <section className="workpaper-detail-viewer">
        <div className="workpaper-detail-viewer__toolbar">
          <div>
            <strong>REV-23 · Revenue cut-off</strong>
            <span>Editable PDF · 12 pages</span>
          </div>
          <div className="workpaper-detail-viewer__toolbar-actions">
            <button type="button">Outline</button>
            <button type="button">Annotations</button>
            <button type="button">Share</button>
          </div>
        </div>

        <div className="workpaper-detail-viewer__canvas">
          <img src={workpaperDetailImage} alt="Workpaper detail preview" />
        </div>

        <div className="workpaper-detail-viewer__footer">
          <button type="button">Previous page</button>
          <span>Page 4 of 12</span>
          <button type="button">Next page</button>
        </div>

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
                <p>👋 Need help summarizing annotations or drafting reviewer notes?</p>
                <ul>
                  <li>Summarize open comments</li>
                  <li>Draft manager response</li>
                  <li>Highlight missing evidence</li>
                </ul>
              </div>
              <div className="workpaper-chat__input">
                <textarea placeholder="Ask me anything..." />
                <button type="button">Send</button>
              </div>
            </div>
          ) : (
            <button type="button" className="workpaper-chat__toggle" onClick={() => setIsChatOpen(true)}>
              Ask agent
            </button>
          )}
        </div>
      </section>

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
