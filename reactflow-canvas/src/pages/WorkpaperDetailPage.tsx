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
  const [isGenerating, setIsGenerating] = useState(true)
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
    let isMounted = true
    let objectUrl: string | null = null

    const generatePdf = async () => {
      try {
        const response = await fetch(workpaperImage)
        const imageBytes = await response.arrayBuffer()
        const pdfDoc = await PDFDocument.create()
        const jpgImage = await pdfDoc.embedJpg(imageBytes)
        const { width, height } = jpgImage.size()
        const page = pdfDoc.addPage([width, height])
        page.drawImage(jpgImage, { x: 0, y: 0, width, height })
        const pdfBytes = await pdfDoc.save()
        if (!isMounted) return
        objectUrl = URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }))
        setPdfUrl(objectUrl)
      } catch (error) {
        console.error('Failed to generate PDF from image', error)
      } finally {
        if (isMounted) setIsGenerating(false)
      }
    }

    void generatePdf()

    return () => {
      isMounted = false
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
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

  const handleBack = () => navigate('/workpaper', workspaceId ? { state: { workspaceId } } : undefined)

  return (
    <div className="workpaper-detail-viewer">
      <div className="workpaper-detail-viewer__frame">
        <div className="workpaper-detail-viewer__toolbar">
          <button type="button" onClick={handleBack}>Back</button>
          <div className="workpaper-detail-viewer__actions">
            <button type="button">Zoom -</button>
            <button type="button">100%</button>
            <button type="button">Zoom +</button>
          </div>
        </div>

        <div className="workpaper-detail-viewer__surface">
          {isGenerating ? (
            <div className="workpaper-detail-viewer__loading">Preparing workpaper preview…</div>
          ) : pdfUrl ? (
            <iframe title="Workpaper detail PDF" src={pdfUrl} />
          ) : (
            <div className="workpaper-detail-viewer__loading">Unable to render workpaper preview.</div>
          )}
        </div>
      </div>

      <button className="workpaper-detail-viewer__agent-toggle" type="button" onClick={() => setAgentOpen((value) => !value)}>
        {agentOpen ? 'Close assistant' : 'Ask agent'}
      </button>

      {agentOpen && (
        <div className="workpaper-detail-viewer__agent">
          <header>Agent Cloud</header>
          <p>Summarize comments, draft reviewer notes, or highlight missing evidence.</p>
          <textarea placeholder="Ask me anything about this workpaper…" />
          <button type="button">Send</button>
        </div>
      )}
    </div>
  )
}
