import { useState, useEffect } from 'react'
import axios from 'axios'

function ApplicantDetails({ applicantId }) {
  const [applicant, setApplicant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (applicantId) {
      fetchApplicant()
    }
  }, [applicantId])

  const fetchApplicant = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`/api/applicants/${applicantId}`)
      setApplicant(response.data)
    } catch (err) {
      setError('Failed to fetch applicant details')
      console.error('Error fetching applicant:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="loading">Loading applicant details...</div>
  if (error) return <div className="error-message">{error}</div>
  if (!applicant) return null

  return (
    <div className="applicant-details">
      <h3>Applicant Information</h3>
      <div className="details-grid">
        <div className="detail-item">
          <span className="detail-label">ID:</span>
          <span className="detail-value">{applicant.applicant_id}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Name:</span>
          <span className="detail-value">{applicant.first_name} {applicant.last_name}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Email:</span>
          <span className="detail-value">{applicant.email}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Date of Birth:</span>
          <span className="detail-value">{applicant.dob}</span>
        </div>
        {applicant.residence_country && (
          <div className="detail-item">
            <span className="detail-label">Country:</span>
            <span className="detail-value">{applicant.residence_country}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default ApplicantDetails

