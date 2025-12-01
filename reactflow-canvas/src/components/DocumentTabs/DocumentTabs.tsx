import { FiX, FiCheck } from 'react-icons/fi'
import './DocumentTabs.css'

export interface DocumentTab {
  id: string
  name: string
  approved: boolean
}

interface DocumentTabsProps {
  tabs: DocumentTab[]
  activeTabId: string
  onTabChange: (tabId: string) => void
  onTabClose?: (tabId: string) => void
}

/**
 * DocumentTabs Component
 * 
 * Horizontal tab navigation for switching between uploaded documents.
 * Features:
 * - Active tab highlighting
 * - Approval checkmarks
 * - Close buttons (optional)
 * - Responsive horizontal scrolling
 */
export default function DocumentTabs({
  tabs,
  activeTabId,
  onTabChange,
  onTabClose
}: DocumentTabsProps) {
  
  /**
   * Handles tab close with event propagation stop
   */
  const handleClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation() // Prevent triggering tab change
    onTabClose?.(tabId)
  }

  return (
    <div className="document-tabs">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        
        return (
          <div
            key={tab.id}
            className={`document-tabs__tab ${isActive ? 'document-tabs__tab--active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <div className="document-tabs__tab-header">
              <div className="document-tabs__title-container">
                {/* Tab Label */}
                <span className="document-tabs__label">{tab.name}</span>
                
                {/* Approval Checkmark */}
                {tab.approved && (
                  <div className="document-tabs__check-wrapper">
                    <FiCheck 
                      className="document-tabs__check" 
                      aria-label="Approved"
                    />
                  </div>
                )}
              </div>
              
              {/* Close Button */}
              {onTabClose && (
                <button
                  className="document-tabs__close"
                  onClick={(e) => handleClose(e, tab.id)}
                  aria-label={`Close ${tab.name}`}
                  title="Close tab"
                >
                  <FiX />
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}