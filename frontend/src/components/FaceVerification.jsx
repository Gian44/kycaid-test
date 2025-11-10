import { useState, useRef, useEffect } from 'react'
import axios from 'axios'

function FaceVerification({ idFileId, onVerificationComplete, onBack }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [verificationStatus, setVerificationStatus] = useState(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [capturedImage, setCapturedImage] = useState(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    // Initialize camera when component mounts
    startCamera()
    
    return () => {
      // Cleanup: stop camera stream when component unmounts
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', // Front-facing camera
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      })
      
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setCameraReady(true)
      }
    } catch (err) {
      console.error('Error accessing camera:', err)
      setError('Unable to access camera. Please ensure camera permissions are granted.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedImage(blob)
        stopCamera()
      }
    }, 'image/jpeg', 0.95)
  }

  const retakePhoto = () => {
    setCapturedImage(null)
    setError(null)
    setVerificationStatus(null)
    startCamera()
  }

  const handleVerification = async () => {
    if (!capturedImage || !idFileId) {
      setError('Please capture a photo first')
      return
    }

    setLoading(true)
    setError(null)
    setVerificationStatus(null)

    try {
      // Step 1: Upload selfie
      const formData = new FormData()
      formData.append('file', capturedImage, 'selfie.jpg')

      const uploadResponse = await axios.post('/api/files', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      if (!uploadResponse.data.file_id) {
        throw new Error('Failed to upload selfie')
      }

      const selfieFileId = uploadResponse.data.file_id

      // Step 2: Perform face verification
      const verificationResponse = await axios.post('/api/services/face-verification', {
        selfie_file_id: selfieFileId,
        id_file_id: idFileId
      })

      setVerificationStatus(verificationResponse.data)

      // Check if verification was successful
      const isSuccess = verificationResponse.data?.status === 'approved' || 
                       verificationResponse.data?.match_score > 0.7 ||
                       verificationResponse.data?.liveness_status === 'passed'

      if (isSuccess) {
        onVerificationComplete({
          selfieFileId: selfieFileId,
          verificationResult: verificationResponse.data
        })
      } else {
        setError('Face verification failed. Please try again.')
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Face verification failed')
      console.error('Error during face verification:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-container">
      <h2>Face Verification</h2>
      
      <div className="face-verification-form">
        <div className="verification-instructions">
          <p>Please take a clear selfie to verify your identity.</p>
          <ul>
            <li>Look directly at the camera</li>
            <li>Ensure good lighting</li>
            <li>Remove any face coverings</li>
            <li>Keep your face centered in the frame</li>
          </ul>
        </div>

        {!capturedImage ? (
          <div className="camera-container">
            {cameraReady ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  style={{
                    width: '100%',
                    maxWidth: '640px',
                    borderRadius: '8px',
                    transform: 'scaleX(-1)' // Mirror the video for better UX
                  }}
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <button
                  onClick={capturePhoto}
                  className="submit-button"
                  style={{ marginTop: '15px' }}
                >
                  Capture Photo
                </button>
              </>
            ) : (
              <div className="camera-loading">
                <p>Initializing camera...</p>
              </div>
            )}
          </div>
        ) : (
          <div className="captured-image-container">
            <img
              src={URL.createObjectURL(capturedImage)}
              alt="Captured selfie"
              style={{
                width: '100%',
                maxWidth: '400px',
                borderRadius: '8px',
                marginBottom: '15px'
              }}
            />
            <div className="button-group">
              <button
                onClick={retakePhoto}
                className="back-button"
                disabled={loading}
              >
                Retake Photo
              </button>
              <button
                onClick={handleVerification}
                className="submit-button"
                disabled={loading}
              >
                {loading ? 'Verifying...' : 'Verify Identity'}
              </button>
            </div>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        {verificationStatus && (
          <div className="verification-result">
            <h4>Verification Result:</h4>
            <div className="result-details">
              {verificationStatus.match_score && (
                <p><strong>Match Score:</strong> {(verificationStatus.match_score * 100).toFixed(1)}%</p>
              )}
              {verificationStatus.liveness_status && (
                <p><strong>Liveness Status:</strong> {verificationStatus.liveness_status}</p>
              )}
              {verificationStatus.status && (
                <p><strong>Status:</strong> {verificationStatus.status}</p>
              )}
            </div>
          </div>
        )}

        {onBack && (
          <button
            onClick={onBack}
            className="back-button"
            style={{ marginTop: '15px' }}
            disabled={loading}
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  )
}

export default FaceVerification

