/**
 * Mock Data Extraction Utility
 * 
 * Simulates backend data extraction from uploaded documents.
 * In production, this would be replaced with actual API calls to backend services.
 */

export interface ExtractedData {
  [key: string]: string | number
}

/**
 * Generates random invoice number
 */
const generateInvoiceNumber = (): string => {
  const prefix = 'PLC'
  const number = Math.floor(Math.random() * 9000) + 1000
  return `${prefix}${number}`
}

/**
 * Generates random date within the last year
 */
const generateRecentDate = (): string => {
  const date = new Date()
  date.setDate(date.getDate() - Math.floor(Math.random() * 365))
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
}

/**
 * Generates random dollar amount
 */
const generateAmount = (min: number, max: number): string => {
  const amount = Math.random() * (max - min) + min
  return `$${amount.toFixed(2)}`
}

/**
 * Mock extraction for Excel invoice files
 */
const extractInvoiceData = (fileName: string): ExtractedData => {
  return {
    'Invoice number': generateInvoiceNumber(),
    'Invoice date': generateRecentDate(),
    'Bill to': 'Olympic World Hotel, 55 Comfort Street, Medalia City, MM 88531',
    'Phone': '222-222-9000'
  }
}

/**
 * Mock extraction for PDF shipping documents
 */
const extractShippingData = (fileName: string): ExtractedData => {
  return {
    'Shipping Doc ID': `SHP-${Math.floor(Math.random() * 9000) + 1000}`,
    'Ship Date': generateRecentDate(),
    'Delivery Date': generateRecentDate(),
    'Carrier': ['FedEx Express', 'UPS Ground', 'DHL International'][Math.floor(Math.random() * 3)],
    'Tracking Number': `TRK${Math.floor(Math.random() * 900000000) + 100000000}`,
    'Origin': 'Warehouse A, 123 Industrial Blvd, Chicago, IL 60601',
    'Destination': 'Olympic World Hotel, 55 Comfort Street, Medalia City, MM 88531',
    'Weight': `${(Math.random() * 500 + 50).toFixed(2)} lbs`,
    'Dimensions': `${Math.floor(Math.random() * 40 + 10)}" x ${Math.floor(Math.random() * 30 + 10)}" x ${Math.floor(Math.random() * 20 + 5)}"`,
    'Status': ['In Transit', 'Delivered', 'Out for Delivery'][Math.floor(Math.random() * 3)],
    'Signature Required': Math.random() > 0.5 ? 'Yes' : 'No',
    'Insurance': generateAmount(500, 5000)
  }
}

/**
 * Mock extraction for Word documents
 */
const extractWordData = (fileName: string): ExtractedData => {
  return {
    'Document Title': fileName.replace(/\.(doc|docx)$/, ''),
    'Document Type': 'Contract',
    'Created Date': generateRecentDate(),
    'Last Modified': generateRecentDate(),
    'Author': 'John Smith',
    'Pages': Math.floor(Math.random() * 50) + 5,
    'Word Count': Math.floor(Math.random() * 5000) + 500,
    'Status': 'Draft'
  }
}

/**
 * Generic fallback extraction for unknown file types
 */
const extractGenericData = (file: File): ExtractedData => {
  return {
    'File name': file.name,
    'File size': `${(file.size / 1024).toFixed(2)} KB`,
    'File type': file.type || 'Unknown',
    'Upload date': new Date().toLocaleDateString('en-US'),
    'Last modified': new Date(file.lastModified).toLocaleDateString('en-US')
  }
}

/**
 * Main extraction function - routes to appropriate extractor based on file type
 * @param file - File object to extract data from
 * @returns Promise resolving to extracted key-value data
 */
export const mockExtractData = async (file: File): Promise<ExtractedData> => {
  // Simulate network delay for realistic behavior
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000))
  
  const fileName = file.name.toLowerCase()
  const fileExtension = fileName.split('.').pop() || ''
  
  // Route to appropriate extractor based on file type
  if (fileName.includes('invoice') && ['xls', 'xlsx'].includes(fileExtension)) {
    return extractInvoiceData(file.name)
  }
  
  if (fileName.includes('shipping') && fileExtension === 'pdf') {
    return extractShippingData(file.name)
  }
  
  if (['doc', 'docx'].includes(fileExtension)) {
    return extractWordData(file.name)
  }
  
  // Fallback for unknown types
  return extractGenericData(file)
}

/**
 * Batch extract data from multiple files
 * @param files - Array of files to extract
 * @returns Promise resolving to map of file IDs to extracted data
 */
export const mockExtractBatch = async (
  files: Array<{ id: string; file: File }>
): Promise<Map<string, ExtractedData>> => {
  const results = new Map<string, ExtractedData>()
  
  // Extract data from each file sequentially
  for (const fileData of files) {
    const extracted = await mockExtractData(fileData.file)
    results.set(fileData.id, extracted)
  }
  
  return results
}