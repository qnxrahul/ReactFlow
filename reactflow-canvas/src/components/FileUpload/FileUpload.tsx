import { useCallback, useState } from 'react'
import './FileUpload.css'

interface FileUploadProps {
  onFilesChange?: (files: File[]) => void
  acceptedTypes?: string
  maxFiles?: number
  sectionId?: string
}

interface UploadedFile {
  id: string
  file: File
  name: string
  type: string
}

/**
 * FileUpload - Reusable drag-and-drop file upload component
 * Supports click-to-upload, drag-and-drop, and file removal
 */
export default function FileUpload({ 
  onFilesChange, 
  acceptedTypes = '*',
  maxFiles = 10,
}: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)

  /**
   * Process and add new files to the upload list
   */
  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return

    const newFiles: UploadedFile[] = Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      name: file.name,
      type: file.type || getFileExtension(file.name),
    }))

    setUploadedFiles((prev) => {
      const combined = [...prev, ...newFiles].slice(0, maxFiles)
      onFilesChange?.(combined.map(f => f.file))
      return combined
    })
  }, [maxFiles, onFilesChange])

  /**
   * Handle file drop event
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  /**
   * Handle drag over event to show drop indicator
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  /**
   * Handle drag leave event to hide drop indicator
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  /**
   * Trigger native file picker on click
   */
  const handleClick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    if (acceptedTypes !== '*') {
      input.accept = acceptedTypes
    }
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement
      handleFiles(target.files)
    }
    input.click()
  }

  /**
   * Remove a file from the upload list
   */
  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => {
      const filtered = prev.filter(f => f.id !== fileId)
      onFilesChange?.(filtered.map(f => f.file))
      return filtered
    })
  }

  /**
   * Extract file extension from filename
   */
  const getFileExtension = (filename: string): string => {
    return filename.slice(filename.lastIndexOf('.')).toLowerCase()
  }

  /**
   * Get appropriate icon component based on file type
   */
  const getFileIcon = (filename: string) => {
    const ext = getFileExtension(filename)
    
    if (['.xls', '.xlsx', '.csv'].includes(ext)) {
      return <ExcelIcon />
    } else if (['.pdf'].includes(ext)) {
      return <PDFIcon />
    } else if (['.doc', '.docx'].includes(ext)) {
      return <WordIcon />
    } else {
      return <DocumentIcon />
    }
  }

  return (
    <div className="file-upload">
      <div
        className={`file-upload__dropzone ${isDragging ? 'dragging' : ''} ${uploadedFiles.length > 0 ? 'has-files' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        {isDragging ? (
          <div className="file-upload__drag-indicator">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>Drop files here</span>
          </div>
        ) : uploadedFiles.length === 0 ? (
          <div className="file-upload__empty">
            <span className="file-upload__hint">Click or drag files to upload</span>
          </div>
        ) : null}

        {uploadedFiles.length > 0 && !isDragging && (
          <div className="file-upload__files">
            {uploadedFiles.map((file) => (
              <div key={file.id} className="file-tag">
                <div className="file-tag__icon">
                  {getFileIcon(file.name)}
                </div>
                <span className="file-tag__label">{file.name}</span>
                <button
                  className="file-tag__close"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(file.id)
                  }}
                  title="Remove file"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// File type icon components
function ExcelIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="4" width="14" height="16" rx="1" fill="#E6F4E5"/>
      <rect x="15" y="4" width="4" height="3" fill="#178718"/>
      <path d="M9 10H15M9 13H15M9 16H13" stroke="#178718" strokeWidth="1.5" strokeLinecap="round"/>
      <rect x="8" y="17" width="8" height="3" rx="0.5" fill="#178718"/>
      <text x="12" y="19.5" fontSize="5" fill="white" textAnchor="middle">XLS</text>
    </svg>
  )
}

function PDFIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="4" width="14" height="16" rx="1" fill="#FFE5E5"/>
      <rect x="15" y="4" width="4" height="3" fill="#E41E23"/>
      <rect x="8" y="17" width="8" height="3" rx="0.5" fill="#E41E23"/>
      <text x="12" y="19.5" fontSize="5" fill="white" textAnchor="middle">PDF</text>
    </svg>
  )
}

function WordIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="4" width="14" height="16" rx="1" fill="#E5F0FF"/>
      <rect x="15" y="4" width="4" height="3" fill="#2B579A"/>
      <rect x="8" y="17" width="8" height="3" rx="0.5" fill="#2B579A"/>
      <text x="12" y="19.5" fontSize="5" fill="white" textAnchor="middle">DOC</text>
    </svg>
  )
}

function DocumentIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="4" width="14" height="16" rx="1" fill="#F5F6FA"/>
      <rect x="15" y="4" width="4" height="3" fill="#94A3B8"/>
      <path d="M9 10H15M9 13H15M9 16H13" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}