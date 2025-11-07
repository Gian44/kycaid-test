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

