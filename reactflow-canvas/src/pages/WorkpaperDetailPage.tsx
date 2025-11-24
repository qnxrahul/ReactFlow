import { useNavigate } from 'react-router-dom'
import FlowStepper from '../components/FlowStepper'
import '../mapping-flow.css'
import workpaperDetailImage from '../assets/workpaper-detail.jpg'

const detailChecklist = [
  'Review open comments from manager and QA reviewer',
  'Lock sections that have been tie-out tested',
  'Capture approval trail with timestamps and roles',
  'Publish the finalized workpaper back to the workspace hub',
]

const detailStats = [
  { label: 'comments resolved', value: '24 / 24' },
  { label: 'sign-offs', value: '2 of 2' },
  { label: 'exceptions', value: '0' },
  { label: 'evidence links', value: '32' },
]

const detailTags = ['Sign-off', 'Ready to publish', 'No exceptions', 'AI validated']

export default function WorkpaperDetailPage() {
  const navigate = useNavigate()

  return (
    <div className="flow-page flow-page--detail">
      <header className="flow-header">
        <div>
          <div className="flow-header__meta">Engagement workspace · Step 03</div>
          <h1>Finalize workpaper details and capture approvals.</h1>
          <p>
            The detail view mirrors the reference image in the repo—complete with layered annotations, approval panels, and tie backs
            to the audit trail.
          </p>
        </div>
        <div className="flow-header__actions">
          <button type="button" className="flow-btn--primary" onClick={() => navigate('/workspace')}>
            Publish to workspace
          </button>
          <button type="button" className="flow-btn--secondary" onClick={() => navigate('/workpaper')}>
            Reopen draft
          </button>
        </div>
      </header>

      <FlowStepper activeStep="detail" />

      <div className="flow-body">
        <section className="flow-card">
          <h2>Review trail</h2>
          <p className="flow-card__summary">
            Capture the final confirmation steps. Everything here reflects the structure from the workpaper detail mock.
          </p>
          <ul className="flow-list">
            {detailChecklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <div className="flow-card__stats">
            {detailStats.map((stat) => (
              <div key={stat.label} className="flow-card__stat">
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>

          <div className="flow-card__actions">
            <button type="button" className="flow-btn--primary" onClick={() => navigate('/workspace')}>
              Publish & notify
            </button>
            <button type="button">Download packet</button>
            <button type="button">Share link</button>
          </div>
        </section>

        <section className="flow-preview">
          <span className="flow-preview__label">Frame · Workpaper detail</span>
          <img src={workpaperDetailImage} alt="Workpaper detail mock" />
        </section>

        <aside className="flow-sidebar">
          <span className="flow-badge">Ready for sign-off</span>
          <div className="flow-sidebar__item">
            <strong>Approvers</strong>
            Marcus Le (Manager) · Dana Ellis (QA)
          </div>
          <div className="flow-sidebar__item">
            <strong>Timeline</strong>
            Drafted 1d ago · Reviewed 2h ago · Ready now
          </div>
          <div className="flow-sidebar__item">
            <strong>Controls linked</strong>
            RC-12 · RC-19 · RC-25
          </div>
          <div className="flow-sidebar__item">
            <strong>Tags</strong>
            <div className="flow-tag-list">
              {detailTags.map((tag) => (
                <span key={tag} className="flow-tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <div className="flow-nav-buttons">
        <button type="button" onClick={() => navigate('/workpaper')}>
          Back to workpaper
        </button>
        <button type="button" className="flow-btn--primary" onClick={() => navigate('/workspace')}>
          Finish & publish
        </button>
      </div>
    </div>
  )
}
