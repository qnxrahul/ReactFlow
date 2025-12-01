import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import NewBoard from './NewBoard'

// Mock the boardConfig
vi.mock('../../config/boardConfig.json', () => ({
  default: {
    steps: [
      { id: 'step-1', label: 'Upload items to be test', completed: false },
      { id: 'step-2', label: 'Review data extraction', completed: false },
    ],
    sections: [
      { id: 'items-test', title: 'Items to be tested', fileCount: 0, hasUpload: true },
      { id: 'sample-documentation', title: 'Sample Documentation', fileCount: 0, hasUpload: true },
    ],
  },
}))

// Mock FileUpload component
vi.mock('../../components/FileUpload/FileUpload', () => ({
  default: ({ onFilesChange, sectionId }: any) => (
    <div data-testid={`file-upload-${sectionId}`}>
      <button onClick={() => onFilesChange([new File(['test'], 'test.pdf')])}>
        Mock Upload
      </button>
    </div>
  ),
}))

describe('NewBoard', () => {
  // Helper function to render with router
  const renderWithRouter = () => {
    return render(
      <MemoryRouter>
        <NewBoard />
      </MemoryRouter>
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders to-do list header', () => {
    renderWithRouter()
    expect(screen.getByText('To Do List')).toBeInTheDocument()
  })

  it('displays correct number of cards', () => {
    renderWithRouter()
    expect(screen.getByText('2 cards')).toBeInTheDocument()
  })

  it('renders all checklist items', () => {
    renderWithRouter()
    expect(screen.getByText('Upload items to be test')).toBeInTheDocument()
    expect(screen.getByText('Review data extraction')).toBeInTheDocument()
  })

  it('toggles checkbox on click', () => {
    renderWithRouter()
    const checkboxes = screen.getAllByRole('checkbox')
    const firstCheckbox = checkboxes[0] as HTMLInputElement
    
    expect(firstCheckbox.checked).toBe(false)
    fireEvent.click(firstCheckbox)
    expect(firstCheckbox.checked).toBe(true)
  })

  it('renders all sections', () => {
    renderWithRouter()
    expect(screen.getByText('Items to be tested')).toBeInTheDocument()
    expect(screen.getByText('Sample Documentation')).toBeInTheDocument()
  })

  it('shows initial file count as 0', () => {
    renderWithRouter()
    const fileCountElements = screen.getAllByText(/0 files/i)
    expect(fileCountElements.length).toBeGreaterThan(0)
  })

  it('updates file count when files uploaded', () => {
    renderWithRouter()
    const uploadButton = screen.getAllByText('Mock Upload')[0]
    
    fireEvent.click(uploadButton)
    
    expect(screen.getByText('1 files')).toBeInTheDocument()
  })

  it('renders update button', () => {
    renderWithRouter()
    expect(screen.getByText('Update')).toBeInTheDocument()
  })

  it('renders action bar', () => {
    renderWithRouter()
    expect(screen.getByText('[Action bar]')).toBeInTheDocument()
  })

  it('renders add buttons for each section', () => {
    renderWithRouter()
    const addButtons = screen.getAllByRole('button', { name: /Actions for/i })
    expect(addButtons.length).toBe(2)
  })
})