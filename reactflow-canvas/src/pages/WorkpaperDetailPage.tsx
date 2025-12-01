import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PDFDocument } from 'pdf-lib'
import {
  PdfViewerComponent,
  Toolbar,
  Magnification,
  Navigation,
  LinkAnnotation,
  BookmarkView,
  ThumbnailView,
  Print,
  TextSelection,
  TextSearch,
  Annotation,
  Inject,
} from '@syncfusion/ej2-react-pdfviewer'
import { recordWorkflowStep } from '../services/workspaceApi'
import { LAST_CREATED_WORKSPACE_KEY } from '../constants/workspace'
import workpaperImage from '../assets/workpaper-detail-new.jpg'
import './WorkpaperDetailPage.css'

export default function WorkpaperDetailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [documentData, setDocumentData] = useState<ArrayBuffer | null>(null)
  const [loading, setLoading] = useState(true)
  const [agentOpen, setAgentOpen] = useState(false)
  const viewerRef = useRef<PdfViewerComponent | null>(null)

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
    const convertImageToPdf = async () => {
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
        setDocumentData(pdfBytes.buffer)
      } catch (error) {
        console.error('Unable to generate PDF preview', error)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    void convertImageToPdf()
    return () => {
      isMounted = false
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

  useEffect(() => {
    if (documentData && viewerRef.current) {
      viewerRef.current.load(documentData, null)
    }
  }, [documentData])

  const handleFinish = () => {
    navigate('/workspace', workspaceId ? { state: { workspaceId } } : undefined)
  }

  return (
    <div className="workpaper-detail-sync">
      <header className="workpaper-detail-sync__header">
        <button type="button" onClick={handleFinish}>
          Finish &amp; publish
        </button>
      </header>

      <div className="workpaper-detail-sync__viewer">
        {loading ? (
          <div className="workpaper-detail-sync__loading">Preparing workpaper preview…</div>
        ) : documentData ? (
          <PdfViewerComponent
            ref={(scope) => {
              viewerRef.current = scope
            }}
            serviceUrl="https://ej2services.syncfusion.com/production/web-services/api/pdfviewer"
            height="100%"
            width="100%"
            enableToolbar
          >
            <Inject
              services={[
                Toolbar,
                Magnification,
                Navigation,
                LinkAnnotation,
                BookmarkView,
                ThumbnailView,
                Print,
                TextSelection,
                TextSearch,
                Annotation,
              ]}
            />
          </PdfViewerComponent>
        ) : (
          <div className="workpaper-detail-sync__loading">Unable to render preview.</div>
        )}
      </div>

      <button className="workpaper-detail-sync__agent-toggle" type="button" onClick={() => setAgentOpen((value) => !value)}>
        {agentOpen ? 'Close agent' : 'Ask agent'}
      </button>

      {agentOpen && (
        <div className="workpaper-detail-sync__agent">
          <header>Agent Cloud</header>
          <p>Summarize comments, flag missing evidence, or ask for recommendations.</p>
          <textarea placeholder="Ask me anything about this workpaper…" />
          <button type="button">Send</button>
        </div>
      )}
    </div>
  )
}
