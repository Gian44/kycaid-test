require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
// Use /tmp in Vercel serverless, uploads/ in local dev
const uploadDir = process.env.VERCEL ? '/tmp' : path.join(__dirname, 'uploads');
const upload = multer({ 
  dest: uploadDir,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit (Vercel has 4.5MB body limit, but we'll handle that)
  }
});

// API mode state (test or prod)
let currentMode = 'test'; // default to test mode

// Helper function to get current API key
const getApiKey = () => {
  return currentMode === 'test' ? process.env.TEST_API_KEY : process.env.PROD_API_KEY;
};

// Helper function to make KYCAID API requests
const kycaidRequest = async (method, endpoint, data = null, headers = {}) => {
  try {
    const config = {
      method,
      url: `https://api.kycaid.com${endpoint}`,
      headers: {
        'Authorization': `Token ${getApiKey()}`,
        ...headers
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error('KYCAID API Error:', error.response?.data || error.message);
    throw error;
  }
};

// Routes

// Get current configuration
app.get('/api/config', (req, res) => {
  res.json({ 
    mode: currentMode,
    apiKeySet: !!getApiKey()
  });
});

// Set API mode
app.post('/api/config/mode', (req, res) => {
  const { mode } = req.body;
  if (mode === 'test' || mode === 'prod') {
    currentMode = mode;
    res.json({ 
      success: true, 
      mode: currentMode 
    });
  } else {
    res.status(400).json({ 
      error: 'Invalid mode. Must be "test" or "prod"' 
    });
  }
});

// Create applicant
app.post('/api/applicants', async (req, res) => {
  try {
    const data = await kycaidRequest('POST', '/applicants', req.body, {
      'Content-Type': 'application/json'
    });
    res.json(data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data || { message: error.message }
    });
  }
});

// Get applicant
app.get('/api/applicants/:id', async (req, res) => {
  try {
    const data = await kycaidRequest('GET', `/applicants/${req.params.id}`);
    res.json(data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data || { message: error.message }
    });
  }
});

// Upload file
app.post('/api/files', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Create form data for KYCAID
    const formData = new FormData();
    formData.append('file', fs.createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: req.file.mimetype
    });

    // Upload to KYCAID
    const response = await axios.post('https://api.kycaid.com/files', formData, {
      headers: {
        'Authorization': `Token ${getApiKey()}`,
        ...formData.getHeaders()
      }
    });

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json(response.data);
  } catch (error) {
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('File upload error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || { message: error.message }
    });
  }
});

// Create document
app.post('/api/documents', async (req, res) => {
  try {
    const data = await kycaidRequest('POST', '/documents', req.body, {
      'Content-Type': 'application/json'
    });
    res.json(data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data || { message: error.message }
    });
  }
});

// Get document
app.get('/api/documents/:id', async (req, res) => {
  try {
    const data = await kycaidRequest('GET', `/documents/${req.params.id}`);
    res.json(data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data || { message: error.message }
    });
  }
});

// Create address
app.post('/api/addresses', async (req, res) => {
  try {
    const data = await kycaidRequest('POST', '/addresses', req.body, {
      'Content-Type': 'application/json'
    });
    res.json(data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data || { message: error.message }
    });
  }
});

// Create verification
app.post('/api/verifications', async (req, res) => {
  try {
    const data = await kycaidRequest('POST', '/verifications', req.body, {
      'Content-Type': 'application/json'
    });
    res.json(data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data || { message: error.message }
    });
  }
});

// Get verification
app.get('/api/verifications/:id', async (req, res) => {
  try {
    const data = await kycaidRequest('GET', `/verifications/${req.params.id}`);
    res.json(data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data || { message: error.message }
    });
  }
});

// Get countries list
app.get('/api/countries', async (req, res) => {
  try {
    const data = await kycaidRequest('GET', '/countries');
    res.json(data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data || { message: error.message }
    });
  }
});

// Document recognition service
// Note: KYCAID's document recognition requires creating a document with an applicant
// We'll create a temporary applicant, attach the document, retrieve the OCR data, then delete it
app.post('/api/services/document-recognition', async (req, res) => {
  try {
    const { file_id, document_type } = req.body;
    
    if (!file_id || !document_type) {
      return res.status(400).json({
        error: { message: 'file_id and document_type are required' }
      });
    }

    let tempApplicantId = null;
    let tempDocumentId = null;

    try {
      // Map document types to KYCAID valid types
      // Valid KYCAID types according to https://docs-v1.kycaid.com/#verification-types:
      // GOVERNMENT_ID, PASSPORT, DRIVERS_LICENSE, DOMESTIC_PASSPORT,
      // PERMANENT_RESIDENCE_PERMIT, REFUGEE_CARD, FOREIGN_CITIZEN_PASSPORT, TAX_ID_NUMBER
      const documentTypeMap = {
        'DRIVERS_LICENSE': 'DRIVERS_LICENSE',
        'GOVERNMENT_ID': 'GOVERNMENT_ID',
        'PASSPORT': 'PASSPORT',
        'PERMANENT_RESIDENCE_PERMIT': 'PERMANENT_RESIDENCE_PERMIT',
        // Legacy mappings for backwards compatibility
        'DRIVERS': 'DRIVERS_LICENSE',
        'ID_CARD': 'GOVERNMENT_ID',
        'RESIDENCE_PERMIT': 'PERMANENT_RESIDENCE_PERMIT'
      };

      const validDocumentType = documentTypeMap[document_type] || 'GOVERNMENT_ID';
      console.log('Requested document type:', document_type);
      console.log('Mapped to valid KYCAID type:', validDocumentType);

      // Step 1: Create a temporary applicant for OCR processing
      const tempApplicant = await kycaidRequest('POST', '/applicants', {
        type: 'PERSON',
        first_name: 'Temp',
        last_name: 'OCR',
        email: `temp-ocr-${Date.now()}@example.com`
      }, {
        'Content-Type': 'application/json'
      });

      tempApplicantId = tempApplicant.applicant_id;
      console.log('Created temp applicant for OCR:', tempApplicantId);

      // Step 2: Create document with the temp applicant
      const document = await kycaidRequest('POST', '/documents', {
        applicant_id: tempApplicantId,
        type: validDocumentType,
        front_side_id: file_id
      }, {
        'Content-Type': 'application/json'
      });

      tempDocumentId = document.document_id;
      console.log('Created temp document for OCR:', tempDocumentId);

      // Step 3: Retrieve the document to check for extracted data
      // Note: KYCAID's OCR processing happens asynchronously during verification
      // For immediate extraction, we need to wait for verification to complete (2 min - 6 hours)
      // For now, we'll return what we can get immediately
      const documentData = await kycaidRequest('GET', `/documents/${tempDocumentId}`);
      const applicantData = await kycaidRequest('GET', `/applicants/${tempApplicantId}`);
      
      console.log('Full applicant data received:', JSON.stringify(applicantData, null, 2));
      console.log('Full document data received:', JSON.stringify(documentData, null, 2));
      
      // Note: OCR data extraction happens during full verification which requires:
      // 1. An applicant with first_name, last_name, dob, residence_country
      // 2. A document with type (DRIVERS_LICENSE, GOVERNMENT_ID, etc.) and front_side_id
      // 3. A SELFIE document with type SELFIE_IMAGE and front_side_id
      // 4. Creating a verification with the applicant_id
      // The verification takes 2 minutes to 6 hours to complete
      
      // Extract data from both applicant and document objects
      const ocrData = {
        // Person data from applicant object
        first_name: applicantData.first_name || applicantData.firstName || '',
        last_name: applicantData.last_name || applicantData.lastName || '',
        dob: applicantData.dob || applicantData.date_of_birth || applicantData.dateOfBirth || '',
        email: applicantData.email || '',
        phone: applicantData.phone || '',
        residence_country: applicantData.residence_country || 'US',
        
        // Document-specific fields
        document_number: documentData.document_number || documentData.number || documentData.documentNumber || '',
        issue_date: documentData.issue_date || documentData.issueDate || '',
        expiry_date: documentData.expiry_date || documentData.expiryDate || '',
        
        // Address fields if available
        address: null,
        street_name: '',
        building_number: '',
        city: '',
        state: '',
        postal_code: '',
        country: applicantData.residence_country || 'US'
      };

      console.log('Extracted OCR data:', JSON.stringify(ocrData, null, 2));

      // Return the OCR data
      res.json(ocrData);

    } catch (error) {
      console.error('OCR processing error:', error.response?.data || error.message);
      
      // Return empty data if OCR fails, don't block the workflow
      res.json({
        first_name: '',
        last_name: '',
        dob: '',
        document_number: '',
        issue_date: '',
        expiry_date: '',
        address: null,
        ocr_note: 'Automatic data extraction not available. Please enter information manually.'
      });
    } finally {
      // Cleanup: Delete temporary document and applicant
      // Note: In test mode, temp applicants are auto-cleaned, but we'll try to delete anyway
      try {
        if (tempDocumentId) {
          await kycaidRequest('DELETE', `/documents/${tempDocumentId}`);
          console.log('Deleted temp document:', tempDocumentId);
        }
      } catch (cleanupErr) {
        console.warn('Failed to delete temp document:', cleanupErr.message);
      }

      // Note: KYCAID may not allow deleting applicants via API
      // Temp applicants in test mode are typically auto-cleaned after 24 hours
    }
  } catch (error) {
    console.error('Document recognition error:', error);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || { message: error.message }
    });
  }
});

// Note: Face verification is handled automatically by KYCAID during the verification process
// when both ID document and SELFIE document are uploaded. No separate endpoint needed.

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', mode: currentMode });
});

// Create uploads directory if it doesn't exist (only for local dev)
if (!process.env.VERCEL) {
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
  }
}

// Only listen on port if not in Vercel production environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Current mode: ${currentMode}`);
    console.log(`Test API Key: ${process.env.TEST_API_KEY ? 'Set' : 'Not set'}`);
    console.log(`Prod API Key: ${process.env.PROD_API_KEY ? 'Set' : 'Not set'}`);
  });
}

// Export for Vercel serverless functions
module.exports = app;

