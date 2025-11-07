import { useState } from 'react'
import './App.css'
import ModeToggle from './components/ModeToggle'
import ApplicantForm from './components/ApplicantForm'
import DocumentUpload from './components/DocumentUpload'
import AddressForm from './components/AddressForm'
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

  const resetWorkflow = () => {
    setCurrentStep(1)
    setApplicantId(null)
    setFileIds([])
    setDocumentIds([])
    setAddressId(null)
    setVerificationId(null)
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
            1. Create Applicant
          </div>
          <div className={`step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
            2. Upload Documents
          </div>
          <div className={`step ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}>
            3. Add Address
          </div>
          <div className={`step ${currentStep >= 4 ? 'active' : ''} ${currentStep > 4 ? 'completed' : ''}`}>
            4. Verify
          </div>
        </div>

        <div className="content">
          {currentStep === 1 && (
            <ApplicantForm
              onSuccess={(id) => {
                setApplicantId(id)
                setCurrentStep(2)
              }}
            />
          )}

          {currentStep === 2 && applicantId && (
            <>
              <ApplicantDetails applicantId={applicantId} />
              <DocumentUpload
                applicantId={applicantId}
                fileIds={fileIds}
                setFileIds={setFileIds}
                documentIds={documentIds}
                setDocumentIds={setDocumentIds}
                onNext={() => setCurrentStep(3)}
              />
            </>
          )}

          {currentStep === 3 && applicantId && (
            <>
              <ApplicantDetails applicantId={applicantId} />
              <AddressForm
                applicantId={applicantId}
                onSuccess={(id) => {
                  setAddressId(id)
                  setCurrentStep(4)
                }}
                onBack={() => setCurrentStep(2)}
              />
            </>
          )}

          {currentStep === 4 && applicantId && (
            <>
              <ApplicantDetails applicantId={applicantId} />
              <VerificationPanel
                applicantId={applicantId}
                verificationId={verificationId}
                setVerificationId={setVerificationId}
                onBack={() => setCurrentStep(3)}
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

