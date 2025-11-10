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
    // Small delay to ensure video element is mounted
    const timer = setTimeout(() => {
      startCamera()
    }, 100)
    
    return () => {
      clearTimeout(timer)
      // Cleanup: stop camera stream when component unmounts
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    try {
      // Stop any existing stream first
      stopCamera()
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user', // Front-facing camera
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      })
      
      streamRef.current = stream
      
      if (videoRef.current) {
        const video = videoRef.current
        video.srcObject = stream
        
        // Try to play immediately
        video.play()
          .then(() => {
            setCameraReady(true)
          })
          .catch((playErr) => {
            console.warn('Initial play failed, waiting for metadata:', playErr)
            // If immediate play fails, wait for metadata
            video.onloadedmetadata = () => {
              if (video) {
                video.play()
                  .then(() => {
                    setCameraReady(true)
                  })
                  .catch((err) => {
                    console.error('Error playing video after metadata:', err)
                    setError('Unable to start camera video. Please try again.')
                    setCameraReady(false)
                  })
              }
            }
          })
        
        // Handle video errors
        video.onerror = (err) => {
          console.error('Video error:', err)
          setError('Error displaying camera feed. Please try again.')
          setCameraReady(false)
        }
        
        // Also listen for canplay event as backup
        video.oncanplay = () => {
          if (video && !cameraReady) {
            video.play()
              .then(() => setCameraReady(true))
              .catch(() => {}) // Ignore errors here, already handled above
          }
        }
      } else {
        // If video ref is not ready, set it up when it becomes available
        setTimeout(() => {
          if (videoRef.current && streamRef.current) {
            const video = videoRef.current
            video.srcObject = streamRef.current
            video.play()
              .then(() => setCameraReady(true))
              .catch(() => {
                video.onloadedmetadata = () => {
                  if (video) {
                    video.play().then(() => setCameraReady(true))
                  }
                }
              })
          }
        }, 100)
      }
    } catch (err) {
      console.error('Error accessing camera:', err)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please allow camera access and try again.')
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera found. Please ensure a camera is connected.')
      } else {
        setError('Unable to access camera. Please ensure camera permissions are granted.')
      }
      setCameraReady(false)
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

  const retakePhoto = async () => {
    setCapturedImage(null)
    setError(null)
    setVerificationStatus(null)
    setCameraReady(false)
    // Small delay to ensure state is reset
    await new Promise(resolve => setTimeout(resolve, 100))
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
          <div className="camera-container" style={{ marginTop: '20px' }}>
            {cameraReady ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    maxWidth: '640px',
                    maxHeight: '480px',
                    borderRadius: '8px',
                    backgroundColor: '#000',
                    transform: 'scaleX(-1)', // Mirror the video for better UX
                    display: 'block',
                    margin: '0 auto'
                  }}
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <button
                  onClick={capturePhoto}
                  className="submit-button"
                  style={{ marginTop: '15px', display: 'block', marginLeft: 'auto', marginRight: 'auto' }}
                >
                  Capture Photo
                </button>
              </>
            ) : (
              <div className="camera-loading" style={{ 
                padding: '40px', 
                textAlign: 'center',
                backgroundColor: '#f5f5f5',
                borderRadius: '8px',
                minHeight: '300px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column'
              }}>
                <p style={{ fontSize: '16px', marginBottom: '10px' }}>Initializing camera...</p>
                {error && (
                  <p style={{ color: '#d32f2f', fontSize: '14px', marginTop: '10px' }}>{error}</p>
                )}
                {!error && (
                  <button
                    onClick={startCamera}
                    className="submit-button"
                    style={{ marginTop: '15px' }}
                  >
                    Retry Camera Access
                  </button>
                )}
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

