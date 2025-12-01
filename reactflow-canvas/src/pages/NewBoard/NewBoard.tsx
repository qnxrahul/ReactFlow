import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import boardConfig from '../../config/boardConfig.json'
import FileUpload from '../../components/FileUpload/FileUpload'
import { useBoards, type WorkspaceLane } from '../../state/BoardsProvider'
import { LAST_CREATED_WORKSPACE_KEY } from '../../constants/workspace'
import './NewBoard.css'

// Type definitions for component state
interface Step {
  id: string
  label: string
  completed: boolean
}

interface SectionConfig {
  id: string
  title: string
  fileCount: number
  hasUpload: boolean  // Determines if section allows file uploads
}

type Section = SectionConfig & {
  files: string[]
  persistedFiles: string[]
}

interface UploadedFile {
  id: string
  file: File
  sectionId: string  // Links file to its section
}

const baseLaneTemplate: WorkspaceLane[] = boardConfig.sections
  .filter((section) => section.hasUpload)
  .map((section) => ({
    id: section.id,
    title: section.title,
    files: [],
  }))

const createSectionState = (section: SectionConfig): Section => ({
  ...section,
  files: [],
  persistedFiles: [],
})

const sectionsToLanes = (sections: Section[]): WorkspaceLane[] =>
  sections
    .filter((section) => section.hasUpload)
    .map((section) => ({
      id: section.id,
      title: section.title,
      files: [...section.files],
    }))

/**
 * NewBoard Component
 * 
 * Main landing page for the audit workspace with:
 * - To-do list sidebar for tracking MESP process steps
 * - File upload sections for Items to test and Sample Documentation
 * - Read-only sections for Document Mapping and Work Paper (auto-generated)
 * - Navigation to data extraction screen when files are ready
 */
export default function NewBoard() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { createBoard, updateBoard, boards, uploadFile } = useBoards()
  const hasAutoCreatedRef = useRef(false)
  const boardIdParam = searchParams.get('boardId')
  
  // Initialize state from config file
  const [steps, setSteps] = useState<Step[]>(() => boardConfig.steps.map((step) => ({ ...step })))
  const [sections, setSections] = useState<Section[]>(() => boardConfig.sections.map(createSectionState))
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null)

  useEffect(() => {
    if (activeBoardId) return
    if (boardIdParam) {
      setActiveBoardId(boardIdParam)
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(LAST_CREATED_WORKSPACE_KEY, boardIdParam)
      }
      return
    }

    const storedId =
      typeof window !== 'undefined' ? window.sessionStorage.getItem(LAST_CREATED_WORKSPACE_KEY) : null
    if (storedId) {
      setActiveBoardId(storedId)
      if (!boardIdParam) {
        setSearchParams({ boardId: storedId })
      }
      return
    }

    if (hasAutoCreatedRef.current) return
    hasAutoCreatedRef.current = true
    void (async () => {
      try {
        const created = await createBoard({
          template: null,
          lanes: baseLaneTemplate.map((lane) => ({ ...lane, files: [...lane.files] })),
          tasksCount: steps.length,
        })
        setActiveBoardId(created.id)
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(LAST_CREATED_WORKSPACE_KEY, created.id)
        }
        setSearchParams({ boardId: created.id })
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Failed to bootstrap workspace board for NewBoard', error)
        }
      }
    })()
  }, [activeBoardId, boardIdParam, createBoard, setSearchParams, steps.length])

  const activeBoard = useMemo(
    () => (activeBoardId ? boards.find((board) => board.id === activeBoardId) ?? null : null),
    [activeBoardId, boards],
  )

  useEffect(() => {
    if (!activeBoard) return
    setSections((prev) =>
      prev.map((section) => {
        if (!section.hasUpload) return section
        const lane = activeBoard.lanes?.find(
          (item) => item.id === section.id || item.title === section.title,
        )
        if (!lane) return section
        const laneFiles = [...(lane.files ?? [])]
        return {
          ...section,
          files: laneFiles,
          persistedFiles: laneFiles,
          fileCount: laneFiles.length,
        }
      }),
    )
  }, [activeBoard])

  const persistLaneState = useCallback(
    async (nextSections: Section[], uploads: File[]) => {
      if (!activeBoardId) return

      if (uploads.length > 0) {
        try {
          await Promise.all(uploads.map((file) => uploadFile(activeBoardId, file)))
        } catch (error) {
          if (import.meta.env.DEV) {
            console.error('Failed to upload workspace files', error)
          }
        }
      }

      try {
        const lanesPayload = sectionsToLanes(nextSections)
        const filesCount = lanesPayload.reduce((total, lane) => total + lane.files.length, 0)
        await updateBoard(activeBoardId, (prev) => ({
          ...prev,
          lanes: lanesPayload,
          filesCount,
          tasksCount: steps.length,
        }))
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(LAST_CREATED_WORKSPACE_KEY, activeBoardId)
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Failed to persist workspace lanes', error)
        }
      }
    },
    [activeBoardId, steps.length, updateBoard, uploadFile],
  )

  /**
   * Toggles the completion status of a to-do list item
   * @param stepId - Unique identifier for the step
   */
  const handleStepToggle = (stepId: string) => {
    setSteps(prevSteps =>
      prevSteps.map(step =>
        step.id === stepId 
          ? { ...step, completed: !step.completed } 
          : step
      )
    )
  }

  /**
   * Updates file count and stores uploaded files when user uploads/removes files
   * @param sectionId - Section where files were uploaded
   * @param files - Array of File objects uploaded by user
   */
  const handleFilesChange = useCallback(
    (sectionId: string, files: File[]) => {
      setUploadedFiles((prev) => [
        ...prev.filter((file) => file.sectionId !== sectionId),
        ...files.map((file) => ({
          id: `${sectionId}-${file.name}-${Date.now()}-${Math.random()}`,
          file,
          sectionId,
        })),
      ])

      setSections((prev) => {
        const prevSection = prev.find((section) => section.id === sectionId)
        const previousNames = prevSection?.files ?? []
        const persistedNames = prevSection?.persistedFiles ?? []
        const pendingNames = files.map((file) => file.name)
        const mergedNames = Array.from(new Set([...persistedNames, ...pendingNames]))
        const nextSections = prev.map((section) =>
          section.id === sectionId
            ? { ...section, fileCount: mergedNames.length, files: mergedNames }
            : section,
        )
        const uploadsToSave = files.filter((file) => !previousNames.includes(file.name))
        void persistLaneState(nextSections, uploadsToSave)
        return nextSections
      })
    },
    [persistLaneState],
  )

  const handleRemovePersistedFile = useCallback(
    (sectionId: string, fileName: string) => {
      setSections((prev) => {
        let didChange = false
        const nextSections = prev.map((section) => {
          if (section.id !== sectionId) return section
          if (!section.persistedFiles.includes(fileName)) return section
          didChange = true
          const nextPersisted = section.persistedFiles.filter((name) => name !== fileName)
          const nextFiles = section.files.filter((name) => name !== fileName)
          return {
            ...section,
            persistedFiles: nextPersisted,
            files: nextFiles,
            fileCount: nextFiles.length,
          }
        })
        if (didChange) {
          void persistLaneState(nextSections, [])
        }
        return nextSections
      })
    },
    [persistLaneState],
  )

  /**
   * Navigates to data extraction screen with sample documentation files
   * Only called when user clicks "Open all items for data extraction"
   */
  const handleOpenDataExtraction = () => {
    // Filter only sample documentation files for extraction
    const sampleFiles = uploadedFiles.filter(
      f => f.sectionId === 'sample-documentation'
    )
    
    // Navigate with files in state (will be used by extraction screen)
    navigate('/sample-documentation/extract', {
      state: { files: sampleFiles, workspaceId: activeBoardId }
    })
  }

  return (
    <div className="new-board">
      {/* ==================== LEFT SIDEBAR - TO DO LIST ==================== */}
      <aside className="new-board__sidebar">
        <div className="workspace-todo-card">
          {/* Card Header */}
          <div className="workspace-todo-header">
            <h2>To Do List</h2>
            <span>{steps.length} cards</span>
          </div>
          
          {/* Checklist Items */}
          <ul className="workspace-todo-items">
            {steps.map((step) => (
              <li key={step.id} className="workspace-todo-item">
                <label>
                  <input
                    type="checkbox"
                    checked={step.completed}
                    onChange={() => handleStepToggle(step.id)}
                  />
                  <span>{step.label}</span>
                </label>
              </li>
            ))}
          </ul>

          {/* Update Button */}
          <button className="workspace-todo-update">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Update
          </button>
        </div>
      </aside>

      {/* ==================== MAIN CONTENT - FILE SECTIONS ==================== */}
      <main className="new-board__content">
        <div className="new-board__grid">
          {sections.map((section) => (
            <div key={section.id} className="new-board__section">
              {/* Section Header with Title and File Count */}
              <div className="new-board__section-header">
                <h3 className="new-board__section-title">{section.title}</h3>
                <span className="new-board__file-count">{section.fileCount} files</span>
              </div>
              
              {/* Section Body - Conditional Content */}
              <div className="new-board__section-body">
                {section.hasUpload ? (
                  <>
                    {section.persistedFiles.length > 0 && (
                      <ul className="new-board__persisted-files">
                        {section.persistedFiles.map((file) => (
                          <li key={`${section.id}-${file}`}>
                            <span>{file}</span>
                            <button
                              type="button"
                              aria-label={`Remove ${file}`}
                              onClick={() => handleRemovePersistedFile(section.id, file)}
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    <FileUpload
                      sectionId={section.id}
                      onFilesChange={(files) => handleFilesChange(section.id, files)}
                      maxFiles={20}
                    />
                  </>
                ) : (
                  /* Show placeholder text for auto-generated sections */
                  <div className="new-board__empty-section">
                    <p className="new-board__empty-text">
                      {section.id === 'document-mapping' 
                        ? 'Document mapping will be generated after data extraction'
                        : 'Work paper will be created from approved documents'
                      }
                    </p>
                  </div>
                )}
                
                {/* 
                  Show "Open all items for data extraction" link 
                  - Only for Sample Documentation section
                  - Only when files have been uploaded
                */}
                {section.id === 'sample-documentation' && section.fileCount > 0 && (
                  <button 
                    className="new-board__extract-link"
                    onClick={handleOpenDataExtraction}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 1V11M8 11L11 8M8 11L5 8" stroke="#1E49E2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M1 11V13C1 13.5304 1.21071 14.0391 1.58579 14.4142C1.96086 14.7893 2.46957 15 3 15H13C13.5304 15 14.0391 14.7893 14.4142 14.4142C14.7893 14.0391 15 13.5304 15 13V11" stroke="#1E49E2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Open all items for data extraction
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ==================== ACTION BAR ==================== */}
        <div className="new-board__action-bar">
          <div className="new-board__action-buttons">
            {sections.map((section) => (
              <button
                key={`action-${section.id}`}
                className="new-board__add-btn"
                onClick={() => console.log(`Action for ${section.id}`)}
                title={`Actions for ${section.title}`}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path 
                    d="M10 4.16669V15.8334M4.16669 10H15.8334" 
                    stroke="#1E49E2" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            ))}
          </div>
          <span className="new-board__action-label">[Action bar]</span>
        </div>
      </main>
    </div>
  )
}