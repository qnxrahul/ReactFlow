import { useNavigate } from 'react-router-dom'
import FlowStepper from '../components/FlowStepper'
import '../mapping-flow.css'

const mappingChecklist = [
  'Normalize document names and sources across ERP, billing, and manual uploads',
  'Surface AI extracted tags so reviewers can pair evidence faster',
  'Confirm the mapping ties back to the testing matrix & control IDs',
  'Flag any duplicates or missing support before proceeding',
]

const mappingStats = [
  { label: 'documents mapped', value: '18' },
  { label: 'systems reconciled', value: '4' },
  { label: 'open questions', value: '2' },
  { label: 'AI confidence', value: '92%' },
]

const mappingTags = ['Revenue', 'Q4 FY25', 'SOX 302', 'Sampling', 'AI summary', 'Pending approver']

const mappingColumns = [
  { title: 'Source documents', items: ['Invoice batch 1483', 'Rev rec schedule', 'Billing summary', 'Support ticket export'] },
  { title: 'AI tags', items: ['Customer', 'Contract #', 'Amount', 'Period', 'Control ref'] },
  { title: 'Workpaper pairing', items: ['WP-REV-12', 'WP-REV-18', 'WP-REV-22', 'WP-REV-26'] },
]

const mappingMatches = [
  { source: 'Invoice batch 1483 · $2.4M', target: 'WP-REV-12 · Sampling', status: 'Paired', tone: 'success' as const },
  { source: 'Rev rec schedule · Q4', target: 'WP-REV-18 · Analytics', status: 'Needs review', tone: 'warn' as const },
  { source: 'Support ticket export', target: 'Pending', status: 'Awaiting tag', tone: 'pending' as const },
]

export default function MappingPage() {
  const navigate = useNavigate()

  return (
    <div className="flow-page flow-page--mapping">
      <header className="flow-header">
        <div>
          <div className="flow-header__meta">Engagement workspace · Step 01</div>
          <h1>Map source documents before workpaper build-out.</h1>
          <p>
            Everything uploaded by the audit team and AI agent is normalized here. Once the mapping is signed off we pipe the curated
            evidence directly into the workpaper canvas.
          </p>
        </div>
        <div className="flow-header__actions">
          <button type="button" className="flow-btn--primary" onClick={() => navigate('/workpaper')}>
            Start workpaper build
          </button>
          <button type="button" className="flow-btn--secondary" onClick={() => navigate('/workspace/new')}>
            Adjust upload lanes
          </button>
        </div>
      </header>

      <FlowStepper activeStep="mapping" />

      <div className="flow-body">
        <section className="flow-card">
          <h2>Mapping checklist</h2>
          <p className="flow-card__summary">
            Review the automatically generated pairings or override them manually. A short checklist keeps everyone aligned before any
            downstream analysis begins.
          </p>
          <ul className="flow-list">
            {mappingChecklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <div className="flow-card__stats">
            {mappingStats.map((stat) => (
              <div key={stat.label} className="flow-card__stat">
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>

          <div className="flow-card__actions">
            <button type="button" className="flow-btn--primary" onClick={() => navigate('/workpaper')}>
              Confirm & continue
            </button>
            <button type="button">Export mapping</button>
            <button type="button">Share summary</button>
          </div>
        </section>

        <section className="flow-preview">
          <span className="flow-preview__label">Mapping workspace</span>
          <div className="mapping-frame">
            <div className="mapping-frame__top">
              <div>
                <strong>Document mapping board</strong>
                <span>3 lanes · synced 2 mins ago</span>
              </div>
              <button type="button">Auto match</button>
            </div>

            <div className="mapping-columns">
              {mappingColumns.map((column) => (
                <div key={column.title} className="mapping-column">
                  <div className="mapping-column__title">{column.title}</div>
                  <ul>
                    {column.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mapping-matchlist">
              {mappingMatches.map((match) => (
                <div key={match.source} className="mapping-match">
                  <span>{match.source}</span>
                  <span>{match.target}</span>
                  <span
                    className={
                      match.tone === 'success'
                        ? 'mapping-match__pill mapping-match__pill--success'
                        : match.tone === 'warn'
                          ? 'mapping-match__pill mapping-match__pill--warn'
                          : 'mapping-match__pill mapping-match__pill--pending'
                    }
                  >
                    {match.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="flow-sidebar">
          <span className="flow-badge">Live sync enabled</span>
          <div className="flow-sidebar__item">
            <strong>Owner</strong>
            Priya Shah · Engagement senior
          </div>
          <div className="flow-sidebar__item">
            <strong>Approver</strong>
            Marcus Le (Manager)
          </div>
          <div className="flow-sidebar__item">
            <strong>Agent status</strong>
            AI agent finished entity extraction · 2 mins ago
          </div>
          <div className="flow-sidebar__item">
            <strong>Highlights</strong>
            No exceptions detected · 3 support items flagged for clarification
          </div>
          <div className="flow-sidebar__item">
            <strong>Tags</strong>
            <div className="flow-tag-list">
              {mappingTags.map((tag) => (
                <span key={tag} className="flow-tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <div className="flow-nav-buttons">
        <button type="button" onClick={() => navigate('/workspace')}>
          Back to workspace
        </button>
        <button type="button" className="flow-btn--primary" onClick={() => navigate('/workpaper')}>
          Next · Workpaper
        </button>
      </div>
    </div>
  )
}
