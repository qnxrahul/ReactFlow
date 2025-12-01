import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import FileUpload from './FileUpload'

describe('FileUpload', () => {
  it('renders empty state', () => {
    render(<FileUpload />)
    expect(screen.getByText('Click or drag files to upload')).toBeInTheDocument()
  })

  it('calls onFilesChange when files dropped', () => {
    const mockOnFilesChange = vi.fn()
    render(<FileUpload onFilesChange={mockOnFilesChange} />)
    
    const dropzone = screen.getByText('Click or drag files to upload').closest('div')
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    
    fireEvent.drop(dropzone!, {
      dataTransfer: { files: [file] },
    })
    
    expect(mockOnFilesChange).toHaveBeenCalledTimes(1)
    expect(mockOnFilesChange.mock.calls[0][0]).toHaveLength(1)
  })

  it('shows drag indicator on dragover', () => {
    render(<FileUpload />)
    const dropzone = screen.getByText('Click or drag files to upload').closest('div')
    
    fireEvent.dragOver(dropzone!)
    
    expect(screen.getByText('Drop files here')).toBeInTheDocument()
  })

  it('hides drag indicator on dragleave', () => {
    render(<FileUpload />)
    const dropzone = screen.getByText('Click or drag files to upload').closest('div')
    
    fireEvent.dragOver(dropzone!)
    fireEvent.dragLeave(dropzone!)
    
    expect(screen.queryByText('Drop files here')).not.toBeInTheDocument()
  })

  it('displays uploaded file', async () => {
    render(<FileUpload />)
    const dropzone = screen.getByText('Click or drag files to upload').closest('div')
    const file = new File(['content'], 'document.pdf', { type: 'application/pdf' })
    
    fireEvent.drop(dropzone!, {
      dataTransfer: { files: [file] },
    })
    
    await waitFor(() => {
      expect(screen.getByText('document.pdf')).toBeInTheDocument()
    })
  })

  it('removes file when close button clicked', async () => {
    const mockOnFilesChange = vi.fn()
    render(<FileUpload onFilesChange={mockOnFilesChange} />)
    
    const dropzone = screen.getByText('Click or drag files to upload').closest('div')
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' })
    
    fireEvent.drop(dropzone!, {
      dataTransfer: { files: [file] },
    })
    
    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument()
    })
    
    const closeButton = screen.getByTitle('Remove file')
    fireEvent.click(closeButton)
    
    await waitFor(() => {
      expect(screen.queryByText('test.pdf')).not.toBeInTheDocument()
    })
    
    // Should call with empty array
    expect(mockOnFilesChange).toHaveBeenLastCalledWith([])
  })

  it('respects maxFiles limit', () => {
    const mockOnFilesChange = vi.fn()
    render(<FileUpload onFilesChange={mockOnFilesChange} maxFiles={2} />)
    
    const dropzone = screen.getByText('Click or drag files to upload').closest('div')
    const files = [
      new File(['1'], 'file1.pdf'),
      new File(['2'], 'file2.pdf'),
      new File(['3'], 'file3.pdf'),
    ]
    
    fireEvent.drop(dropzone!, {
      dataTransfer: { files },
    })
    
    expect(mockOnFilesChange).toHaveBeenCalledTimes(1)
    expect(mockOnFilesChange.mock.calls[0][0]).toHaveLength(2)
  })

  it('handles Excel files', async () => {
    render(<FileUpload />)
    const dropzone = screen.getByText('Click or drag files to upload').closest('div')
    const file = new File(['content'], 'data.xlsx', { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    
    fireEvent.drop(dropzone!, {
      dataTransfer: { files: [file] },
    })
    
    await waitFor(() => {
      expect(screen.getByText('data.xlsx')).toBeInTheDocument()
    })
  })

  it('handles PDF files', async () => {
    render(<FileUpload />)
    const dropzone = screen.getByText('Click or drag files to upload').closest('div')
    const file = new File(['content'], 'doc.pdf', { type: 'application/pdf' })
    
    fireEvent.drop(dropzone!, {
      dataTransfer: { files: [file] },
    })
    
    await waitFor(() => {
      expect(screen.getByText('doc.pdf')).toBeInTheDocument()
    })
  })

  it('handles Word files', async () => {
    render(<FileUpload />)
    const dropzone = screen.getByText('Click or drag files to upload').closest('div')
    const file = new File(['content'], 'report.docx', { 
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    })
    
    fireEvent.drop(dropzone!, {
      dataTransfer: { files: [file] },
    })
    
    await waitFor(() => {
      expect(screen.getByText('report.docx')).toBeInTheDocument()
    })
  })

  it('handles multiple files', async () => {
    render(<FileUpload />)
    const dropzone = screen.getByText('Click or drag files to upload').closest('div')
    const files = [
      new File(['1'], 'file1.pdf'),
      new File(['2'], 'file2.xlsx'),
    ]
    
    fireEvent.drop(dropzone!, {
      dataTransfer: { files },
    })
    
    await waitFor(() => {
      expect(screen.getByText('file1.pdf')).toBeInTheDocument()
      expect(screen.getByText('file2.xlsx')).toBeInTheDocument()
    })
  })
})