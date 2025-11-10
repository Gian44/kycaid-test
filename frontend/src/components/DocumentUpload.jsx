import { useState } from 'react'
import axios from 'axios'

function DocumentUpload({ applicantId, fileIds, setFileIds, documentIds, setDocumentIds, onNext, onSkip }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [documentType, setDocumentType] = useState('PASSPORT')
  const [documentNumber, setDocumentNumber] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0])
    setError(null)
  }

  const handleUploadFile = async () => {
    if (!selectedFile) {
      setError('Please select a file')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await axios.post('/api/files', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      if (response.data.file_id) {
        setFileIds([...fileIds, response.data.file_id])
        setSuccess(`File uploaded successfully! File ID: ${response.data.file_id}`)
        
        // Auto-create document with the uploaded file
        await createDocument(response.data.file_id)
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to upload file')
      console.error('Error uploading file:', err)
    } finally {
      setLoading(false)
    }
  }

  const createDocument = async (fileId) => {
    try {
      const documentData = {
        applicant_id: applicantId,
        type: documentType,
        front_side_id: fileId,
        ...(documentNumber && { document_number: documentNumber }),
        ...(issueDate && { issue_date: issueDate }),
        ...(expiryDate && { expiry_date: expiryDate })
      }

      const response = await axios.post('/api/documents', documentData)
      
      if (response.data.document_id) {
        setDocumentIds([...documentIds, response.data.document_id])
        setSuccess(prev => `${prev}\nDocument created! ID: ${response.data.document_id}`)
        
        // Reset form
        setSelectedFile(null)
        setDocumentNumber('')
        setIssueDate('')
        setExpiryDate('')
        
        // Reset file input
        const fileInput = document.getElementById('file-input')
        if (fileInput) fileInput.value = ''
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to create document')
      console.error('Error creating document:', err)
    }
  }

  return (
    <div className="form-container">
      <h2>Upload Additional Documents (Optional)</h2>
      <p className="form-hint">Your ID has already been uploaded. You can upload additional documents here if needed, or skip this step.</p>
      
      <div className="document-upload-form">
        <div className="form-group">
          <label htmlFor="documentType">Document Type *</label>
          <select
            id="documentType"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
          >
            <option value="PASSPORT">Passport</option>
            <option value="ID_CARD">ID Card</option>
            <option value="DRIVERS">Driver's License</option>
            <option value="RESIDENCE_PERMIT">Residence Permit</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="documentNumber">Document Number</label>
          <input
            type="text"
            id="documentNumber"
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
            placeholder="e.g., AB123456"
          />
        </div>

        <div className="form-group">
          <label htmlFor="issueDate">Issue Date</label>
          <input
            type="date"
            id="issueDate"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="expiryDate">Expiry Date</label>
          <input
            type="date"
            id="expiryDate"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="file-input">Select Document Image *</label>
          <input
            type="file"
            id="file-input"
            onChange={handleFileChange}
            accept="image/*,.pdf"
          />
          {selectedFile && (
            <div className="file-preview">
              Selected: {selectedFile.name}
            </div>
          )}
        </div>

        <button
          onClick={handleUploadFile}
          disabled={loading || !selectedFile}
          className="submit-button"
        >
          {loading ? 'Uploading...' : 'Upload & Create Document'}
        </button>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {documentIds.length > 0 && (
          <div className="uploaded-documents">
            <h4>Uploaded Documents ({documentIds.length})</h4>
            <ul>
              {documentIds.map((id, index) => (
                <li key={id}>Document {index + 1}: {id}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="button-group">
          {onSkip && (
            <button
              onClick={onSkip}
              className="back-button"
            >
              Skip This Step →
            </button>
          )}
          <button
            onClick={onNext}
            className="next-button"
          >
            Continue to Verification →
          </button>
        </div>
      </div>
    </div>
  )
}

export default DocumentUpload

