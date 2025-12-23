import { memo } from 'react'

type Step = {
  id: string
  title: string
  subtitle?: string
}

type Props = {
  steps: Step[]
  activeId: string | null
  showAll: boolean
  onSelect: (agentId: string) => void
  onPrev: () => void
  onNext: () => void
  onToggleShowAll: () => void
}

function DocumentAnalyzerStepperImpl({ steps, activeId, showAll, onSelect, onPrev, onNext, onToggleShowAll }: Props) {
  const activeIndex = activeId ? steps.findIndex((s) => s.id === activeId) : -1
  const canPrev = !showAll && activeIndex > 0
  const canNext = !showAll && activeIndex >= 0 && activeIndex < steps.length - 1

  return (
    <div className="da-stepper">
      <div className="da-stepper__header">
        <div className="da-stepper__title">Agent stepper</div>
        <label className="da-stepper__toggle">
          <input type="checkbox" checked={showAll} onChange={onToggleShowAll} />
          <span>Show all</span>
        </label>
      </div>

      <ol className="da-stepper__list">
        {steps.map((step, idx) => {
          const isActive = step.id === activeId && !showAll
          const className = isActive ? 'da-step da-step--active' : 'da-step'
          return (
            <li key={step.id} className={className}>
              <button type="button" onClick={() => onSelect(step.id)} disabled={showAll}>
                <span className="da-step__index">{idx + 1}</span>
                <span className="da-step__meta">
                  <span className="da-step__label">{step.title}</span>
                  {step.subtitle && <span className="da-step__desc">{step.subtitle}</span>}
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      <div className="da-stepper__actions">
        <button type="button" onClick={onPrev} disabled={!canPrev}>
          Back
        </button>
        <button type="button" onClick={onNext} disabled={!canNext}>
          Next
        </button>
      </div>
    </div>
  )
}

const DocumentAnalyzerStepper = memo(DocumentAnalyzerStepperImpl)
export default DocumentAnalyzerStepper

