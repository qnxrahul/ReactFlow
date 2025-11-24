import { useNavigate } from 'react-router-dom'
import FlowStepper from '../components/FlowStepper'
import '../mapping-flow.css'
import mappingImage from '../assets/mapping.jpg'

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
          <span className="flow-preview__label">Frame · Mapping</span>
          <img src={mappingImage} alt="Document mapping mock" />
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
