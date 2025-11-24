import { useNavigate } from 'react-router-dom'
import FlowStepper from '../components/FlowStepper'
import '../mapping-flow.css'
import workpaperImage from '../assets/workpaper.jpg'

const workpaperTasks = [
  'Summarize the mapped evidence into testing steps',
  'Attach sampling tables and variance explanations',
  'Capture reviewer notes directly on the canvas',
  'Queue the draft for manager review with AI highlights',
]

const workpaperStats = [
  { label: 'tests in scope', value: '5' },
  { label: 'attachments', value: '32' },
  { label: 'AI generated notes', value: '7' },
  { label: 'review cycle', value: '1 of 2' },
]

const workpaperTags = ['Control 12.9', 'Assertions', 'Population tie-out', 'AI summary', 'Awaiting reviewer']

export default function WorkpaperPage() {
  const navigate = useNavigate()

  return (
    <div className="flow-page flow-page--workpaper">
      <header className="flow-header">
        <div>
          <div className="flow-header__meta">Engagement workspace · Step 02</div>
          <h1>Build the workpaper with structured, mapped evidence.</h1>
          <p>
            The curated mapping flows directly into this canvas. Drag evidence snippets, leverage AI callouts, and keep testing steps
            tied to the engagement methodology.
          </p>
        </div>
        <div className="flow-header__actions">
          <button type="button" className="flow-btn--primary" onClick={() => navigate('/workpaper-detail')}>
            Review details
          </button>
          <button type="button" className="flow-btn--secondary" onClick={() => navigate('/mapping')}>
            Revisit mapping
          </button>
        </div>
      </header>

      <FlowStepper activeStep="workpaper" />

      <div className="flow-body">
        <section className="flow-card">
          <h2>Evidence assembly</h2>
          <p className="flow-card__summary">
            Every module stays linked to the mapped sources so reviewers can trace back instantly. Use these guardrails before sending
            the draft forward.
          </p>
          <ul className="flow-list">
            {workpaperTasks.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <div className="flow-card__stats">
            {workpaperStats.map((stat) => (
              <div key={stat.label} className="flow-card__stat">
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>

          <div className="flow-card__actions">
            <button type="button" className="flow-btn--primary" onClick={() => navigate('/workpaper-detail')}>
              Send for review
            </button>
            <button type="button">Add reviewer</button>
            <button type="button">Download PDF</button>
          </div>
        </section>

        <section className="flow-preview">
          <span className="flow-preview__label">Frame · Workpaper</span>
          <img src={workpaperImage} alt="Workpaper canvas mock" />
        </section>

        <aside className="flow-sidebar">
          <span className="flow-badge">Draft in progress</span>
          <div className="flow-sidebar__item">
            <strong>Owner</strong>
            Alex Chen · Senior associate
          </div>
          <div className="flow-sidebar__item">
            <strong>Last update</strong>
            14 minutes ago by AI assistant
          </div>
          <div className="flow-sidebar__item">
            <strong>Reviewer queue</strong>
            Manager · Technical reviewer
          </div>
          <div className="flow-sidebar__item">
            <strong>AI guidance</strong>
            Suggested two additional assertions for Revenue Cut-off
          </div>
          <div className="flow-sidebar__item">
            <strong>Tags</strong>
            <div className="flow-tag-list">
              {workpaperTags.map((tag) => (
                <span key={tag} className="flow-tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <div className="flow-nav-buttons">
        <button type="button" onClick={() => navigate('/mapping')}>
          Back to mapping
        </button>
        <button type="button" className="flow-btn--primary" onClick={() => navigate('/workpaper-detail')}>
          Next · Workpaper detail
        </button>
      </div>
    </div>
  )
}
