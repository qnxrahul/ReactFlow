import { useState } from 'react'
import { FiSearch, FiPlus, FiTrash2 } from 'react-icons/fi'
import type { ExtractedData } from '../../utils/mockDataExtractor'
import './DocumentViewPanel.css'

interface DocumentViewPanelProps {
  data: ExtractedData
  tableCount?: number
  onAddRDE?: () => void
}

/**
 * DocumentViewPanel Component
 * 
 * Displays extracted document data in a searchable key-value format.
 * Features:
 * - Search functionality with voice input
 * - Table count dropdown
 * - Drag handles for reordering
 * - Add buttons for each row
 * - Input row for new entries
 * - Add new RDE button at bottom
 */
export default function DocumentViewPanel({
  data,
  tableCount = 5,
  onAddRDE
}: DocumentViewPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [newEntryName, setNewEntryName] = useState('')
  const [newEntryValue, setNewEntryValue] = useState('Click here to activate highlight tool...')

  /**
   * Filters data entries based on search query
   */
  const filteredData = Object.entries(data).filter(([key, value]) => {
    const query = searchQuery.toLowerCase()
    return (
      key.toLowerCase().includes(query) ||
      String(value).toLowerCase().includes(query)
    )
  })

  /**
   * Handles adding a new RDE entry
   */
  const handleAddNewEntry = () => {
    if (newEntryName.trim()) {
      console.log('Adding new entry:', newEntryName, newEntryValue)
      // TODO: Implement actual add logic
      setNewEntryName('')
      setNewEntryValue('Click here to activate highlight tool...')
    }
  }

  /**
   * Handles deleting the input row
   */
  const handleDeleteInputRow = () => {
    setNewEntryName('')
    setNewEntryValue('Click here to activate highlight tool...')
  }

  return (
    <div className="document-view-panel">
      {/* ========== Header Section ========== */}
      <div className="document-view-panel__header">
        {/* Title */}
        <h3 className="document-view-panel__title">Document view</h3>

        {/* Search and Controls */}
        <div className="document-view-panel__controls">
          {/* Search Input */}
          <div className="document-view-panel__search">
            <FiSearch className="document-view-panel__search-icon" />
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="document-view-panel__search-input"
            />
            <svg
              className="document-view-panel__mic-icon"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M12 15C13.66 15 15 13.66 15 12V6C15 4.34 13.66 3 12 3C10.34 3 9 4.34 9 6V12C9 13.66 10.34 15 12 15Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M19 12C19 15.866 15.866 19 12 19M12 19C8.13401 19 5 15.866 5 12M12 19V22"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Table Count Dropdown */}
          <button className="document-view-panel__tables">
            {tableCount} Tables
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 6L8 10L12 6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* ========== Data Table ========== */}
      <div className="document-view-panel__content">
        <div className="document-view-panel__table">
          {/* Table Head */}
          <div className="document-view-panel__table-head">
            <div style={{ display: 'flex', width: '100%' }}>
              <div style={{ width: '35%', padding: '17px 8px 17px 24px' }}>
                <strong>Name</strong>
              </div>
              <div style={{ width: '55%', padding: '17px 16px', flexGrow: 1 }}>
                <strong>Extracted source value</strong>
              </div>
              <div style={{ width: '10%', padding: '16px 8px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="document-view-panel__add-btn"
                  title="Add column"
                  style={{ opacity: 1 }}
                >
                  <FiPlus />
                </button>
              </div>
            </div>
          </div>

          {/* Table Body */}
          <div className="document-view-panel__table-body">
            {filteredData.length > 0 ? (
              filteredData.map(([key, value], index) => (
                <div key={`${key}-${index}`}>
                  <div className="document-view-panel__key">
                    <div className="document-view-panel__drag-handle">⋮⋮</div>
                    {key}
                  </div>
                  <div className="document-view-panel__value">{String(value)}</div>
                  <div className="document-view-panel__actions">
                    <button
                      className="document-view-panel__add-btn"
                      title="Add to mapping"
                    >
                      <FiPlus />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              searchQuery && (
                <div className="document-view-panel__empty">
                  No matching data found
                </div>
              )
            )}

            {/* Input Row - "Enter name..." */}
            <div className="document-view-panel__input-row">
              <div className="document-view-panel__input-row-key">
                <input
                  type="text"
                  placeholder="Enter name..."
                  value={newEntryName}
                  onChange={(e) => setNewEntryName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddNewEntry()
                    }
                  }}
                />
              </div>
              <div className="document-view-panel__input-row-value">
                {newEntryValue}
              </div>
              <div className="document-view-panel__input-row-actions">
                <button
                  className="document-view-panel__delete-btn"
                  onClick={handleDeleteInputRow}
                  title="Delete row"
                >
                  <FiTrash2 />
                </button>
              </div>
            </div>
            {/* ========== Footer Actions ========== */}
            <div className="document-view-panel__footer">
              <button
                className="document-view-panel__add-rde"
                onClick={onAddRDE}
              >
                <FiPlus />
                Add new RDE
              </button>
            </div>
          </div>
        </div>
      </div>


    </div>
  )
}