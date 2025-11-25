import { useNavigate } from 'react-router-dom'
import { FiCompass, FiGrid, FiLayers, FiSettings } from 'react-icons/fi'
import '../workspace-board.css'

const navIcons = [FiGrid, FiCompass, FiLayers, FiSettings]

const detailStats = [
  { label: 'Comments resolved', value: '24 / 24' },
  { label: 'Sign-offs', value: '2 of 2' },
  { label: 'Exceptions', value: '0' },
  { label: 'Evidence links', value: '32' },
]

const detailChecklist = [
  'Review open comments from manager and QA reviewer',
  'Lock sections that have been tie-out tested',
  'Capture approval trail with timestamps and roles',
  'Publish the finalized workpaper back to the workspace hub',
]

const detailTags = ['Sign-off', 'Ready to publish', 'No exceptions', 'AI validated', 'Audit trail']

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

const detailNotes = [
  'Comment 12 resolved · evidence attached',
  'Assertion coverage complete',
  'AI validated tie-out for contract set B',
  'Change log locked for this cycle',
]

export default function WorkpaperDetailPage() {
  const navigate = useNavigate()

  return (
    <div className="workspace-page workspace-page--new detail-page">
      <header className="workspace-hero workspace-hero--new detail-hero">
        <div>
          <h1>Review & sign-off</h1>
          <p>All comments are closed. Verify the approvals, capture annotations, and publish the finalized workpaper.</p>
        </div>
        <div className="detail-hero__actions">
          <button type="button" className="detail-hero__btn detail-hero__btn--primary" onClick={() => navigate('/workspace')}>
            Publish to workspace
          </button>
          <button type="button" className="detail-hero__btn detail-hero__btn--secondary" onClick={() => navigate('/workpaper')}>
            Reopen draft
          </button>
        </div>
      </header>

      <div className="workspace-body workspace-body--single">
        <nav className="workspace-rail" aria-label="Primary">
          {navIcons.map((Icon, idx) => (
            <button key={idx} type="button" aria-label={`Nav ${idx + 1}`}>
              <Icon />
            </button>
          ))}
        </nav>

        <div className="workspace-new-canvas detail-canvas">
          <div className="workspace-board-top detail-board-top">
            <div>Engagement &gt; Spaces &gt; Detail</div>
            <span>Frame 2110704771</span>
          </div>

          <div className="detail-summary">
            {detailStats.map((stat) => (
              <div key={stat.label} className="detail-summary__card">
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </div>
            ))}
          </div>

          <div className="workspace-board-region detail-board-region">
            <div className="detail-board-status">
              <div>
                <span className="detail-board-status__label">Detail</span>
                <strong>REV-23 · Final approvals</strong>
              </div>
              <div className="detail-board-status__actions">
                <button type="button">Download packet</button>
                <button type="button">Share link</button>
              </div>
            </div>

            <div className="detail-grid">
              <section className="detail-main">
                <div className="detail-main__header">
                  <div>
                    <span>Sign-off checklist</span>
                    <strong>Review trail</strong>
                  </div>
                  <button type="button">View audit trail</button>
                </div>

                <ul className="detail-main__checklist">
                  {detailChecklist.map((item) => (
                    <li key={item}>
                      <span />
                      <div>
                        <strong>{item}</strong>
                        <small>Completed</small>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="detail-main__notes">
                  {detailNotes.map((note) => (
                    <article key={note}>
                      <span />
                      <p>{note}</p>
                    </article>
                  ))}
                </div>
              </section>

              <aside className="detail-timeline-panel">
                <header>Timeline</header>
                <ul>
                  {detailTimeline.map((item) => (
                    <li key={item.label}>
                      <div>
                        <strong>{item.label}</strong>
                        <span>{item.actor}</span>
                      </div>
                      <time>{item.when}</time>
                    </li>
                  ))}
                </ul>
              </aside>

              <aside className="detail-approvals-panel">
                <header>Approvals</header>
                <div className="detail-approvals">
                  {detailApprovals.map((approval) => (
                    <div key={approval.actor}>
                      <span>{approval.role}</span>
                      <strong>
                        {approval.actor} · {approval.time}
                      </strong>
                    </div>
                  ))}
                </div>
                <div className="detail-tags">
                  {detailTags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <button type="button" className="detail-approvals-panel__cta" onClick={() => navigate('/workspace')}>
                  Publish & notify
                </button>
              </aside>
            </div>
          </div>
        </div>
      </div>

      <div className="detail-nav">
        <button type="button" onClick={() => navigate('/workpaper')}>
          Back to workpaper
        </button>
        <button type="button" onClick={() => navigate('/workspace')}>
          Finish & publish
        </button>
      </div>
    </div>
  )
}
