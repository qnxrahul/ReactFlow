import { useNavigate } from 'react-router-dom'
import FlowStepper from '../components/FlowStepper'
import '../mapping-flow.css'

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

const detailTimeline = [
  { label: 'Draft updated', when: 'Yesterday · 3:12 PM', actor: 'Alex' },
  { label: 'Manager review', when: 'Today · 9:04 AM', actor: 'Marcus' },
  { label: 'QA review', when: 'Today · 10:33 AM', actor: 'Dana' },
  { label: 'Ready to publish', when: 'Today · 10:45 AM', actor: 'System' },
]

const detailApprovals = [
  { role: 'Manager', actor: 'Marcus Le', time: '10:35 AM' },
  { role: 'QA', actor: 'Dana Ellis', time: '10:42 AM' },
]

const detailAnnotations = [
  'Comment 12 resolved · evidence attached',
  'Assertion coverage complete',
  'AI validated tie-out for contract set B',
  'Change log locked for this cycle',
]

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
          <span className="flow-preview__label">Workpaper detail</span>
          <div className="detail-frame">
            <div className="detail-frame__top">
              <div>
                <strong>Detail · REV-23</strong>
                <span>All comments resolved · no open exceptions</span>
              </div>
              <button type="button">View audit trail</button>
            </div>

            <div className="detail-grid">
              <div className="detail-timeline">
                {detailTimeline.map((item) => (
                  <div key={item.label} className="detail-timeline__item">
                    <div>
                      <strong>{item.label}</strong>
                      <div style={{ fontSize: 12, color: 'rgba(226,232,240,0.7)' }}>{item.actor}</div>
                    </div>
                    <span style={{ fontSize: 12, color: 'rgba(226,232,240,0.6)' }}>{item.when}</span>
                  </div>
                ))}
              </div>

              <div className="detail-panel">
                <div className="detail-panel__title">Approvals</div>
                <div className="detail-approvals">
                  {detailApprovals.map((approval) => (
                    <div key={approval.actor} className="detail-approval">
                      <span>{approval.role}</span>
                      <span>
                        {approval.actor} · {approval.time}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="detail-panel__title">Annotations</div>
                <div className="detail-annotations">
                  {detailAnnotations.map((note) => (
                    <div key={note} className="detail-annotation">
                      {note}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
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
