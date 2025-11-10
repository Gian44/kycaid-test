import { useState, useRef, useEffect } from 'react'
import axios from 'axios'

function FaceVerification({ idFileId, onVerificationComplete, onBack }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [verificationStatus, setVerificationStatus] = useState(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [capturedImage, setCapturedImage] = useState(null)
  const [debugInfo, setDebugInfo] = useState([])
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const canvasRef = useRef(null)
  const initializingRef = useRef(false)

  const addDebugInfo = (message) => {
    console.log('Camera Debug:', message)
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  useEffect(() => {
    // Initialize camera when component mounts
    // Delay to ensure video element ref is set
    const timer = setTimeout(() => {
      if (videoRef.current) {
        addDebugInfo('Video element found, starting camera')
        startCamera()
      } else {
        addDebugInfo('Video element not found, will retry')
        // Retry after another delay
        setTimeout(() => {
          if (videoRef.current) {
            startCamera()
          } else {
            setError('Video element failed to initialize. Please click Retry.')
          }
        }, 500)
      }
    }, 200)
    
    return () => {
      clearTimeout(timer)
      // Cleanup: stop camera stream when component unmounts
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    if (initializingRef.current) {
      addDebugInfo('Already initializing, skipping...')
      return
    }

    initializingRef.current = true
    addDebugInfo('Starting camera initialization')
    setError(null)
    setCameraReady(false)
    
    try {
      // Stop any existing stream first
      stopCamera()
      
      addDebugInfo('Requesting camera permission...')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      })
      
      addDebugInfo('Camera permission granted, got stream')
      streamRef.current = stream
      
      // Wait a bit for video element to be ready
      await new Promise(resolve => setTimeout(resolve, 100))
      
      if (!videoRef.current) {
        addDebugInfo('ERROR: Video element not found')
        throw new Error('Video element not available')
      }
      
      const video = videoRef.current
      addDebugInfo('Setting stream to video element')
      video.srcObject = stream
      
      // Set video attributes
      video.muted = true
      video.playsInline = true
      video.autoplay = true
      
      addDebugInfo('Attempting to play video...')
      
      // Wait for video to load
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Video load timeout'))
        }, 5000)
        
        video.onloadedmetadata = () => {
          addDebugInfo('Video metadata loaded')
          clearTimeout(timeout)
          resolve()
        }
        
        video.onerror = (e) => {
          addDebugInfo(`Video error: ${e}`)
          clearTimeout(timeout)
          reject(new Error('Video load error'))
        }
      })
      
      // Play the video
      addDebugInfo('Playing video...')
      await video.play()
      
      addDebugInfo('SUCCESS: Camera is ready!')
      setCameraReady(true)
      initializingRef.current = false
      
    } catch (err) {
      initializingRef.current = false
      console.error('Error accessing camera:', err)
      addDebugInfo(`ERROR: ${err.message}`)
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission denied. Please allow camera access in your browser settings.')
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera found. Please ensure a camera is connected.')
      } else if (err.message === 'Video load timeout') {
        setError('Camera is taking too long to start. Please refresh and try again.')
      } else {
        setError(`Camera error: ${err.message}`)
      }
      setCameraReady(false)
    }
  }

  const stopCamera = () => {
    addDebugInfo('Stopping camera')
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
        addDebugInfo(`Stopped track: ${track.kind}`)
      })
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    initializingRef.current = false
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
    if (!capturedImage) {
      setError('Please capture a photo first')
      return
    }

    setLoading(true)
    setError(null)
    setVerificationStatus(null)
    addDebugInfo('Starting selfie upload process')

    try {
      // Step 1: Upload selfie file
      addDebugInfo('Uploading selfie image...')
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
      addDebugInfo(`Selfie uploaded successfully. File ID: ${selfieFileId}`)

      // Step 2: Selfie uploaded successfully
      // KYCAID will handle face verification when verification is created
      setVerificationStatus({
        status: 'selfie_uploaded',
        message: 'Selfie captured and uploaded successfully. Face verification will be performed during the verification process.'
      })

      addDebugInfo('Proceeding to applicant form...')
      
      // Pass the selfie file ID to the next step
      onVerificationComplete({
        selfieFileId: selfieFileId
      })

    } catch (err) {
      addDebugInfo(`ERROR: ${err.message}`)
      setError(err.response?.data?.error?.message || err.message || 'Failed to upload selfie')
      console.error('Error uploading selfie:', err)
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
            {/* Video element always rendered but hidden when not ready */}
            <div style={{ position: 'relative' }}>
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
                  display: cameraReady ? 'block' : 'none',
                  margin: '0 auto'
                }}
              />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              
              {/* Loading/Error overlay */}
              {!cameraReady && (
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
                  <p style={{ fontSize: '16px', marginBottom: '10px' }}>
                    {error ? 'Camera initialization failed' : 'Initializing camera...'}
                  </p>
                  {error && (
                    <p style={{ color: '#d32f2f', fontSize: '14px', marginTop: '10px', marginBottom: '10px' }}>{error}</p>
                  )}
                  <button
                    onClick={startCamera}
                    className="submit-button"
                    style={{ marginTop: '15px' }}
                  >
                    {error ? 'Retry Camera Access' : 'Start Camera'}
                  </button>
                  
                  {/* Debug information */}
                  <details style={{ marginTop: '20px', textAlign: 'left', maxWidth: '500px' }}>
                    <summary style={{ cursor: 'pointer', fontSize: '12px', color: '#666' }}>
                      Show Debug Info
                    </summary>
                    <div style={{ 
                      marginTop: '10px', 
                      padding: '10px', 
                      backgroundColor: '#fff',
                      borderRadius: '4px',
                      maxHeight: '200px',
                      overflow: 'auto',
                      fontSize: '11px',
                      fontFamily: 'monospace'
                    }}>
                      {debugInfo.length === 0 ? (
                        <p>No debug information yet</p>
                      ) : (
                        debugInfo.map((info, idx) => (
                          <div key={idx} style={{ marginBottom: '4px' }}>{info}</div>
                        ))
                      )}
                    </div>
                  </details>
                </div>
              )}
            </div>
            
            {/* Capture button - only show when camera is ready */}
            {cameraReady && (
              <button
                onClick={capturePhoto}
                className="submit-button"
                style={{ marginTop: '15px', display: 'block', marginLeft: 'auto', marginRight: 'auto' }}
              >
                Capture Photo
              </button>
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
                {loading ? 'Uploading Selfie...' : 'Continue with This Selfie'}
              </button>
            </div>
          </div>
        )}

        {error && <div className="error-message">{error}</div>}

        {verificationStatus && verificationStatus.status === 'selfie_uploaded' && (
          <div className="success-message" style={{ marginTop: '15px' }}>
            <p>{verificationStatus.message}</p>
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

