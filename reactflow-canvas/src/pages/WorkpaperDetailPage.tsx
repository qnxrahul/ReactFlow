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
  { title: 'Comment 12', body: 'Resolved · evidence attached · aligns with control RC-19' },
  { title: 'Assertion coverage', body: 'All key assertions signed by reviewer' },
  { title: 'AI validation', body: 'Tie-out completed for contract set B · confidence 0.94' },
  { title: 'Change log', body: 'Locked for this cycle · no open edits' },
]

export default function WorkpaperDetailPage() {
  const navigate = useNavigate()

  return (
    <div className="workspace-page workspace-page--new detail-page">
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

          <div className="detail-header-card">
            <div>
              <span>Review &amp; sign-off</span>
              <h1>All comments are closed.</h1>
              <p>Verify approvals, capture annotations, and publish the finalized workpaper back to the workspace.</p>
            </div>
            <div className="detail-header-card__actions">
              <button type="button" className="detail-header-card__btn detail-header-card__btn--primary" onClick={() => navigate('/workspace')}>
                Publish to workspace
              </button>
              <button type="button" className="detail-header-card__btn" onClick={() => navigate('/workpaper')}>
                Reopen draft
              </button>
            </div>
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

            <div className="detail-content">
              <section className="detail-main">
                <div className="detail-card detail-card--checklist">
                  <div className="detail-card__header">
                    <span>Sign-off checklist</span>
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
                </div>

                <div className="detail-card detail-card--notes">
                  <div className="detail-card__header">
                    <span>Annotations</span>
                    <strong>Highlights</strong>
                  </div>
                  <div className="detail-main__notes">
                    {detailNotes.map((note) => (
                      <article key={note.title}>
                        <span />
                        <div>
                          <strong>{note.title}</strong>
                          <p>{note.body}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </section>

              <aside className="detail-side">
                <div className="detail-timeline-panel">
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
                </div>

                <div className="detail-approvals-panel">
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
                </div>
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
