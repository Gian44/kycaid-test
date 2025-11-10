import { useState } from 'react'
import axios from 'axios'

function IDUpload({ onExtractionComplete }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [documentType, setDocumentType] = useState('DRIVERS')
  const [extractedData, setExtractedData] = useState(null)
  const [idFileId, setIdFileId] = useState(null)

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

      // Step 2: Extract data using document recognition
      // Note: KYCAID might require creating a document first to extract data
      // For now, we'll try the service endpoint, but may need to create a temporary applicant
      try {
        const recognitionResponse = await axios.post('/api/services/document-recognition', {
          file_id: fileId,
          document_type: documentType
        })

        // If we get extracted data, use it
        if (recognitionResponse.data) {
          setExtractedData(recognitionResponse.data)
          onExtractionComplete({
            extractedData: recognitionResponse.data,
            idFileId: fileId,
            documentType: documentType
          })
        }
      } catch (recognitionError) {
        // If service endpoint doesn't work, we'll need to create
        // a temporary applicant and document to extract data
        // For now, show a message that extraction will happen after applicant creation
        console.warn('Direct OCR extraction not available, will extract after document creation:', recognitionError)
        
        // Still pass the file_id so we can create document later
        onExtractionComplete({
          extractedData: null,
          idFileId: fileId,
          documentType: documentType,
          needsDocumentCreation: true
        })
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Failed to upload and extract ID data')
      console.error('Error uploading ID:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-container">
      <h2>Upload ID & Extract Data</h2>
      
      <div className="id-upload-form">
        <div className="form-group">
          <label htmlFor="documentType">ID Document Type *</label>
          <select
            id="documentType"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            disabled={loading}
          >
            <option value="DRIVERS">US Driver's License</option>
            <option value="ID_CARD">US ID Card</option>
            <option value="PASSPORT">US Passport</option>
          </select>
          <small className="form-hint">Select the type of ID you're uploading</small>
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
        >
          {loading ? 'Uploading & Extracting...' : 'Upload ID & Extract Data'}
        </button>

        {error && <div className="error-message">{error}</div>}

        {extractedData && (
          <div className="extraction-preview">
            <h4>Extracted Information:</h4>
            <div className="extracted-data">
              {extractedData.first_name && (
                <p><strong>First Name:</strong> {extractedData.first_name}</p>
              )}
              {extractedData.last_name && (
                <p><strong>Last Name:</strong> {extractedData.last_name}</p>
              )}
              {extractedData.dob && (
                <p><strong>Date of Birth:</strong> {extractedData.dob}</p>
              )}
              {extractedData.document_number && (
                <p><strong>Document Number:</strong> {extractedData.document_number}</p>
              )}
              {extractedData.address && (
                <p><strong>Address:</strong> {JSON.stringify(extractedData.address)}</p>
              )}
            </div>
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

