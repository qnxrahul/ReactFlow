import { Link } from 'react-router-dom'

export type FlowStepKey = 'mapping' | 'workpaper' | 'detail'

export type FlowStep = {
  key: FlowStepKey
  label: string
  description: string
  path: string
}

export const FLOW_STEPS: FlowStep[] = [
  {
    key: 'mapping',
    label: 'Mapping',
    description: 'Document intake & pairing',
    path: '/mapping',
  },
  {
    key: 'workpaper',
    label: 'Workpaper',
    description: 'Assemble testing evidence',
    path: '/workpaper',
  },
  {
    key: 'detail',
    label: 'Workpaper detail',
    description: 'Review & sign-off',
    path: '/workpaper-detail',
  },
]

type FlowStepperProps = {
  activeStep: FlowStepKey
}

export function FlowStepper({ activeStep }: FlowStepperProps) {
  const activeIndex = FLOW_STEPS.findIndex((step) => step.key === activeStep)

  return (
    <ol className="flow-steps">
      {FLOW_STEPS.map((step, index) => {
        const status = index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'upcoming'
        const className =
          status === 'active' ? 'flow-step flow-step--active' : status === 'done' ? 'flow-step flow-step--done' : 'flow-step'

        return (
          <li key={step.key} className={className}>
            <Link to={step.path}>
              <span className="flow-step__index">{index + 1}</span>
              <span className="flow-step__meta">
                <span className="flow-step__label">{step.label}</span>
                <span className="flow-step__desc">{step.description}</span>
              </span>
            </Link>
          </li>
        )
      })}
    </ol>
  )
}

export default FlowStepper
