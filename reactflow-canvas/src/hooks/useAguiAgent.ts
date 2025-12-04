import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  EventType,
  type BaseEvent,
  type Message,
  type RunAgentInput,
  type Tool,
  HttpAgent,
} from '@ag-ui/client'

import { createAgentClient, createThreadId, isAguiConfigured } from '../services/aguiClient'

export type AgentStatus = 'idle' | 'running' | 'error'

export type AgentMessage = {
  id: string
  role: Message['role']
  content: string
  streaming?: boolean
}

export type InterruptState = {
  id?: string
  reason?: string
  payload?: unknown
}

export type StartAgentRunArgs = {
  messages: Message[]
  state?: RunAgentInput['state']
  tools?: Tool[]
  context?: RunAgentInput['context']
  forwardedProps?: RunAgentInput['forwardedProps']
  resume?: {
    interruptId?: string
    payload?: unknown
  }
}

const hasCrypto = typeof globalThis !== 'undefined' && typeof globalThis.crypto !== 'undefined'
const generateRunId = () =>
  hasCrypto && 'randomUUID' in globalThis.crypto
    ? globalThis.crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

type RunInputBase = Omit<RunAgentInput, 'runId'>

type RunWithResume = RunAgentInput & { resume?: StartAgentRunArgs['resume'] }

export function useAguiAgent(options?: { threadId?: string }) {
  const resolvedThreadId = useMemo(() => createThreadId(options?.threadId), [options?.threadId])

  const clientRef = useRef<HttpAgent | null>(null)
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null)
  const lastBaseInputRef = useRef<RunInputBase | null>(null)
  const interruptRef = useRef<InterruptState | null>(null)

  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [status, setStatus] = useState<AgentStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [interrupt, setInterrupt] = useState<InterruptState | null>(null)

  const enabled = isAguiConfigured

  useEffect(() => {
    clientRef.current = createAgentClient(resolvedThreadId)
    return () => {
      subscriptionRef.current?.unsubscribe()
      subscriptionRef.current = null
    }
  }, [resolvedThreadId])

  const handleTextStart = useCallback((event: BaseEvent & { messageId?: string; role?: Message['role'] }) => {
    const messageId = event.messageId
    if (!messageId) return
    setMessages((prev) => {
      const exists = prev.some((msg) => msg.id === messageId)
      if (exists) return prev
      return [...prev, { id: messageId, role: event.role ?? 'assistant', content: '', streaming: true }]
    })
  }, [])

  const handleTextDelta = useCallback((event: BaseEvent & { messageId?: string; delta?: string }) => {
    const messageId = event.messageId
    if (!messageId || !event.delta) return
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, content: msg.content + event.delta, streaming: true }
          : msg,
      ),
    )
  }, [])

  const handleTextEnd = useCallback((event: BaseEvent & { messageId?: string }) => {
    const messageId = event.messageId
    if (!messageId) return
    setMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, streaming: false } : msg)))
  }, [])

  const handleEvent = useCallback(
    (event: BaseEvent) => {
      switch (event.type) {
        case EventType.TEXT_MESSAGE_START:
          handleTextStart(event)
          break
        case EventType.TEXT_MESSAGE_CONTENT:
          handleTextDelta(event as BaseEvent & { messageId?: string; delta?: string })
          break
        case EventType.TEXT_MESSAGE_END:
          handleTextEnd(event)
          break
        case EventType.RUN_ERROR:
          setStatus('error')
          setError((event as { message?: string }).message ?? 'Agent run failed')
          break
        case EventType.RUN_FINISHED: {
          const finished = event as BaseEvent & {
            result?: unknown
            interrupt?: InterruptState
            outcome?: 'success' | 'interrupt'
          }
          if (finished.interrupt || finished.outcome === 'interrupt') {
            const interruptPayload = finished.interrupt ?? { reason: 'interrupt' }
            interruptRef.current = interruptPayload
            setInterrupt(interruptPayload)
            setStatus('idle')
          }
          break
        }
        default:
          break
      }
    },
    [handleTextDelta, handleTextEnd, handleTextStart],
  )

  const startRun = useCallback(
    (args: StartAgentRunArgs) => {
      if (!clientRef.current) {
        setError('AG-UI client is not configured. Set VITE_AGUI_AGENT_URL to enable it.')
        return
      }
      if (!args.messages || args.messages.length === 0) {
        setError('At least one message is required to start an AG-UI run.')
        return
      }

      const baseInput: RunInputBase = {
        threadId: resolvedThreadId,
        state: args.state ?? {},
        messages: args.messages,
        tools: args.tools ?? [],
        context: args.context ?? [],
        forwardedProps: args.forwardedProps ?? {},
      }

      lastBaseInputRef.current = baseInput
      interruptRef.current = null
      setInterrupt(null)
      setError(null)
      setMessages([])
      setStatus('running')

      subscriptionRef.current?.unsubscribe()

      const runInput: RunWithResume = {
        ...baseInput,
        runId: generateRunId(),
        ...(args.resume ? { resume: args.resume } : {}),
      }

      const observable = clientRef.current.run(runInput as RunAgentInput)
      subscriptionRef.current = observable.subscribe({
        next: handleEvent,
        error: (err) => {
          setStatus('error')
          setError(err?.message ?? 'Agent run failed')
        },
        complete: () => setStatus((prev) => (prev === 'running' ? 'idle' : prev)),
      })
    },
    [handleEvent, resolvedThreadId],
  )

  const resume = useCallback(
    (payload: unknown) => {
      if (!interruptRef.current || !lastBaseInputRef.current) {
        return
      }
      const resumeArgs: StartAgentRunArgs = {
        ...lastBaseInputRef.current,
        messages: lastBaseInputRef.current.messages,
        tools: lastBaseInputRef.current.tools,
        context: lastBaseInputRef.current.context,
        forwardedProps: lastBaseInputRef.current.forwardedProps,
        state: lastBaseInputRef.current.state,
        resume: {
          interruptId: interruptRef.current.id,
          payload,
        },
      }
      startRun(resumeArgs)
    },
    [startRun],
  )

  const cancel = useCallback(() => {
    subscriptionRef.current?.unsubscribe()
    subscriptionRef.current = null
    clientRef.current?.abortRun()
    interruptRef.current = null
    setInterrupt(null)
    setStatus('idle')
  }, [])

  const clear = useCallback(() => {
    setMessages([])
    setError(null)
  }, [])

  const latestAssistantMessage = useMemo(() => {
    const assistantMessages = messages.filter((msg) => msg.role === 'assistant')
    return assistantMessages[assistantMessages.length - 1]
  }, [messages])

  return {
    enabled,
    status,
    error,
    messages,
    interrupt,
    startRun,
    resume,
    cancel,
    clear,
    latestAssistantMessage,
  }
}
