import { useState, useEffect } from 'react'
import axios from 'axios'

function VerificationPanel({ applicantId, verificationId, setVerificationId, onBack, onReset }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [verification, setVerification] = useState(null)
  const [polling, setPolling] = useState(false)
  const [autoVerified, setAutoVerified] = useState(false)

  // Auto-trigger verification when component mounts (if not already verified)
  useEffect(() => {
    if (!verificationId && !autoVerified && applicantId) {
      console.log('Auto-triggering verification...')
      setAutoVerified(true)
      createVerification()
    }
  }, [applicantId, verificationId, autoVerified])

  useEffect(() => {
    if (verificationId && !polling) {
      fetchVerification()
      // Start polling for verification status
      setPolling(true)
      const interval = setInterval(() => {
        fetchVerification()
      }, 10000) // Poll every 10 seconds

      return () => clearInterval(interval)
    }
  }, [verificationId])

  const createVerification = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log('Creating verification for applicant:', applicantId)
      
      const response = await axios.post('/api/verifications', {
        applicant_id: applicantId,
        types: ['PERSON']  // Valid KYCAID verification type for identity verification
      })

      console.log('Verification created:', response.data)

      if (response.data.verification_id) {
        setVerificationId(response.data.verification_id)
      }
    } catch (err) {
      console.error('Error creating verification:', err)
      console.error('Error details:', err.response?.data)
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to create verification')
    } finally {
      setLoading(false)
    }
  }

  const fetchVerification = async () => {
    if (!verificationId) return

    try {
      const response = await axios.get(`/api/verifications/${verificationId}`)
      setVerification(response.data)
      
      // Stop polling if verification is complete
      if (response.data.verified === true || response.data.verified === false) {
        setPolling(false)
      }
    } catch (err) {
      console.error('Error fetching verification:', err)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return 'green'
      case 'pending':
      case 'processing':
        return 'orange'
      case 'declined':
      case 'rejected':
        return 'red'
      default:
        return 'gray'
    }
  }

  return (
    <div className="form-container">
      <h2>Verification</h2>

      {!verificationId ? (
        <div className="verification-create">
          <div style={{ 
            padding: '20px', 
            textAlign: 'center',
            backgroundColor: '#e3f2fd',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <div style={{ 
              display: 'inline-block',
              width: '40px',
              height: '40px',
              border: '4px solid #1976d2',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '15px'
            }} />
            <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#1976d2', margin: '10px 0' }}>
              {loading ? 'Starting verification...' : 'Preparing verification...'}
            </p>
            <p className="info-text" style={{ marginTop: '10px' }}>
              Submitting all provided information to KYCAID for verification.
              The verification process typically takes 2 minutes to 6 hours.
            </p>
          </div>
          
          {error && (
            <div className="error-message" style={{ marginTop: '20px' }}>
              <p><strong>Verification Failed:</strong> {error}</p>
              <button
                onClick={createVerification}
                className="submit-button"
                style={{ marginTop: '15px' }}
              >
                Retry Verification
              </button>
            </div>
          )}

          <div className="button-group" style={{ marginTop: '20px' }}>
            <button type="button" onClick={onBack} className="back-button">
              ← Back
            </button>
          </div>
        </div>
      ) : (
        <div className="verification-status">
          <div className="verification-info">
            <h3>Verification Status</h3>
            <div className="detail-item">
              <span className="detail-label">Verification ID:</span>
              <span className="detail-value">{verificationId}</span>
            </div>
            
            {verification && (
              <>
                <div className="detail-item">
                  <span className="detail-label">Status:</span>
                  <span 
                    className="detail-value status-badge"
                    style={{ 
                      backgroundColor: getStatusColor(verification.status),
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '4px',
                      display: 'inline-block'
                    }}
                  >
                    {verification.status?.toUpperCase() || 'PENDING'}
                  </span>
                </div>

                <div className="detail-item">
                  <span className="detail-label">Verified:</span>
                  <span className="detail-value">
                    {verification.verified === true ? '✓ Yes' : 
                     verification.verified === false ? '✗ No' : 
                     '⏳ In Progress'}
                  </span>
                </div>

                {verification.verified_at && (
                  <div className="detail-item">
                    <span className="detail-label">Verified At:</span>
                    <span className="detail-value">
                      {new Date(verification.verified_at * 1000).toLocaleString()}
                    </span>
                  </div>
                )}

                {verification.decline_reasons && verification.decline_reasons.length > 0 && (
                  <div className="decline-reasons">
                    <h4>Decline Reasons:</h4>
                    <ul>
                      {verification.decline_reasons.map((reason, index) => (
                        <li key={index}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {polling && (
                  <div className="polling-indicator">
                    <span className="pulse">●</span> Checking for updates...
                  </div>
                )}
              </>
            )}
          </div>

          <div className="button-group">
            <button onClick={fetchVerification} className="refresh-button">
              Refresh Status
            </button>
            <button onClick={onReset} className="reset-button">
              Start New Verification
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default VerificationPanel

