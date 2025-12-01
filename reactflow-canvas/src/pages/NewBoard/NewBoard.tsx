import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import boardConfig from '../../config/boardConfig.json'
import FileUpload from '../../components/FileUpload/FileUpload'
import './NewBoard.css'

// Type definitions for component state
interface Step {
  id: string
  label: string
  completed: boolean
}

interface Section {
  id: string
  title: string
  fileCount: number
  hasUpload: boolean  // Determines if section allows file uploads
}

interface UploadedFile {
  id: string
  file: File
  sectionId: string  // Links file to its section
}

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
  
  // Initialize state from config file
  const [steps, setSteps] = useState<Step[]>(boardConfig.steps)
  const [sections, setSections] = useState<Section[]>(boardConfig.sections)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

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
  const handleFilesChange = (sectionId: string, files: File[]) => {
    // Update the file count display for this section
    setSections(prevSections =>
      prevSections.map(section =>
        section.id === sectionId
          ? { ...section, fileCount: files.length }
          : section
      )
    )
    
    // Store files with metadata for later use in extraction screen
    const newFiles: UploadedFile[] = files.map(file => ({
      id: `${sectionId}-${file.name}-${Date.now()}`,
      file,
      sectionId
    }))
    
    // Replace old files for this section with new ones
    setUploadedFiles(prev => [
      ...prev.filter(f => f.sectionId !== sectionId),
      ...newFiles
    ])
  }

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
      state: { files: sampleFiles }
    })
  }

  /**
   * Helper to get uploaded files for a specific section
   * @param sectionId - Section to retrieve files for
   * @returns Array of files for that section
   */
  const getSectionFiles = (sectionId: string) => {
    return uploadedFiles.filter(f => f.sectionId === sectionId)
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
                  /* Show file upload component for Items to Test and Sample Documentation */
                  <FileUpload
                    sectionId={section.id}
                    onFilesChange={(files) => handleFilesChange(section.id, files)}
                    maxFiles={20}
                  />
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