import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PDFDocument } from 'pdf-lib'
import { recordWorkflowStep } from '../services/workspaceApi'
import { LAST_CREATED_WORKSPACE_KEY } from '../constants/workspace'
import workpaperImage from '../assets/workpaper-detail.jpg'
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

  const workflowNavState = workspaceId ? { state: { workspaceId } } : undefined

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

  return (
    <div className="workpaper-detail-pdf">
      <header className="workpaper-detail-pdf__header">
        <div>
          <span>Engagement &gt; Spaces &gt; Workpaper detail</span>
          <h1>Workpaper detail</h1>
          <p>Edit the workpaper directly in-line, then move it forward for review.</p>
        </div>
        <div className="workpaper-detail-pdf__actions">
          <button type="button" onClick={() => navigate('/workpaper', workflowNavState)}>
            Review workpaper
          </button>
          <button type="button" onClick={() => navigate('/workspace', workflowNavState)}>
            Publish to workspace
          </button>
        </div>
      </header>

      <section className="workpaper-detail-pdf__viewer">
        {isGenerating ? (
          <div className="workpaper-detail-pdf__loading">Generating PDF preview…</div>
        ) : pdfUrl ? (
          <iframe title="Workpaper detail PDF" src={pdfUrl} />
        ) : (
          <div className="workpaper-detail-pdf__error">Unable to render workpaper preview.</div>
        )}
      </section>

      <button className="workpaper-detail-pdf__agent-toggle" type="button" onClick={() => setAgentOpen((value) => !value)}>
        {agentOpen ? 'Close agent' : 'Ask agent'}
      </button>

      {agentOpen && (
        <div className="workpaper-detail-pdf__agent">
          <header>Need help?</header>
          <p>Summarize comments, draft reviewer notes, or highlight missing evidence.</p>
          <textarea placeholder="Ask me anything about this workpaper" />
          <button type="button">Send</button>
        </div>
      )}
    </div>
  )
}
