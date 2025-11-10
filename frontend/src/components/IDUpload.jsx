import { useState } from 'react'
import axios from 'axios'
import Tesseract from 'tesseract.js'

// Valid KYCAID document types according to their API documentation:
// https://docs-v1.kycaid.com/#verification-types
// GOVERNMENT_ID, PASSPORT, DRIVERS_LICENSE, DOMESTIC_PASSPORT,
// PERMANENT_RESIDENCE_PERMIT, REFUGEE_CARD, FOREIGN_CITIZEN_PASSPORT, TAX_ID_NUMBER

// For US-based users, we use these 4 main types:
const ID_TYPE_MAPPING = {
  'DRIVERS_LICENSE': 'DRIVERS_LICENSE',
  'GOVERNMENT_ID': 'GOVERNMENT_ID',
  'PASSPORT': 'PASSPORT',
  'PERMANENT_RESIDENCE_PERMIT': 'PERMANENT_RESIDENCE_PERMIT'
}

// Helper function to parse OCR text and extract relevant fields
const parseIDData = (text) => {
  console.log('=== OCR PARSING START ===')
  console.log('Raw OCR Text:', text)
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  console.log('Parsed Lines:', lines)
  
  const extractedData = {
    first_name: '',
    last_name: '',
    dob: '',
    email: '',
    phone: '',
    residence_country: 'US',
    document_number: '',
    expiry_date: '',
    street_name: '',
    building_number: '',
    city: '',
    state: '',
    postal_code: ''
  }

  // Date pattern: MM/DD/YYYY or DD/MM/YYYY or YYYY/MM/DD or variations with - or .
  const datePattern = /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/g
  const dates = []
  
  // Extract all dates
  text.match(datePattern)?.forEach(date => {
    dates.push(date)
  })
  console.log('Found Dates:', dates)

  // Look for DOB (Date of Birth)
  const dobKeywords = ['DOB', 'DATE OF BIRTH', 'BIRTH', 'BIRTHDATE', 'D.O.B', 'BORN']
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toUpperCase()
    if (dobKeywords.some(keyword => line.includes(keyword))) {
      const dateMatch = lines[i].match(datePattern) || (i + 1 < lines.length ? lines[i + 1].match(datePattern) : null)
      if (dateMatch) {
        extractedData.dob = dateMatch[0]
        console.log('Extracted DOB:', extractedData.dob)
        break
      }
    }
  }

  // Look for expiration date
  const expKeywords = ['EXP', 'EXPIR', 'VALID', 'UNTIL']
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toUpperCase()
    if (expKeywords.some(keyword => line.includes(keyword))) {
      const dateMatch = lines[i].match(datePattern) || (i + 1 < lines.length ? lines[i + 1].match(datePattern) : null)
      if (dateMatch) {
        extractedData.expiry_date = dateMatch[0]
        console.log('Extracted Expiry Date:', extractedData.expiry_date)
        break
      }
    }
  }

  // Look for names - typically after "NAME" or "LAST NAME, FIRST NAME"
  const nameKeywords = ['NAME', 'LAST NAME', 'FIRST NAME', 'SURNAME', 'GIVEN']
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toUpperCase()
    if (nameKeywords.some(keyword => line.includes(keyword))) {
      // Check next line for name
      if (i + 1 < lines.length) {
        const nameLine = lines[i + 1]
        // If comma-separated: "LAST, FIRST"
        if (nameLine.includes(',')) {
          const parts = nameLine.split(',').map(p => p.trim())
          extractedData.last_name = parts[0]
          extractedData.first_name = parts[1] || ''
          console.log('Extracted Name (comma format):', { first: extractedData.first_name, last: extractedData.last_name })
          break
        }
        // If space-separated: "FIRST LAST" or "FIRST MIDDLE LAST"
        else {
          const parts = nameLine.split(/\s+/)
          if (parts.length >= 2) {
            extractedData.first_name = parts[0]
            extractedData.last_name = parts[parts.length - 1]
            console.log('Extracted Name (space format):', { first: extractedData.first_name, last: extractedData.last_name })
            break
          }
        }
      }
    }
  }

  // Look for license/document number
  const licensePattern = /\b[A-Z0-9]{5,20}\b/
  const licenseKeywords = ['LICENSE', 'LIC', 'ID', 'NUMBER', 'NO', 'DL']
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toUpperCase()
    if (licenseKeywords.some(keyword => line.includes(keyword))) {
      const match = lines[i].match(licensePattern) || (i + 1 < lines.length ? lines[i + 1].match(licensePattern) : null)
      if (match) {
        extractedData.document_number = match[0]
        console.log('Extracted Document Number:', extractedData.document_number)
        break
      }
    }
  }

  // Look for address
  const addressKeywords = ['ADDRESS', 'ADDR', 'STREET', 'RESIDENCE']
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toUpperCase()
    if (addressKeywords.some(keyword => line.includes(keyword))) {
      // Address is usually on the next few lines
      let addressLines = []
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        addressLines.push(lines[j])
      }
      
      if (addressLines.length > 0) {
        // First line is usually street
        extractedData.street_name = addressLines[0]
        
        // Look for city, state, zip in subsequent lines
        const cityStateZip = addressLines.join(' ')
        
        // Postal code pattern
        const zipMatch = cityStateZip.match(/\b\d{5}(?:-\d{4})?\b/)
        if (zipMatch) {
          extractedData.postal_code = zipMatch[0]
        }
        
        // State pattern (2 letter code)
        const stateMatch = cityStateZip.match(/\b[A-Z]{2}\b/)
        if (stateMatch) {
          extractedData.state = stateMatch[0]
        }
        
        console.log('Extracted Address:', {
          street: extractedData.street_name,
          city: extractedData.city,
          state: extractedData.state,
          zip: extractedData.postal_code
        })
      }
      break
    }
  }

  console.log('=== OCR PARSING COMPLETE ===')
  console.log('Extracted Fields:', extractedData)
  
  return extractedData
}

function IDUpload({ onExtractionComplete }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [documentType, setDocumentType] = useState('DRIVERS_LICENSE')
  const [extractedData, setExtractedData] = useState(null)
  const [idFileId, setIdFileId] = useState(null)
  const [loadingMessage, setLoadingMessage] = useState('')

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0])
    setError(null)
    setExtractedData(null)
  }

  const handleUploadAndExtract = async () => {
    if (!selectedFile) {
      setError('Please select an ID image')
      return
    }

    setLoading(true)
    setError(null)
    setExtractedData(null)
    setLoadingMessage('Uploading ID image...')

    try {
      // Step 1: Upload file
      const formData = new FormData()
      formData.append('file', selectedFile)

      const uploadResponse = await axios.post('/api/files', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      if (!uploadResponse.data.file_id) {
        throw new Error('Failed to upload file')
      }

      const fileId = uploadResponse.data.file_id
      setIdFileId(fileId)
      setLoadingMessage('Extracting data from your ID...')

      // Step 2: Extract data using Tesseract.js OCR
      // Map the selected ID type to KYCAID document type
      const kycaidDocumentType = ID_TYPE_MAPPING[documentType] || documentType
      
      let ocrData = {
        first_name: '',
        last_name: '',
        dob: '',
        email: '',
        phone: '',
        residence_country: 'US'
      }

      try {
        console.log('Starting OCR extraction with Tesseract.js...')
        
        // Perform OCR on the selected file
        const result = await Tesseract.recognize(
          selectedFile,
          'eng',
          {
            logger: (m) => {
              // Log progress
              if (m.status === 'recognizing text') {
                const progress = Math.round(m.progress * 100)
                setLoadingMessage(`Extracting data from ID... ${progress}%`)
                console.log(`OCR Progress: ${progress}%`)
              }
            }
          }
        )

        console.log('=== TESSERACT OCR RESULT ===')
        console.log('Confidence:', result.data.confidence)
        console.log('Full Text:', result.data.text)
        console.log('===========================')

        // Parse the OCR text to extract structured data
        const parsedData = parseIDData(result.data.text)
        ocrData = { ...ocrData, ...parsedData }
        
        setExtractedData(ocrData)
        console.log('OCR Extraction Complete. Extracted Data:', ocrData)
        
      } catch (ocrError) {
        console.error('OCR extraction failed:', ocrError)
        console.log('Proceeding with empty fields. User can fill manually.')
        // Don't block the workflow if OCR fails - just proceed with empty fields
      }

      // Proceed to next step with extracted data (or empty fields if OCR failed)
      onExtractionComplete({
        extractedData: ocrData,
        idFileId: fileId,
        documentType: kycaidDocumentType,
        originalDocumentType: documentType
      })
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to upload and extract ID data')
      console.error('Error uploading ID:', err)
    } finally {
      setLoading(false)
      setLoadingMessage('')
    }
  }

  return (
    <div className="form-container">
      <h2>Upload ID & Extract Data</h2>
      <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
        Upload your ID and we'll automatically extract your information to speed up the process. You can review and edit the extracted data in the next step.
      </p>
      
      <div className="id-upload-form">
        <div className="form-group">
          <label htmlFor="documentType">ID Document Type *</label>
          <select
            id="documentType"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            disabled={loading}
          >
            <option value="DRIVERS_LICENSE">Driver's License (DL, Real ID, Enhanced DL)</option>
            <option value="GOVERNMENT_ID">State ID Card / Government Issued ID</option>
            <option value="PASSPORT">US Passport / Passport Card</option>
            <option value="PERMANENT_RESIDENCE_PERMIT">Permanent Resident Card / Work Permit</option>
          </select>
          <small className="form-hint">Select the type that matches your ID document (based on KYCAID accepted types)</small>
        </div>

        <div className="form-group">
          <label htmlFor="id-file-input">Upload ID Image *</label>
          <input
            type="file"
            id="id-file-input"
            onChange={handleFileChange}
            accept="image/*"
            disabled={loading}
          />
          {selectedFile && (
            <div className="file-preview">
              <p>Selected: {selectedFile.name}</p>
              {selectedFile.type.startsWith('image/') && (
                <img 
                  src={URL.createObjectURL(selectedFile)} 
                  alt="ID preview" 
                  style={{ maxWidth: '300px', maxHeight: '200px', marginTop: '10px' }}
                />
              )}
            </div>
          )}
        </div>

        <button
          onClick={handleUploadAndExtract}
          disabled={loading || !selectedFile}
          className="submit-button"
          style={{ marginTop: '20px' }}
        >
          {loading ? 'Processing...' : 'Upload & Extract Data'}
        </button>

        {loading && loadingMessage && (
          <div style={{ 
            marginTop: '10px', 
            padding: '10px', 
            backgroundColor: '#e3f2fd', 
            borderRadius: '4px',
            color: '#1976d2',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ 
              display: 'inline-block',
              width: '16px',
              height: '16px',
              border: '2px solid #1976d2',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            {loadingMessage}
          </div>
        )}
        
        {error && <div className="error-message">{error}</div>}

        {extractedData && (
          <div className="extraction-preview" style={{ 
            marginTop: '20px', 
            padding: '15px', 
            backgroundColor: '#e8f5e9', 
            borderRadius: '8px',
            border: '1px solid #4caf50'
          }}>
            <h4 style={{ color: '#2e7d32', marginTop: 0 }}>✓ Information Extracted from ID:</h4>
            <div className="extracted-data" style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '10px',
              fontSize: '14px'
            }}>
              {extractedData.first_name && (
                <p style={{ margin: '5px 0' }}><strong>First Name:</strong> {extractedData.first_name}</p>
              )}
              {extractedData.last_name && (
                <p style={{ margin: '5px 0' }}><strong>Last Name:</strong> {extractedData.last_name}</p>
              )}
              {extractedData.dob && (
                <p style={{ margin: '5px 0' }}><strong>Date of Birth:</strong> {extractedData.dob}</p>
              )}
              {extractedData.document_number && (
                <p style={{ margin: '5px 0' }}><strong>Document #:</strong> {extractedData.document_number}</p>
              )}
              {(extractedData.street_name || extractedData.city) && (
                <p style={{ margin: '5px 0', gridColumn: '1 / -1' }}>
                  <strong>Address:</strong> {[
                    extractedData.building_number,
                    extractedData.street_name,
                    extractedData.city,
                    extractedData.state,
                    extractedData.postal_code
                  ].filter(Boolean).join(', ')}
                </p>
              )}
              {extractedData.ocr_note && (
                <p style={{ margin: '5px 0', gridColumn: '1 / -1', color: '#f57c00', fontStyle: 'italic' }}>
                  {extractedData.ocr_note}
                </p>
              )}
            </div>
            <p style={{ marginTop: '10px', marginBottom: 0, fontSize: '13px', color: '#555' }}>
              This information will be pre-filled in the next step. You can review and edit it if needed.
            </p>
          </div>
        )}

        {idFileId && !error && (
          <div className="success-message" style={{ marginTop: '10px' }}>
            ID uploaded successfully! File ID: {idFileId}
          </div>
        )}
      </div>
    </div>
  )
}

export default IDUpload

