import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import DocumentTabs from './DocumentTabs'
import type { DocumentTab } from './DocumentTabs'

describe('DocumentTabs', () => {
  // Mock data for testing
  const mockTabs: DocumentTab[] = [
    { id: 'tab-1', name: 'Invoice_2024.pdf', approved: false },
    { id: 'tab-2', name: 'Receipt_Jan.pdf', approved: true },
    { id: 'tab-3', name: 'Contract_Draft.pdf', approved: false },
  ]

  // Mock callback functions
  let mockOnTabChange: (tabId: string) => void
  let mockOnTabClose: (tabId: string) => void

  beforeEach(() => {
    // Reset mocks before each test
    mockOnTabChange = vi.fn()
    mockOnTabClose = vi.fn()
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders all tabs with correct names', () => {
      render(
        <DocumentTabs
          tabs={mockTabs}
          activeTabId="tab-1"
          onTabChange={mockOnTabChange}
        />
      )

      // Verify all tab names are displayed
      expect(screen.getByText('Invoice_2024.pdf')).toBeInTheDocument()
      expect(screen.getByText('Receipt_Jan.pdf')).toBeInTheDocument()
      expect(screen.getByText('Contract_Draft.pdf')).toBeInTheDocument()
    })

    it('applies active class to the active tab', () => {
      const { container } = render(
        <DocumentTabs
          tabs={mockTabs}
          activeTabId="tab-2"
          onTabChange={mockOnTabChange}
        />
      )

      // Find all tab elements
      const tabs = container.querySelectorAll('.document-tabs__tab')
      
      // Second tab should have active class
      expect(tabs[1]).toHaveClass('document-tabs__tab--active')
      
      // Other tabs should not have active class
      expect(tabs[0]).not.toHaveClass('document-tabs__tab--active')
      expect(tabs[2]).not.toHaveClass('document-tabs__tab--active')
    })

    it('displays checkmark icon only for approved tabs', () => {
      render(
        <DocumentTabs
          tabs={mockTabs}
          activeTabId="tab-1"
          onTabChange={mockOnTabChange}
        />
      )

      // Only one tab is approved, so should have only one checkmark
      const checkmarks = screen.getAllByLabelText('Approved')
      expect(checkmarks).toHaveLength(1)
    })

    it('renders close buttons when onTabClose is provided', () => {
      render(
        <DocumentTabs
          tabs={mockTabs}
          activeTabId="tab-1"
          onTabChange={mockOnTabChange}
          onTabClose={mockOnTabClose}
        />
      )

      // Should have close button for each tab
      const closeButtons = screen.getAllByTitle('Close tab')
      expect(closeButtons).toHaveLength(mockTabs.length)
    })

    it('does not render close buttons when onTabClose is not provided', () => {
      render(
        <DocumentTabs
          tabs={mockTabs}
          activeTabId="tab-1"
          onTabChange={mockOnTabChange}
        />
      )

      // Should not have any close buttons
      const closeButtons = screen.queryAllByTitle('Close tab')
      expect(closeButtons).toHaveLength(0)
    })

    it('renders empty tabs list without crashing', () => {
      const { container } = render(
        <DocumentTabs
          tabs={[]}
          activeTabId=""
          onTabChange={mockOnTabChange}
        />
      )

      // Component should render without errors
      const tabsContainer = container.querySelector('.document-tabs')
      expect(tabsContainer).toBeInTheDocument()
      expect(tabsContainer).toBeEmptyDOMElement()
    })
  })

  describe('Tab Interaction', () => {
    it('calls onTabChange when a tab is clicked', () => {
      render(
        <DocumentTabs
          tabs={mockTabs}
          activeTabId="tab-1"
          onTabChange={mockOnTabChange}
        />
      )

      // Click on the second tab
      const secondTab = screen.getByText('Receipt_Jan.pdf')
      fireEvent.click(secondTab)

      // Verify callback was called with correct tab ID
      expect(mockOnTabChange).toHaveBeenCalledTimes(1)
      expect(mockOnTabChange).toHaveBeenCalledWith('tab-2')
    })

    it('calls onTabChange with correct ID for different tabs', () => {
      render(
        <DocumentTabs
          tabs={mockTabs}
          activeTabId="tab-1"
          onTabChange={mockOnTabChange}
        />
      )

      // Click on third tab
      const thirdTab = screen.getByText('Contract_Draft.pdf')
      fireEvent.click(thirdTab)

      expect(mockOnTabChange).toHaveBeenCalledWith('tab-3')
    })

    it('allows clicking on the already active tab', () => {
      render(
        <DocumentTabs
          tabs={mockTabs}
          activeTabId="tab-1"
          onTabChange={mockOnTabChange}
        />
      )

      // Click on the active tab
      const activeTab = screen.getByText('Invoice_2024.pdf')
      fireEvent.click(activeTab)

      // Callback should still be called
      expect(mockOnTabChange).toHaveBeenCalledWith('tab-1')
    })
  })

  describe('Close Button Interaction', () => {
    it('calls onTabClose when close button is clicked', () => {
      render(
        <DocumentTabs
          tabs={mockTabs}
          activeTabId="tab-1"
          onTabChange={mockOnTabChange}
          onTabClose={mockOnTabClose}
        />
      )

      // Click the first close button
      const closeButtons = screen.getAllByTitle('Close tab')
      fireEvent.click(closeButtons[0])

      // Verify onTabClose was called with correct ID
      expect(mockOnTabClose).toHaveBeenCalledTimes(1)
      expect(mockOnTabClose).toHaveBeenCalledWith('tab-1')
    })

    it('does not trigger onTabChange when close button is clicked', () => {
      render(
        <DocumentTabs
          tabs={mockTabs}
          activeTabId="tab-1"
          onTabChange={mockOnTabChange}
          onTabClose={mockOnTabClose}
        />
      )

      // Click the close button
      const closeButtons = screen.getAllByTitle('Close tab')
      fireEvent.click(closeButtons[0])

      // onTabChange should NOT be called due to stopPropagation
      expect(mockOnTabChange).not.toHaveBeenCalled()
      
      // Only onTabClose should be called
      expect(mockOnTabClose).toHaveBeenCalledTimes(1)
    })

    it('calls onTabClose with correct ID for different tabs', () => {
      render(
        <DocumentTabs
          tabs={mockTabs}
          activeTabId="tab-1"
          onTabChange={mockOnTabChange}
          onTabClose={mockOnTabClose}
        />
      )

      // Close the second tab
      const closeButtons = screen.getAllByTitle('Close tab')
      fireEvent.click(closeButtons[1])

      expect(mockOnTabClose).toHaveBeenCalledWith('tab-2')
    })
  })

  describe('Accessibility', () => {
    it('has proper aria-label for close buttons', () => {
      render(
        <DocumentTabs
          tabs={mockTabs}
          activeTabId="tab-1"
          onTabChange={mockOnTabChange}
          onTabClose={mockOnTabClose}
        />
      )

      // Check aria-labels are present and correct
      expect(screen.getByLabelText('Close Invoice_2024.pdf')).toBeInTheDocument()
      expect(screen.getByLabelText('Close Receipt_Jan.pdf')).toBeInTheDocument()
      expect(screen.getByLabelText('Close Contract_Draft.pdf')).toBeInTheDocument()
    })

    it('has proper aria-label for approval checkmarks', () => {
      render(
        <DocumentTabs
          tabs={mockTabs}
          activeTabId="tab-1"
          onTabChange={mockOnTabChange}
        />
      )

      // Approved tab should have accessible label
      const approvedLabel = screen.getByLabelText('Approved')
      expect(approvedLabel).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles single tab correctly', () => {
      const singleTab: DocumentTab[] = [
        { id: 'only-tab', name: 'Single.pdf', approved: false }
      ]

      render(
        <DocumentTabs
          tabs={singleTab}
          activeTabId="only-tab"
          onTabChange={mockOnTabChange}
          onTabClose={mockOnTabClose}
        />
      )

      expect(screen.getByText('Single.pdf')).toBeInTheDocument()
      
      // Should still be closable
      const closeButton = screen.getByTitle('Close tab')
      fireEvent.click(closeButton)
      expect(mockOnTabClose).toHaveBeenCalledWith('only-tab')
    })

    it('handles tabs with very long names', () => {
      const longNameTabs: DocumentTab[] = [
        { 
          id: 'long-1', 
          name: 'This_is_a_very_long_file_name_that_might_cause_layout_issues_2024_final_version_3.pdf', 
          approved: false 
        }
      ]

      render(
        <DocumentTabs
          tabs={longNameTabs}
          activeTabId="long-1"
          onTabChange={mockOnTabChange}
        />
      )

      // Should still render without breaking
      expect(screen.getByText(/This_is_a_very_long_file_name/)).toBeInTheDocument()
    })

    it('handles tabs with special characters in names', () => {
      const specialCharTabs: DocumentTab[] = [
        { id: 'special-1', name: 'Invoice #123 & Receipt (2024).pdf', approved: false }
      ]

      render(
        <DocumentTabs
          tabs={specialCharTabs}
          activeTabId="special-1"
          onTabChange={mockOnTabChange}
        />
      )

      expect(screen.getByText('Invoice #123 & Receipt (2024).pdf')).toBeInTheDocument()
    })

    it('handles activeTabId that does not match any tab', () => {
      render(
        <DocumentTabs
          tabs={mockTabs}
          activeTabId="non-existent-tab"
          onTabChange={mockOnTabChange}
        />
      )

      // Should render without errors, no tab should have active class
      const { container } = render(
        <DocumentTabs
          tabs={mockTabs}
          activeTabId="non-existent-tab"
          onTabChange={mockOnTabChange}
        />
      )

      const activeTabs = container.querySelectorAll('.document-tabs__tab--active')
      expect(activeTabs).toHaveLength(0)
    })
  })

  describe('Multiple Approved Tabs', () => {
    it('displays checkmarks for all approved tabs', () => {
      const allApprovedTabs: DocumentTab[] = [
        { id: 'tab-1', name: 'Doc1.pdf', approved: true },
        { id: 'tab-2', name: 'Doc2.pdf', approved: true },
        { id: 'tab-3', name: 'Doc3.pdf', approved: true },
      ]

      render(
        <DocumentTabs
          tabs={allApprovedTabs}
          activeTabId="tab-1"
          onTabChange={mockOnTabChange}
        />
      )

      // All tabs are approved
      const checkmarks = screen.getAllByLabelText('Approved')
      expect(checkmarks).toHaveLength(3)
    })

    it('does not display any checkmarks when no tabs are approved', () => {
      const noApprovedTabs: DocumentTab[] = [
        { id: 'tab-1', name: 'Doc1.pdf', approved: false },
        { id: 'tab-2', name: 'Doc2.pdf', approved: false },
      ]

      render(
        <DocumentTabs
          tabs={noApprovedTabs}
          activeTabId="tab-1"
          onTabChange={mockOnTabChange}
        />
      )

      // No approved tabs
      const checkmarks = screen.queryAllByLabelText('Approved')
      expect(checkmarks).toHaveLength(0)
    })
  })
})