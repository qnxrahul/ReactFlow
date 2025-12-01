import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import DocumentViewPanel from './DocumentViewPanel'
import type { ExtractedData } from '../../utils/mockDataExtractor'

describe('DocumentViewPanel', () => {
  // Mock extracted data for testing
  const mockExtractedData: ExtractedData = {
    'Invoice Number': 'INV-2024-001',
    'Date': '2024-01-15',
    'Vendor Name': 'Acme Corporation',
    'Total Amount': '$1,234.56',
    'Tax': '$123.45',
    'Subtotal': '$1,111.11',
    'Payment Terms': 'Net 30',
  }

  // Mock callback function
  let mockOnAddRDE: () => void

  beforeEach(() => {
    // Reset mocks before each test
    mockOnAddRDE = vi.fn()
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders component title', () => {
      render(<DocumentViewPanel data={mockExtractedData} onAddRDE={mockOnAddRDE} />)
      
      expect(screen.getByText('Document view')).toBeInTheDocument()
    })

    it('renders search input with placeholder', () => {
      render(<DocumentViewPanel data={mockExtractedData} onAddRDE={mockOnAddRDE} />)
      
      const searchInput = screen.getByPlaceholderText('Search')
      expect(searchInput).toBeInTheDocument()
    })

    it('renders table count dropdown with correct value', () => {
      render(
        <DocumentViewPanel 
          data={mockExtractedData} 
          tableCount={7}
          onAddRDE={mockOnAddRDE} 
        />
      )
      
      expect(screen.getByText('7 Tables')).toBeInTheDocument()
    })

    it('uses default table count of 5 when not provided', () => {
      render(<DocumentViewPanel data={mockExtractedData} onAddRDE={mockOnAddRDE} />)
      
      expect(screen.getByText('5 Tables')).toBeInTheDocument()
    })

    it('renders table headers correctly', () => {
      render(<DocumentViewPanel data={mockExtractedData} onAddRDE={mockOnAddRDE} />)
      
      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByText('Extracted source value')).toBeInTheDocument()
    })

    it('renders all extracted data entries', () => {
      render(<DocumentViewPanel data={mockExtractedData} onAddRDE={mockOnAddRDE} />)
      
      // Check all keys are rendered
      expect(screen.getByText('Invoice Number')).toBeInTheDocument()
      expect(screen.getByText('Date')).toBeInTheDocument()
      expect(screen.getByText('Vendor Name')).toBeInTheDocument()
      expect(screen.getByText('Total Amount')).toBeInTheDocument()
      
      // Check all values are rendered
      expect(screen.getByText('INV-2024-001')).toBeInTheDocument()
      expect(screen.getByText('2024-01-15')).toBeInTheDocument()
      expect(screen.getByText('Acme Corporation')).toBeInTheDocument()
      expect(screen.getByText('$1,234.56')).toBeInTheDocument()
    })

    it('renders drag handles for each data row', () => {
      const { container } = render(
        <DocumentViewPanel data={mockExtractedData} onAddRDE={mockOnAddRDE} />
      )
      
      // Find all drag handle elements
      const dragHandles = container.querySelectorAll('.document-view-panel__drag-handle')
      
      // Should have one drag handle per data entry
      expect(dragHandles.length).toBe(Object.keys(mockExtractedData).length)
    })

    it('renders add buttons for each data row', () => {
      render(<DocumentViewPanel data={mockExtractedData} onAddRDE={mockOnAddRDE} />)
      
      // Find all "Add to mapping" buttons
      const addButtons = screen.getAllByTitle('Add to mapping')
      
      // Should have one button per data entry
      expect(addButtons.length).toBe(Object.keys(mockExtractedData).length)
    })

    it('renders input row for new entries', () => {
      render(<DocumentViewPanel data={mockExtractedData} onAddRDE={mockOnAddRDE} />)
      
      const inputField = screen.getByPlaceholderText('Enter name...')
      expect(inputField).toBeInTheDocument()
      
      const highlightText = screen.getByText('Click here to activate highlight tool...')
      expect(highlightText).toBeInTheDocument()
    })

    it('renders delete button in input row', () => {
      render(<DocumentViewPanel data={mockExtractedData} onAddRDE={mockOnAddRDE} />)
      
      const deleteButton = screen.getByTitle('Delete row')
      expect(deleteButton).toBeInTheDocument()
    })

    it('renders "Add new RDE" button', () => {
      render(<DocumentViewPanel data={mockExtractedData} onAddRDE={mockOnAddRDE} />)
      
      const addRDEButton = screen.getByText('Add new RDE')
      expect(addRDEButton).toBeInTheDocument()
    })

    it('renders microphone icon in search bar', () => {
      const { container } = render(
        <DocumentViewPanel data={mockExtractedData} onAddRDE={mockOnAddRDE} />
      )
      
      const micIcon = container.querySelector('.document-view-panel__mic-icon')
      expect(micIcon).toBeInTheDocument()
    })
  })

  describe('Search Functionality', () => {
    it('filters data entries by key when searching', () => {
      render(<DocumentViewPanel data={mockExtractedData} onAddRDE={mockOnAddRDE} />)
      
      const searchInput = screen.getByPlaceholderText('Search')
      
      // Search for "Invoice"
      fireEvent.change(searchInput, { target: { value: 'Invoice' } })
      
      // "Invoice Number" should be visible
      expect(screen.getByText('Invoice Number')).toBeInTheDocument()
      
      // Other entries should not be visible
      expect(screen.queryByText('Vendor Name')).not.toBeInTheDocument()
      expect(screen.queryByText('Payment Terms')).not.toBeInTheDocument()
    })

    it('filters data entries by value when searching', () => {
      render(<DocumentViewPanel data={mockExtractedData} onAddRDE={mockOnAddRDE} />)
      
      const searchInput = screen.getByPlaceholderText('Search')
      
      // Search for part of the vendor name
      fireEvent.change(searchInput, { target: { value: 'Acme' } })
      
      // Entry with "Acme Corporation" should be visible
      expect(screen.getByText('Vendor Name')).toBeInTheDocument()
      expect(screen.getByText('Acme Corporation')).toBeInTheDocument()
      
      // Other entries should not be visible
      expect(screen.queryByText('Invoice Number')).not.toBeInTheDocument()
    })

    it('is case-insensitive when searching', () => {
      render(<DocumentViewPanel data={mockExtractedData} onAddRDE={mockOnAddRDE} />)
      
      const searchInput = screen.getByPlaceholderText('Search')
      
      // Search with lowercase
      fireEvent.change(searchInput, { target: { value: 'invoice' } })
      
      // Should still find "Invoice Number"
      expect(screen.getByText('Invoice Number')).toBeInTheDocument()
    })

    it('shows "No matching data found" when search has no results', () => {
      render(<DocumentViewPanel data={mockExtractedData} onAddRDE={mockOnAddRDE} />)
      
      const searchInput = screen.getByPlaceholderText('Search')
      
      // Search for something that doesn't exist
      fireEvent.change(searchInput, { target: { value: 'xyz123notfound' } })
      
      expect(screen.getByText('No matching data found')).toBeInTheDocument()
    })

    it('shows all entries when search is cleared', () => {
      render(<DocumentViewPanel data={mockExtractedData} onAddRDE={mockOnAddRDE} />)
      
      const searchInput = screen.getByPlaceholderText('Search') as HTMLInputElement
      
      // First search for something
      fireEvent.change(searchInput, { target: { value: 'Invoice' } })
      expect(screen.queryByText('Vendor Name')).not.toBeInTheDocument()
      
      // Clear the search
      fireEvent.change(searchInput, { target: { value: '' } })
      
      // All entries should be visible again
      expect(screen.getByText('Invoice Number')).toBeInTheDocument()
      expect(screen.getByText('Vendor Name')).toBeInTheDocument()
      expect(screen.getByText('Payment Terms')).toBeInTheDocument()
    })

    it('updates search results as user types', () => {
      render(<DocumentViewPanel data={mockExtractedData} onAddRDE={mockOnAddRDE} />)
      
      const searchInput = screen.getByPlaceholderText('Search')
      
      // Type "D" - should show "Date"
      fireEvent.change(searchInput, { target: { value: 'D' } })
      expect(screen.getByText('Date')).toBeInTheDocument()
      
      // Type "Da" - should still show "Date"
      fireEvent.change(searchInput, { target: { value: 'Da' } })
      expect(screen.getByText('Date')).toBeInTheDocument()
      
      // Type "Dat" - should still show "Date"
      fireEvent.change(searchInput, { target: { value: 'Dat' } })
      expect(screen.getByText('Date')).toBeInTheDocument()
    })
  })

  describe('Input Row Functionality', () => {
    it('allows typing in the name input field', () => {
      render(<DocumentViewPanel data={mockExtractedData} onAddRDE={mockOnAddRDE} />)
      
      const inputField = screen.getByPlaceholderText('Enter name...') as HTMLInputElement
      
      fireEvent.change(inputField, { target: { value: 'New Field' } })
      
      expect(inputField.value).toBe('New Field')
    })

    it('clears input field when delete button is clicked', () => {
      render(<DocumentViewPanel data={mockExtractedData} onAddRDE={mockOnAddRDE} />)
      
      const inputField = screen.getByPlaceholderText('Enter name...') as HTMLInputElement
      const deleteButton = screen.getByTitle('Delete row')
      
      // Type something first
      fireEvent.change(inputField, { target: { value: 'Test Field' } })
      expect(inputField.value).toBe('Test Field')
      
      // Click delete button
      fireEvent.click(deleteButton)
      
      // Input should be cleared
      expect(inputField.value).toBe('')
    })

    it('resets value text when delete button is clicked', () => {
      render(<DocumentViewPanel data={mockExtractedData} onAddRDE={mockOnAddRDE} />)
      
      const deleteButton = screen.getByTitle('Delete row')
      
      // Click delete button
      fireEvent.click(deleteButton)
      
      // Value text should be reset to default
      expect(screen.getByText('Click here to activate highlight tool...')).toBeInTheDocument()
    })

    it('logs new entry when Enter key is pressed with non-empty name', () => {
      const consoleSpy = vi.spyOn(console, 'log')
      
      render(<DocumentViewPanel data={mockExtractedData} onAddRDE={mockOnAddRDE} />)
      
      const inputField = screen.getByPlaceholderText('Enter name...')
      
      // Type a name
      fireEvent.change(inputField, { target: { value: 'Custom Field' } })
      
      // Press Enter
      fireEvent.keyPress(inputField, { key: 'Enter', code: 'Enter', charCode: 13 })
      
      // Should log the new entry
      expect(consoleSpy).toHaveBeenCalledWith(
        'Adding new entry:',
        'Custom Field',
        'Click here to activate highlight tool...'
      )
      
      consoleSpy.mockRestore()
    })

    it('does not log entry when Enter is pressed with empty name', () => {
      const consoleSpy = vi.spyOn(console, 'log')
      
      render(<DocumentViewPanel data={mockExtractedData} onAddRDE={mockOnAddRDE} />)
      
      const inputField = screen.getByPlaceholderText('Enter name...')
      
      // Press Enter without typing anything
      fireEvent.keyPress(inputField, { key: 'Enter', code: 'Enter', charCode: 13 })
      
      // Should not log anything
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Adding new entry')
      )
      
      consoleSpy.mockRestore()
    })

    it('does not log entry when Enter is pressed with whitespace-only name', () => {
      const consoleSpy = vi.spyOn(console, 'log')
      
      render(<DocumentViewPanel data={mockExtractedData} onAddRDE={mockOnAddRDE} />)
      
      const inputField = screen.getByPlaceholderText('Enter name...')
      
      // Type only whitespace
      fireEvent.change(inputField, { target: { value: '   ' } })
      fireEvent.keyPress(inputField, { key: 'Enter', code: 'Enter', charCode: 13 })
      
      // Should not log anything
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Adding new entry')
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('Add RDE Functionality', () => {
    it('calls onAddRDE when "Add new RDE" button is clicked', () => {
      render(<DocumentViewPanel data={mockExtractedData} onAddRDE={mockOnAddRDE} />)
      
      const addRDEButton = screen.getByText('Add new RDE')
      fireEvent.click(addRDEButton)
      
      expect(mockOnAddRDE).toHaveBeenCalledTimes(1)
    })

    it('does not crash when onAddRDE is not provided', () => {
      render(<DocumentViewPanel data={mockExtractedData} />)
      
      const addRDEButton = screen.getByText('Add new RDE')
      
      // Should not throw error
      expect(() => fireEvent.click(addRDEButton)).not.toThrow()
    })
  })

  describe('Edge Cases', () => {
    it('renders with empty data object', () => {
      render(<DocumentViewPanel data={{}} onAddRDE={mockOnAddRDE} />)
      
      // Should still render headers and input row
      expect(screen.getByText('Document view')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter name...')).toBeInTheDocument()
    })

    it('handles data with numeric values', () => {
      const numericData: ExtractedData = {
        'Quantity': 100,
        'Price': 29.99,
        'Discount': 0,
      }
      
      render(<DocumentViewPanel data={numericData} onAddRDE={mockOnAddRDE} />)
      
      expect(screen.getByText('100')).toBeInTheDocument()
      expect(screen.getByText('29.99')).toBeInTheDocument()
      expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('handles data with boolean values', () => {
      const booleanData: Record<string, string | number> = {
        'Is Active': 'true',
        'Is Deleted': 'false',
      }
      
      render(<DocumentViewPanel data={booleanData} onAddRDE={mockOnAddRDE} />)
      
      expect(screen.getByText('true')).toBeInTheDocument()
      expect(screen.getByText('false')).toBeInTheDocument()
    })

    it('handles data with null values', () => {
      const nullData: Record<string, string | number> = {
        'Optional Field': 'null',
      }
      
      render(<DocumentViewPanel data={nullData} onAddRDE={mockOnAddRDE} />)
      
      expect(screen.getByText('null')).toBeInTheDocument()
    })

    it('handles data with very long strings', () => {
      const longStringData: ExtractedData = {
        'Description': 'This is a very long description that might cause layout issues if not handled properly in the component UI rendering system',
      }
      
      render(<DocumentViewPanel data={longStringData} onAddRDE={mockOnAddRDE} />)
      
      expect(screen.getByText(/This is a very long description/)).toBeInTheDocument()
    })

    it('handles data with special characters', () => {
      const specialCharData: ExtractedData = {
        'Email': 'test@example.com',
        'Formula': 'A + B = C',
        'Path': '/home/user/documents',
      }
      
      render(<DocumentViewPanel data={specialCharData} onAddRDE={mockOnAddRDE} />)
      
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
      expect(screen.getByText('A + B = C')).toBeInTheDocument()
      expect(screen.getByText('/home/user/documents')).toBeInTheDocument()
    })

    it('handles data with duplicate values', () => {
      const duplicateData: ExtractedData = {
        'Field 1': 'Same Value',
        'Field 2': 'Same Value',
        'Field 3': 'Same Value',
      }
      
      render(<DocumentViewPanel data={duplicateData} onAddRDE={mockOnAddRDE} />)
      
      // All three "Same Value" entries should render
      const sameValueElements = screen.getAllByText('Same Value')
      expect(sameValueElements.length).toBe(3)
    })
  })

  describe('Table Count Display', () => {
    it('accepts table count of 0', () => {
      render(
        <DocumentViewPanel 
          data={mockExtractedData} 
          tableCount={0}
          onAddRDE={mockOnAddRDE} 
        />
      )
      
      expect(screen.getByText('0 Tables')).toBeInTheDocument()
    })

    it('accepts large table count', () => {
      render(
        <DocumentViewPanel 
          data={mockExtractedData} 
          tableCount={999}
          onAddRDE={mockOnAddRDE} 
        />
      )
      
      expect(screen.getByText('999 Tables')).toBeInTheDocument()
    })
  })

  describe('Search with Special Cases', () => {
    it('matches partial words in search', () => {
      render(<DocumentViewPanel data={mockExtractedData} onAddRDE={mockOnAddRDE} />)
      
      const searchInput = screen.getByPlaceholderText('Search')
      
      // Search for "Ven" which is part of "Vendor"
      fireEvent.change(searchInput, { target: { value: 'Ven' } })
      
      expect(screen.getByText('Vendor Name')).toBeInTheDocument()
    })

    it('handles search with special characters', () => {
      const specialData: ExtractedData = {
        'Cost ($)': '$100.00',
      }
      
      render(<DocumentViewPanel data={specialData} onAddRDE={mockOnAddRDE} />)
      
      const searchInput = screen.getByPlaceholderText('Search')
      
      // Search for "$"
      fireEvent.change(searchInput, { target: { value: '$' } })
      
      expect(screen.getByText('Cost ($)')).toBeInTheDocument()
    })
  })
})