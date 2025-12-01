import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { FiCheck, FiSearch } from 'react-icons/fi'
import DocumentTabs, { type DocumentTab } from '../../components/DocumentTabs/DocumentTabs'
import DocumentViewPanel from '../../components/DocumentViewPanel/DocumentViewPanel'
import FileViewerPanel from '../../components/FileViewerPanel/FileViewerPanel'
import { mockExtractData, type ExtractedData } from '../../utils/mockDataExtractor'
import './DataExtraction.css'

interface UploadedFile {
  id: string
  file: File
  sectionId: string
}

interface DocumentData {
  id: string
  name: string
  file: File
  extractedData: ExtractedData | null
  approved: boolean
  isExtracting: boolean
}

/**
 * DataExtraction Page
 * 
 * Main screen for reviewing and approving extracted document data.
 * Features:
 * - Horizontal tabs for each uploaded document
 * - Split view: extracted data (left) and file preview (right)
 * - Document approval workflow
 * - Mock data extraction simulation
 */
export default function DataExtraction() {
  const location = useLocation()
  const navigate = useNavigate()
  
  // Get files passed from NewBoard via navigation state
  const uploadedFiles = (location.state?.files || []) as UploadedFile[]
  
  // State management
  const [documents, setDocuments] = useState<DocumentData[]>([])
  const [activeDocumentId, setActiveDocumentId] = useState<string>('')
  const [documentType, setDocumentType] = useState('invoice')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  /**
   * Initialize documents and trigger data extraction on mount
   */
  useEffect(() => {
    if (uploadedFiles.length === 0) {
      // Redirect back if no files provided
      navigate('/new-board')
      return
    }

    // Initialize documents from uploaded files
    const initialDocs: DocumentData[] = uploadedFiles.map(fileData => ({
      id: fileData.id,
      name: fileData.file.name,
      file: fileData.file,
      extractedData: null,
      approved: false,
      isExtracting: true
    }))

    setDocuments(initialDocs)
    setActiveDocumentId(initialDocs[0]?.id || '')

    // Start extraction process for all documents
    extractAllDocuments(initialDocs)
  }, [])

  /**
   * Extracts data from all documents using mock extractor
   */
  const extractAllDocuments = async (docs: DocumentData[]) => {
    for (const doc of docs) {
      try {
        // Simulate extraction process
        const extractedData = await mockExtractData(doc.file)
        
        // Update document with extracted data
        setDocuments(prev =>
          prev.map(d =>
            d.id === doc.id
              ? { ...d, extractedData, isExtracting: false }
              : d
          )
        )
      } catch (error) {
        console.error(`Failed to extract data from ${doc.name}:`, error)
        
        // Mark extraction as failed
        setDocuments(prev =>
          prev.map(d =>
            d.id === doc.id
              ? { ...d, isExtracting: false, extractedData: {} }
              : d
          )
        )
      }
    }
  }

  /**
   * Handles tab switching between documents
   */
  const handleTabChange = (tabId: string) => {
    setActiveDocumentId(tabId)
  }

  /**
   * Handles closing a document tab
   */
  const handleTabClose = (tabId: string) => {
    const newDocs = documents.filter(d => d.id !== tabId)
    setDocuments(newDocs)

    // Switch to another tab if active tab was closed
    if (activeDocumentId === tabId && newDocs.length > 0) {
      setActiveDocumentId(newDocs[0].id)
    }

    // Redirect if all tabs closed
    if (newDocs.length === 0) {
      navigate('/new-board')
    }
  }

  /**
   * Approves the currently active document
   */
  const handleApprove = () => {
    setDocuments(prev =>
      prev.map(d =>
        d.id === activeDocumentId
          ? { ...d, approved: true }
          : d
      )
    )
  }

  /**
   * Approves all documents at once
   */
  const handleApproveAll = () => {
    setDocuments(prev =>
      prev.map(d => ({ ...d, approved: true }))
    )
  }

  /**
   * Handles adding new RDE (Reconciliation Data Element)
   */
  const handleAddRDE = () => {
    console.log('Add new RDE clicked')
    // TODO: Implement RDE addition logic
  }

  // Get active document data
  const activeDocument = documents.find(d => d.id === activeDocumentId)

  // Prepare tabs for DocumentTabs component
  const tabs: DocumentTab[] = documents.map(doc => ({
    id: doc.id,
    name: doc.name,
    approved: doc.approved
  }))

  // Show loading state if no documents
  if (documents.length === 0) {
    return (
      <div className="data-extraction-loading">
        <div className="spinner"></div>
        <p>Loading documents...</p>
      </div>
    )
  }

  return (
    <div className="data-extraction">
      {/* ========== Header Section ========== */}
      <div className="data-extraction__header">
        {/* Tabs Row */}
        <DocumentTabs
          tabs={tabs}
          activeTabId={activeDocumentId}
          onTabChange={handleTabChange}
          onTabClose={handleTabClose}
        />
        
        {/* Title Bar Row */}
        <div className="data-extraction__title-bar">
          {/* Document Title */}
          <h1 className="data-extraction__title">
            {activeDocument?.name || 'Document'}
          </h1>
          
          {/* Document Type Selector */}
          <div className="data-extraction__type-selector">
            <label>Document type:</label>
            <select 
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
            >
              <option value="invoice">Select</option>
              <option value="invoice">Invoice</option>
              <option value="shipping">Shipping Document</option>
              <option value="contract">Contract</option>
              <option value="receipt">Receipt</option>
            </select>
          </div>

          {/* Right-side Controls */}
          <div className="data-extraction__controls">
            {/* Search Icon */}
            <button className="data-extraction__icon-btn" title="Search">
              <FiSearch />
            </button>

            {/* View Toggle Group */}
            <div className="data-extraction__view-toggle">
              <button 
                className={viewMode === 'grid' ? 'active' : ''}
                onClick={() => setViewMode('grid')}
                title="Grid view"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2"/>
                  <rect x="3" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2"/>
                  <rect x="14" y="3" width="7" height="7" stroke="currentColor" strokeWidth="2"/>
                  <rect x="14" y="14" width="7" height="7" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </button>
              <button 
                className={viewMode === 'list' ? 'active' : ''}
                onClick={() => setViewMode('list')}
                title="List view"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="5" width="18" height="2" fill="currentColor"/>
                  <rect x="3" y="11" width="18" height="2" fill="currentColor"/>
                  <rect x="3" y="17" width="18" height="2" fill="currentColor"/>
                </svg>
              </button>
            </div>

            {/* Approve Button */}
            <div className="data-extraction__actions">
              <button 
                className="data-extraction__btn data-extraction__btn--primary"
                onClick={handleApprove}
                disabled={activeDocument?.approved}
              >
                <FiCheck />
                {activeDocument?.approved ? 'Approved' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========== Main Content - Split View ========== */}
      <div className="data-extraction__content">
        {/* Left Panel - Extracted Data */}
        <div className="data-extraction__left-panel">
          {activeDocument?.isExtracting ? (
            <div className="data-extraction__extracting">
              <div className="spinner"></div>
              <p>Extracting data...</p>
            </div>
          ) : activeDocument?.extractedData ? (
            <DocumentViewPanel
              data={activeDocument.extractedData}
              tableCount={5}
              onAddRDE={handleAddRDE}
            />
          ) : (
            <div className="data-extraction__no-data">
              <p>No data extracted</p>
            </div>
          )}
        </div>

        {/* Right Panel - File Preview */}
        <div className="data-extraction__right-panel">
          {activeDocument && (
            <FileViewerPanel
              file={activeDocument.file}
              fileName={activeDocument.name}
            />
          )}
        </div>
      </div>

      {/* ========== Footer Navigation ========== */}
      <div className="data-extraction__footer">
        <button
          className="data-extraction__footer-btn"
          onClick={() => navigate('/new-board')}
        >
          Back to Upload
        </button>
        <button
          className="data-extraction__footer-btn data-extraction__footer-btn--primary"
          onClick={() => console.log('Proceed to document mapping')}
          disabled={!documents.every(d => d.approved)}
        >
          Update or create document mapping
        </button>
      </div>
    </div>
  )
}