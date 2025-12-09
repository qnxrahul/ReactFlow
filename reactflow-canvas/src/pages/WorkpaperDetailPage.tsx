import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PDFDocument } from 'pdf-lib'
import { recordWorkflowStep } from '../services/workspaceApi'
import { LAST_CREATED_WORKSPACE_KEY } from '../constants/workspace'
import workpaperImage from '../assets/workpaper-detail-new.jpg'
import './WorkpaperDetailPage.css'

export default function WorkpaperDetailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [agentOpen, setAgentOpen] = useState(false)

  const workspaceId = useMemo(() => {
    const state = location.state as { workspaceId?: string } | null
    if (state?.workspaceId) return state.workspaceId
    if (typeof window !== 'undefined') {
      return window.sessionStorage.getItem(LAST_CREATED_WORKSPACE_KEY)
    }
    return null
  }, [location.state])

  useEffect(() => {
    let mounted = true
    const createPdf = async () => {
      try {
        const response = await fetch(workpaperImage)
        const bytes = await response.arrayBuffer()
        const pdfDoc = await PDFDocument.create()
        const jpg = await pdfDoc.embedJpg(bytes)
        const { width, height } = jpg.size()
        const page = pdfDoc.addPage([width, height])
        page.drawImage(jpg, { x: 0, y: 0, width, height })
        const pdfBytes = await pdfDoc.save()
        if (!mounted) return
        const buffer = pdfBytes.buffer as ArrayBuffer
        const blob = new Blob([buffer], { type: 'application/pdf' })
        setPdfUrl(URL.createObjectURL(blob))
      } catch (error) {
        console.error('Unable to render PDF', error)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    void createPdf()
    return () => {
      mounted = false
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  }, [])

  useEffect(() => {
    if (!workspaceId) return
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(LAST_CREATED_WORKSPACE_KEY, workspaceId)
    }
    void recordWorkflowStep(workspaceId, { step: 'workpaper-detail' }).catch((error) => {
      if (import.meta.env.DEV) {
        console.error('Failed to record workpaper detail workflow step', error)
      }
    })
  }, [workspaceId])

  const handleFinish = () => {
    navigate('/workspace', workspaceId ? { state: { workspaceId } } : undefined)
  }

  const viewerSrc = useMemo(() => (pdfUrl ? `${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0` : null), [pdfUrl])

  return (
    <div className="workpaper-detail-kpmg">
      <header className="workpaper-detail-kpmg__actions">
        <button type="button" onClick={handleFinish}>
          Finish &amp; publish
        </button>
      </header>

      <div className="workpaper-detail-kpmg__viewer">
        {loading ? <div className="workpaper-detail-kpmg__loading">Preparing workpaper…</div> : viewerSrc ? <iframe title="Workpaper detail" src={viewerSrc} /> : <div className="workpaper-detail-kpmg__loading">Unable to render workpaper.</div>}
      </div>

      <button className="workpaper-detail-kpmg__agent-toggle" type="button" onClick={() => setAgentOpen((value) => !value)}>
        {agentOpen ? 'Close agent' : 'Ask agent'}
      </button>

      {agentOpen && (
        <div className="workpaper-detail-kpmg__agent">
          <header>Agent Cloud</header>
          <p>Summarize comments, highlight missing evidence, or draft reviewer notes.</p>
          <textarea placeholder="Ask me anything about this workpaper…" />
          <button type="button">Send</button>
        </div>
      )}
    </div>
  )
}
