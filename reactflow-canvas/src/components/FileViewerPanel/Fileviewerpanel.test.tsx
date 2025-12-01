import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import FileViewerPanel from './FileViewerPanel'

// Mock Syncfusion components
vi.mock('@syncfusion/ej2-react-pdfviewer', () => ({
  PdfViewerComponent: ({ documentPath }: any) => (
    <div data-testid="pdf-viewer">PDF Viewer: {documentPath}</div>
  ),
  Toolbar: vi.fn(),
  Magnification: vi.fn(),
  Navigation: vi.fn(),
  LinkAnnotation: vi.fn(),
  BookmarkView: vi.fn(),
  ThumbnailView: vi.fn(),
  Print: vi.fn(),
  TextSelection: vi.fn(),
  TextSearch: vi.fn(),
  Annotation: vi.fn(),
  Inject: ({ services }: any) => <div data-testid="pdf-inject">Inject</div>,
}))

vi.mock('@syncfusion/ej2-react-documenteditor', () => ({
  DocumentEditorContainerComponent: () => (
    <div data-testid="document-editor">Document Editor</div>
  ),
  Toolbar: vi.fn(),
}))

vi.mock('@syncfusion/ej2-react-spreadsheet', () => ({
  SpreadsheetComponent: () => (
    <div data-testid="spreadsheet">Spreadsheet Viewer</div>
  ),
}))

describe('FileViewerPanel', () => {
  // Mock file creation helper
  const createMockFile = (
    name: string,
    type: string,
    content: string = 'test content'
  ): File => {
    const blob = new Blob([content], { type })
    return new File([blob], name, { type })
  }

  // Mock URL.createObjectURL and revokeObjectURL
  const mockObjectURL = 'blob:mock-url-12345'
  let createObjectURLSpy: any
  let revokeObjectURLSpy: any

  beforeEach(() => {
    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue(mockObjectURL)
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  afterEach(() => {
    createObjectURLSpy.mockRestore()
    revokeObjectURLSpy.mockRestore()
    vi.clearAllMocks()
  })

  describe('Rendering - Basic Structure', () => {
    it('renders component with header', () => {
      const file = createMockFile('test.pdf', 'application/pdf')
      render(<FileViewerPanel file={file} fileName="test.pdf" />)

      expect(screen.getByText('File Viewer')).toBeInTheDocument()
    })

    it('renders download button in header', () => {
      const file = createMockFile('test.pdf', 'application/pdf')
      render(<FileViewerPanel file={file} fileName="test.pdf" />)

      const downloadButton = screen.getByTitle('Download file')
      expect(downloadButton).toBeInTheDocument()
    })

    it('renders file name in footer', () => {
      const file = createMockFile('invoice_2024.pdf', 'application/pdf')
      render(<FileViewerPanel file={file} fileName="invoice_2024.pdf" />)

      expect(screen.getByText('invoice_2024.pdf')).toBeInTheDocument()
    })

    it('renders file size in footer', () => {
      const file = createMockFile('test.pdf', 'application/pdf', 'x'.repeat(2048))
      render(<FileViewerPanel file={file} fileName="test.pdf" />)

      // File size should be displayed in KB
      expect(screen.getByText(/KB/)).toBeInTheDocument()
    })

    it('calculates and displays correct file size', () => {
      // Create a file with known size (1024 bytes = 1 KB)
      const file = createMockFile('test.pdf', 'application/pdf', 'x'.repeat(1024))
      render(<FileViewerPanel file={file} fileName="test.pdf" />)

      expect(screen.getByText('1.00 KB')).toBeInTheDocument()
    })
  })

  describe('File Type Detection - PDF', () => {
    it('detects PDF by MIME type', () => {
      const file = createMockFile('document.pdf', 'application/pdf')
      render(<FileViewerPanel file={file} fileName="document.pdf" />)

      expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument()
    })

    it('detects PDF by file extension when MIME type is missing', () => {
      const file = createMockFile('document.pdf', '')
      render(<FileViewerPanel file={file} fileName="document.pdf" />)

      expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument()
    })

    it('renders PDF viewer with correct document path', () => {
      const file = createMockFile('invoice.pdf', 'application/pdf')
      render(<FileViewerPanel file={file} fileName="invoice.pdf" />)

      const pdfViewer = screen.getByTestId('pdf-viewer')
      expect(pdfViewer).toHaveTextContent(`PDF Viewer: ${mockObjectURL}`)
    })
  })

  describe('File Type Detection - Word Documents', () => {
    it('detects DOCX by MIME type', () => {
      const file = createMockFile(
        'document.docx',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      )
      render(<FileViewerPanel file={file} fileName="document.docx" />)

      expect(screen.getByTestId('document-editor')).toBeInTheDocument()
    })

    it('detects DOC by MIME type', () => {
      const file = createMockFile('document.doc', 'application/msword')
      render(<FileViewerPanel file={file} fileName="document.doc" />)

      expect(screen.getByTestId('document-editor')).toBeInTheDocument()
    })

    it('detects Word file by .doc extension', () => {
      const file = createMockFile('document.doc', '')
      render(<FileViewerPanel file={file} fileName="document.doc" />)

      expect(screen.getByTestId('document-editor')).toBeInTheDocument()
    })

    it('detects Word file by .docx extension', () => {
      const file = createMockFile('document.docx', '')
      render(<FileViewerPanel file={file} fileName="document.docx" />)

      expect(screen.getByTestId('document-editor')).toBeInTheDocument()
    })
  })

  describe('File Type Detection - Excel/Spreadsheets', () => {
    it('detects XLSX by MIME type', () => {
      const file = createMockFile(
        'spreadsheet.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      )
      render(<FileViewerPanel file={file} fileName="spreadsheet.xlsx" />)

      expect(screen.getByTestId('spreadsheet')).toBeInTheDocument()
    })

    it('detects XLS by MIME type', () => {
      const file = createMockFile('spreadsheet.xls', 'application/vnd.ms-excel')
      render(<FileViewerPanel file={file} fileName="spreadsheet.xls" />)

      expect(screen.getByTestId('spreadsheet')).toBeInTheDocument()
    })

    it('detects CSV by MIME type', () => {
      const file = createMockFile('data.csv', 'text/csv')
      render(<FileViewerPanel file={file} fileName="data.csv" />)

      expect(screen.getByTestId('spreadsheet')).toBeInTheDocument()
    })

    it('detects Excel file by .xlsx extension', () => {
      const file = createMockFile('data.xlsx', '')
      render(<FileViewerPanel file={file} fileName="data.xlsx" />)

      expect(screen.getByTestId('spreadsheet')).toBeInTheDocument()
    })

    it('detects Excel file by .xls extension', () => {
      const file = createMockFile('data.xls', '')
      render(<FileViewerPanel file={file} fileName="data.xls" />)

      expect(screen.getByTestId('spreadsheet')).toBeInTheDocument()
    })

    it('detects CSV file by .csv extension', () => {
      const file = createMockFile('data.csv', '')
      render(<FileViewerPanel file={file} fileName="data.csv" />)

      expect(screen.getByTestId('spreadsheet')).toBeInTheDocument()
    })
  })

  describe('File Type Detection - Images', () => {
    it('detects PNG by MIME type', () => {
      const file = createMockFile('image.png', 'image/png')
      const { container } = render(<FileViewerPanel file={file} fileName="image.png" />)

      const img = container.querySelector('img')
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('src', mockObjectURL)
      expect(img).toHaveAttribute('alt', 'image.png')
    })

    it('detects JPEG by MIME type', () => {
      const file = createMockFile('photo.jpg', 'image/jpeg')
      const { container } = render(<FileViewerPanel file={file} fileName="photo.jpg" />)

      const img = container.querySelector('img')
      expect(img).toBeInTheDocument()
    })

    it('detects image by extension - png', () => {
      const file = createMockFile('image.png', '')
      const { container } = render(<FileViewerPanel file={file} fileName="image.png" />)

      const img = container.querySelector('img')
      expect(img).toBeInTheDocument()
    })

    it('detects image by extension - jpg', () => {
      const file = createMockFile('image.jpg', '')
      const { container } = render(<FileViewerPanel file={file} fileName="image.jpg" />)

      const img = container.querySelector('img')
      expect(img).toBeInTheDocument()
    })

    it('detects image by extension - gif', () => {
      const file = createMockFile('animation.gif', '')
      const { container } = render(<FileViewerPanel file={file} fileName="animation.gif" />)

      const img = container.querySelector('img')
      expect(img).toBeInTheDocument()
    })

    it('detects image by extension - webp', () => {
      const file = createMockFile('image.webp', '')
      const { container } = render(<FileViewerPanel file={file} fileName="image.webp" />)

      const img = container.querySelector('img')
      expect(img).toBeInTheDocument()
    })
  })

  describe('File Type Detection - Text Files', () => {
    it('detects text file by MIME type', async () => {
      const fileContent = 'This is a text file content'
      const file = createMockFile('document.txt', 'text/plain', fileContent)
      
      render(<FileViewerPanel file={file} fileName="document.txt" />)

      // Should show loading initially
      expect(screen.getByText('Loading file...')).toBeInTheDocument()

      // Wait for file to load
      await waitFor(() => {
        expect(screen.getByText(fileContent)).toBeInTheDocument()
      })
    })

    it('detects text file by .txt extension', async () => {
      const fileContent = 'Test content'
      const file = createMockFile('notes.txt', '', fileContent)
      
      render(<FileViewerPanel file={file} fileName="notes.txt" />)

      await waitFor(() => {
        expect(screen.getByText(fileContent)).toBeInTheDocument()
      })
    })

    it('detects JSON file by extension', async () => {
      const jsonContent = '{"key": "value"}'
      const file = createMockFile('config.json', '', jsonContent)
      
      render(<FileViewerPanel file={file} fileName="config.json" />)

      await waitFor(() => {
        expect(screen.getByText(jsonContent)).toBeInTheDocument()
      })
    })

    it('detects markdown file by extension', async () => {
      const mdContent = '# Heading\n\nParagraph text'
      const file = createMockFile('readme.md', '', mdContent)
      
      render(<FileViewerPanel file={file} fileName="readme.md" />)

      await waitFor(() => {
        // Check that text content is present (use regex for flexible matching)
        expect(screen.getByText(/# Heading/)).toBeInTheDocument()
        expect(screen.getByText(/Paragraph text/)).toBeInTheDocument()
      })
    })

    it('displays text content in pre tag for formatting', async () => {
      const formattedText = 'Line 1\n  Line 2 with indent\nLine 3'
      const file = createMockFile('formatted.txt', 'text/plain', formattedText)
      
      const { container } = render(<FileViewerPanel file={file} fileName="formatted.txt" />)

      await waitFor(() => {
        const preElement = container.querySelector('pre')
        expect(preElement).toBeInTheDocument()
        // Check that text contains the individual lines
        expect(screen.getByText(/Line 1/)).toBeInTheDocument()
        expect(screen.getByText(/Line 2 with indent/)).toBeInTheDocument()
        expect(screen.getByText(/Line 3/)).toBeInTheDocument()
      })
    })
  })

  describe('Unsupported File Types', () => {
    it('shows fallback UI for unsupported file type', () => {
      const file = createMockFile('unknown.xyz', 'application/unknown')
      render(<FileViewerPanel file={file} fileName="unknown.xyz" />)

      expect(screen.getByText('Preview not available for this file type')).toBeInTheDocument()
      // File name appears twice (in fallback and footer), so use getAllByText
      const fileNameElements = screen.getAllByText('unknown.xyz')
      expect(fileNameElements.length).toBeGreaterThan(0)
    })

    it('shows download button in fallback UI', () => {
      const file = createMockFile('data.bin', 'application/octet-stream')
      render(<FileViewerPanel file={file} fileName="data.bin" />)

      const downloadButton = screen.getByText('Download File')
      expect(downloadButton).toBeInTheDocument()
    })

    it('shows file icon in fallback UI', () => {
      const file = createMockFile('unknown.xyz', 'application/unknown')
      render(<FileViewerPanel file={file} fileName="unknown.xyz" />)

      // Check for document emoji icon
      expect(screen.getByText('📄')).toBeInTheDocument()
    })
  })

  describe('Download Functionality', () => {
    it('triggers download when header download button is clicked', () => {
      const file = createMockFile('document.pdf', 'application/pdf')
      render(<FileViewerPanel file={file} fileName="document.pdf" />)

      // Mock createElement and click
      const mockLink = document.createElement('a')
      const clickSpy = vi.spyOn(mockLink, 'click')
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink)

      const downloadButton = screen.getByTitle('Download file')
      fireEvent.click(downloadButton)

      expect(createElementSpy).toHaveBeenCalledWith('a')
      expect(mockLink.href).toBe(mockObjectURL)
      expect(mockLink.download).toBe('document.pdf')
      expect(clickSpy).toHaveBeenCalled()

      createElementSpy.mockRestore()
      clickSpy.mockRestore()
    })

    it('triggers download from fallback UI download button', () => {
      const file = createMockFile('data.bin', 'application/octet-stream')
      render(<FileViewerPanel file={file} fileName="data.bin" />)

      const mockLink = document.createElement('a')
      const clickSpy = vi.spyOn(mockLink, 'click')
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink)

      const downloadButton = screen.getByText('Download File')
      fireEvent.click(downloadButton)

      expect(mockLink.download).toBe('data.bin')
      expect(clickSpy).toHaveBeenCalled()

      createElementSpy.mockRestore()
      clickSpy.mockRestore()
    })
  })

  describe('URL Management', () => {
    it('creates object URL on mount', () => {
      const file = createMockFile('test.pdf', 'application/pdf')
      render(<FileViewerPanel file={file} fileName="test.pdf" />)

      expect(createObjectURLSpy).toHaveBeenCalledWith(file)
    })

    it('revokes object URL on unmount', () => {
      const file = createMockFile('test.pdf', 'application/pdf')
      const { unmount } = render(<FileViewerPanel file={file} fileName="test.pdf" />)

      unmount()

      expect(revokeObjectURLSpy).toHaveBeenCalledWith(mockObjectURL)
    })

    it('creates new URL when file changes', () => {
      const file1 = createMockFile('file1.pdf', 'application/pdf')
      const { rerender } = render(<FileViewerPanel file={file1} fileName="file1.pdf" />)

      expect(createObjectURLSpy).toHaveBeenCalledTimes(1)

      const file2 = createMockFile('file2.pdf', 'application/pdf')
      rerender(<FileViewerPanel file={file2} fileName="file2.pdf" />)

      // Should create new URL and revoke old one
      expect(createObjectURLSpy).toHaveBeenCalledTimes(2)
      expect(revokeObjectURLSpy).toHaveBeenCalledWith(mockObjectURL)
    })
  })

  describe('Edge Cases', () => {
    it('handles files with no extension', () => {
      const file = createMockFile('README', 'text/plain')
      render(<FileViewerPanel file={file} fileName="README" />)

      // Should detect as text based on MIME type
      expect(screen.getByText('Loading file...')).toBeInTheDocument()
    })

    it('handles files with uppercase extensions', () => {
      const file = createMockFile('DOCUMENT.PDF', '')
      render(<FileViewerPanel file={file} fileName="DOCUMENT.PDF" />)

      // Should detect PDF (case-insensitive)
      expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument()
    })

    it('handles files with multiple dots in name', () => {
      const file = createMockFile('my.file.name.pdf', 'application/pdf')
      render(<FileViewerPanel file={file} fileName="my.file.name.pdf" />)

      expect(screen.getByText('my.file.name.pdf')).toBeInTheDocument()
      expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument()
    })

    it('handles very long file names', () => {
      const longName = 'very_long_file_name_that_might_cause_ui_issues_in_display_' + 'x'.repeat(100) + '.pdf'
      const file = createMockFile(longName, 'application/pdf')
      render(<FileViewerPanel file={file} fileName={longName} />)

      expect(screen.getByText(longName)).toBeInTheDocument()
    })

    it('handles files with special characters in name', () => {
      const specialName = 'file-name_with!special@chars#2024.pdf'
      const file = createMockFile(specialName, 'application/pdf')
      render(<FileViewerPanel file={file} fileName={specialName} />)

      expect(screen.getByText(specialName)).toBeInTheDocument()
    })

    it('handles zero-byte files', () => {
      const file = createMockFile('empty.txt', 'text/plain', '')
      render(<FileViewerPanel file={file} fileName="empty.txt" />)

      expect(screen.getByText('0.00 KB')).toBeInTheDocument()
    })

    it('handles large file sizes correctly', () => {
      // Create a file with size > 1MB
      const largeContent = 'x'.repeat(2 * 1024 * 1024) // 2MB
      const file = createMockFile('large.pdf', 'application/pdf', largeContent)
      render(<FileViewerPanel file={file} fileName="large.pdf" />)

      // Should display size in KB
      expect(screen.getByText(/KB/)).toBeInTheDocument()
    })
  })

  describe('Text File Error Handling', () => {
    it('displays error message when text file fails to load', async () => {
      const file = createMockFile('error.txt', 'text/plain')
      
      // Mock FileReader to simulate error
      const originalFileReader = window.FileReader
      
      class MockFileReader {
        onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null
        onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null
        
        readAsText() {
          setTimeout(() => {
            if (this.onerror) {
              const errorEvent = new ProgressEvent('error') as ProgressEvent<FileReader>
              this.onerror.call(this as any, errorEvent)
            }
          }, 0)
        }
      }
      
      window.FileReader = MockFileReader as any

      render(<FileViewerPanel file={file} fileName="error.txt" />)

      await waitFor(() => {
        expect(screen.getByText('Error loading file content')).toBeInTheDocument()
      })

      window.FileReader = originalFileReader
    })
  })

  describe('File Type Priority - MIME vs Extension', () => {
    it('prioritizes MIME type over extension for PDF', () => {
      // File has .txt extension but PDF MIME type
      const file = createMockFile('document.txt', 'application/pdf')
      render(<FileViewerPanel file={file} fileName="document.txt" />)

      // Should render as PDF based on MIME type
      expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument()
    })

    it('uses extension when MIME type is generic', () => {
      // Generic MIME type but .pdf extension
      const file = createMockFile('document.pdf', 'application/octet-stream')
      render(<FileViewerPanel file={file} fileName="document.pdf" />)

      // Should detect as PDF based on extension
      expect(screen.getByTestId('pdf-viewer')).toBeInTheDocument()
    })
  })
})