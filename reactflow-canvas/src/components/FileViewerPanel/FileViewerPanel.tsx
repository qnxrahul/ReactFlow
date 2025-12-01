// FileViewerPanel.tsx
import { useState, useEffect } from 'react'
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
  Inject 
} from '@syncfusion/ej2-react-pdfviewer'
import { 
  DocumentEditorContainerComponent, 
  Toolbar as DocToolbar 
} from '@syncfusion/ej2-react-documenteditor'
import { 
  SpreadsheetComponent 
} from '@syncfusion/ej2-react-spreadsheet'
import { FiDownload } from 'react-icons/fi'
import './FileViewerPanel.css'

interface FileViewerPanelProps {
  file: File
  fileName: string
}

type FileType = 'pdf' | 'word' | 'excel' | 'image' | 'text' | 'unsupported'

/**
 * FileViewerPanel - Reusable file viewer using Syncfusion
 * Supports: PDF, Word, Excel, Images, Text files
 */
export default function FileViewerPanel({ file, fileName }: FileViewerPanelProps) {
  const [fileUrl, setFileUrl] = useState<string>('')
  const [fileType, setFileType] = useState<FileType>('unsupported')
  const [textContent, setTextContent] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setFileUrl(url)
    
    const detectedType = detectFileType(file, fileName)
    setFileType(detectedType)
    
    if (detectedType === 'text') {
      loadTextContent(file)
    } else {
      setIsLoading(false)
    }
    
    return () => URL.revokeObjectURL(url)
  }, [file, fileName])

  const detectFileType = (file: File, fileName: string): FileType => {
    const extension = fileName.split('.').pop()?.toLowerCase() || ''
    const mimeType = file.type

    if (mimeType === 'application/pdf' || extension === 'pdf') {
      return 'pdf'
    }

    if (
      ['doc', 'docx'].includes(extension) ||
      mimeType.includes('msword') ||
      mimeType.includes('wordprocessingml')
    ) {
      return 'word'
    }

    if (
      ['xls', 'xlsx', 'csv'].includes(extension) ||
      mimeType.includes('spreadsheetml') ||
      mimeType.includes('ms-excel') ||
      mimeType === 'text/csv'
    ) {
      return 'excel'
    }

    if (
      mimeType.startsWith('image/') ||
      ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'].includes(extension)
    ) {
      return 'image'
    }

    if (
      mimeType.startsWith('text/') ||
      ['txt', 'json', 'xml', 'html', 'css', 'js', 'ts', 'tsx', 'md', 'log'].includes(extension)
    ) {
      return 'text'
    }

    return 'unsupported'
  }

  const loadTextContent = (file: File) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      setTextContent(e.target?.result as string || '')
      setIsLoading(false)
    }
    
    reader.onerror = () => {
      console.error('Failed to read text file')
      setTextContent('Error loading file content')
      setIsLoading(false)
    }
    
    reader.readAsText(file)
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = fileUrl
    link.download = fileName
    link.click()
  }

  const renderFileViewer = () => {
    // PDF Viewer
    if (fileType === 'pdf') {
      return (
        <div className="file-viewer-panel__viewer-container">
          <PdfViewerComponent
            id="pdf-viewer"
            documentPath={fileUrl}
            serviceUrl="https://ej2services.syncfusion.com/production/web-services/api/pdfviewer"
            style={{ height: '100%', width: '100%' }}
            enableToolbar={true}
          >
            <Inject services={[
              Toolbar, 
              Magnification, 
              Navigation, 
              LinkAnnotation, 
              BookmarkView, 
              ThumbnailView, 
              Print, 
              TextSelection, 
              TextSearch, 
              Annotation
            ]} />
          </PdfViewerComponent>
        </div>
      )
    }

    // Word Document Viewer
    if (fileType === 'word') {
      return (
        <div className="file-viewer-panel__viewer-container">
          <DocumentEditorContainerComponent
            id="document-editor"
            serviceUrl="https://ej2services.syncfusion.com/production/web-services/api/documenteditor/"
            enableToolbar={true}
            height="100%"
          >
            <Inject services={[DocToolbar]} />
          </DocumentEditorContainerComponent>
        </div>
      )
    }

    // Excel/CSV Viewer
    if (fileType === 'excel') {
      return (
        <div className="file-viewer-panel__viewer-container">
          <SpreadsheetComponent
            openUrl="https://ej2services.syncfusion.com/production/web-services/api/spreadsheet/open"
            saveUrl="https://ej2services.syncfusion.com/production/web-services/api/spreadsheet/save"
            height="100%"
          />
        </div>
      )
    }

    // Image Viewer
    if (fileType === 'image') {
      return (
        <div className="file-viewer-panel__image-container">
          <img
            src={fileUrl}
            alt={fileName}
            className="file-viewer-panel__image"
          />
        </div>
      )
    }

    // Text Viewer
    if (fileType === 'text') {
      if (isLoading) {
        return (
          <div className="file-viewer-panel__loading">
            <div className="spinner"></div>
            <p>Loading file...</p>
          </div>
        )
      }
      
      return (
        <div className="file-viewer-panel__text-container">
          <pre className="file-viewer-panel__text-content">{textContent}</pre>
        </div>
      )
    }

    // Unsupported File Fallback
    return (
      <div className="file-viewer-panel__fallback">
        <div className="file-viewer-panel__fallback-icon">📄</div>
        <p className="file-viewer-panel__fallback-text">
          Preview not available for this file type
        </p>
        <p className="file-viewer-panel__fallback-name">{fileName}</p>
        <button 
          className="file-viewer-panel__fallback-download"
          onClick={handleDownload}
        >
          <FiDownload />
          Download File
        </button>
      </div>
    )
  }

  return (
    <div className="file-viewer-panel">
      {/* Header */}
      <div className="file-viewer-panel__header">
        <h3 className="file-viewer-panel__title">File Viewer</h3>
        <button 
          className="file-viewer-panel__download-btn"
          onClick={handleDownload}
          title="Download file"
        >
          <FiDownload />
        </button>
      </div>

      {/* Viewer Content */}
      <div className="file-viewer-panel__content">
        {renderFileViewer()}
      </div>

      {/* Footer */}
      <div className="file-viewer-panel__footer">
        <span className="file-viewer-panel__filename" title={fileName}>
          {fileName}
        </span>
        <span className="file-viewer-panel__filesize">
          {(file.size / 1024).toFixed(2)} KB
        </span>
      </div>
    </div>
  )
}