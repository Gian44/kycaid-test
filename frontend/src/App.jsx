import { useState } from 'react'
import './App.css'
import ModeToggle from './components/ModeToggle'
import IDUpload from './components/IDUpload'
import FaceVerification from './components/FaceVerification'
import ApplicantForm from './components/ApplicantForm'
import DocumentUpload from './components/DocumentUpload'
import VerificationPanel from './components/VerificationPanel'
import ApplicantDetails from './components/ApplicantDetails'

function App() {
  const [currentStep, setCurrentStep] = useState(1)
  const [applicantId, setApplicantId] = useState(null)
  const [fileIds, setFileIds] = useState([])
  const [documentIds, setDocumentIds] = useState([])
  const [addressId, setAddressId] = useState(null)
  const [verificationId, setVerificationId] = useState(null)
  const [mode, setMode] = useState('test')
  
  // New state for ID upload and face verification
  const [idExtractionData, setIdExtractionData] = useState(null)
  const [faceVerificationData, setFaceVerificationData] = useState(null)

  const resetWorkflow = () => {
    setCurrentStep(1)
    setApplicantId(null)
    setFileIds([])
    setDocumentIds([])
    setAddressId(null)
    setVerificationId(null)
    setIdExtractionData(null)
    setFaceVerificationData(null)
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>KYCAID Testing Application</h1>
        <ModeToggle mode={mode} setMode={setMode} />
      </header>

      <main className="App-main">
        <div className="workflow-steps">
          <div className={`step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
            1. Upload ID & Extract Data
          </div>
          <div className={`step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
            2. Capture Selfie
          </div>
          <div className={`step ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}>
            3. Review Your Information
          </div>
          <div className={`step ${currentStep >= 4 ? 'active' : ''} ${currentStep > 4 ? 'completed' : ''}`}>
            4. Additional Documents (Optional)
          </div>
          <div className={`step ${currentStep >= 5 ? 'active' : ''} ${currentStep > 5 ? 'completed' : ''}`}>
            5. Complete Verification
          </div>
        </div>

        <div className="content">
          {currentStep === 1 && (
            <IDUpload
              onExtractionComplete={(data) => {
                setIdExtractionData(data)
                setCurrentStep(2)
              }}
            />
          )}

          {currentStep === 2 && idExtractionData && (
            <FaceVerification
              idFileId={idExtractionData.idFileId}
              onVerificationComplete={(data) => {
                setFaceVerificationData(data)
                setCurrentStep(3)
              }}
              onBack={() => setCurrentStep(1)}
            />
          )}

          {currentStep === 3 && idExtractionData && faceVerificationData && (
            <>
              <ApplicantForm
                initialData={idExtractionData.extractedData}
                idFileId={idExtractionData.idFileId}
                documentType={idExtractionData.documentType}
                selfieFileId={faceVerificationData.selfieFileId}
                onSuccess={(id, addrId) => {
                  setApplicantId(id)
                  if (addrId) setAddressId(addrId)
                  setCurrentStep(4)
                }}
              />
            </>
          )}

          {currentStep === 4 && applicantId && (
            <>
              <ApplicantDetails applicantId={applicantId} />
              <DocumentUpload
                applicantId={applicantId}
                fileIds={fileIds}
                setFileIds={setFileIds}
                documentIds={documentIds}
                setDocumentIds={setDocumentIds}
                onNext={() => setCurrentStep(5)}
                onSkip={() => setCurrentStep(5)}
              />
            </>
          )}

          {currentStep === 5 && applicantId && (
            <>
              <ApplicantDetails applicantId={applicantId} />
              <VerificationPanel
                applicantId={applicantId}
                verificationId={verificationId}
                setVerificationId={setVerificationId}
                onBack={() => setCurrentStep(4)}
                onReset={resetWorkflow}
              />
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default App

