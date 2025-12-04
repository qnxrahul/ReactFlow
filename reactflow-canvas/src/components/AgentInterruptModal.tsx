import { useEffect, useState } from 'react'

import type { AgentStatus, InterruptState } from '../hooks/useAguiAgent'

type Props = {
  interrupt: InterruptState | null
  status: AgentStatus
  onResume: (payload: unknown) => void
  onCancel: () => void
}

export function AgentInterruptModal({ interrupt, status, onResume, onCancel }: Props) {
  const [payloadText, setPayloadText] = useState('')
  const [parseError, setParseError] = useState<string | null>(null)

  useEffect(() => {
    if (!interrupt) {
      setPayloadText('')
      setParseError(null)
      return
    }
    const pretty = JSON.stringify(interrupt.payload ?? {}, null, 2)
    setPayloadText(pretty)
    setParseError(null)
  }, [interrupt])

  if (!interrupt) return null

  const handleResume = () => {
    try {
      const parsed = payloadText.trim() ? JSON.parse(payloadText) : {}
      onResume(parsed)
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Invalid JSON payload')
    }
  }

  return (
    <div className="agent-interrupt-overlay" role="dialog" aria-modal="true">
      <div className="agent-interrupt-dialog">
        <header>
          <h2>Agent paused</h2>
          <p>{interrupt.reason ? interrupt.reason.replaceAll('_', ' ') : 'Action required'}</p>
        </header>
        <div className="agent-interrupt-body">
          <label htmlFor="agent-interrupt-payload">Payload</label>
          <textarea
            id="agent-interrupt-payload"
            value={payloadText}
            onChange={(event) => setPayloadText(event.target.value)}
            rows={8}
          />
          {parseError && <p className="agent-interrupt-error">{parseError}</p>}
        </div>
        <footer>
          <button type="button" onClick={onCancel} aria-label="Cancel running agent">
            Cancel run
          </button>
          <button type="button" onClick={handleResume} disabled={status === 'running'} aria-label="Resume agent run">
            Resume with payload
          </button>
        </footer>
      </div>
    </div>
  )
}

export default AgentInterruptModal
