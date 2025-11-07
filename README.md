# KYCAID Testing Application

A full-stack web application for testing KYCAID API integration. Built with React frontend and Node.js/Express backend.

## 🚀 Quick Start

### 1. Setup API Keys

**Windows:**
```powershell
notepad backend\.env
```

**Mac/Linux:**
```bash
nano backend/.env
```

Add your API keys:
```env
TEST_API_KEY=8cbee1d11cc1314f1109fff62d1bf444fde7
PROD_API_KEY=b48bfcea1adae142390b39163284cfa567bf
PORT=5000
NODE_ENV=development
```

If file doesn't exist, copy from template: `cp backend/env.template backend/.env`

### 2. Start the Application

**Windows:**
```powershell
.\start-dev.ps1
```

**Mac/Linux:**
```bash
chmod +x start-dev.sh && ./start-dev.sh
```

**Or manually (Windows):**
- Terminal 1: `cd backend; npm run dev`
- Terminal 2: `cd frontend; npm run dev`

### 3. Open & Test

- Open: **http://localhost:3000**
- Use **John Snow** (first/last name) for auto-approval in TEST mode
- Complete the workflow: Create Applicant → Upload Document → Add Address → Verify

---

## Features

- ✅ Create applicants with personal information
- ✅ Upload identity documents (Passport, ID Card, Driver's License)
- ✅ Add address information
- ✅ Submit verification requests
- ✅ Real-time verification status tracking
- ✅ Toggle between Test and Production API modes
- ✅ Modern, responsive UI

## Project Structure

```
.
├── backend/          # Node.js/Express API server
│   ├── server.js     # Main server file
│   ├── .env          # Environment variables (API keys)
│   └── package.json
│
├── frontend/         # React application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── App.jsx       # Main app component
│   │   ├── main.jsx      # Entry point
│   │   └── *.css         # Styling
│   ├── index.html
│   └── package.json
│
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file from the template:
   ```bash
   cp env.template .env
   ```
   
   Or manually create `backend/.env` with your API keys:
   ```env
   TEST_API_KEY=8cbee1d11cc1314f1109fff62d1bf444fde7
   PROD_API_KEY=b48bfcea1adae142390b39163284cfa567bf
   PORT=5000
   NODE_ENV=development
   ```
   
   See [SETUP_ENV.md](SETUP_ENV.md) for detailed instructions.

4. Start the backend server:
```bash
npm run dev    # Development mode with auto-reload
# or
npm start      # Production mode
```

The backend server will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## Usage

### Complete KYC Workflow

1. **Create Applicant**
   - Fill in the applicant form with personal information
   - Required fields: First Name, Last Name, Email, Date of Birth, Country

2. **Upload Documents**
   - Select document type (Passport, ID Card, Driver's License)
   - Optionally add document number, issue date, and expiry date
   - Upload document image (JPG, PNG, or PDF)
   - You can upload multiple documents

3. **Add Address**
   - Fill in address information
   - Required fields: Country, City, Postal Code, Street Name, Building Number

4. **Start Verification**
   - Review applicant information
   - Click "Start Verification" to submit to KYCAID
   - Monitor verification status (updates every 10 seconds)

### API Mode Toggle

Switch between Test and Production modes using the toggle in the header:
- **TEST Mode** (Orange): Uses test API key, low priority processing
- **PRODUCTION Mode** (Red): Uses production API key, standard processing

## API Endpoints

The backend proxies the following KYCAID API endpoints:

- `POST /api/applicants` - Create applicant
- `GET /api/applicants/:id` - Get applicant details
- `POST /api/files` - Upload file
- `POST /api/documents` - Create document
- `POST /api/addresses` - Create address
- `POST /api/verifications` - Create verification
- `GET /api/verifications/:id` - Get verification status
- `GET /api/config` - Get current API mode
- `POST /api/config/mode` - Set API mode (test/prod)

## Testing with Test Mode

According to KYCAID documentation, you can use auto-verification in test mode:

### Auto-Approve KYC
- First Name: `John`
- Last Name: `Snow`

### Auto-Decline KYC
- First Name: `John`
- Last Name: `Doe`

## Testing Checklist

- [ ] Backend starts on port 5000
- [ ] Frontend starts on port 3000
- [ ] Can create applicant
- [ ] Can upload document
- [ ] Can add address
- [ ] Can create verification
- [ ] Verification status updates
- [ ] Can toggle test/prod mode

## Troubleshooting

**Port already in use:**
- Windows: `netstat -ano | findstr :5000`
- Mac/Linux: `lsof -i :5000`

**API errors:**
- Verify `.env` file exists with correct keys
- Restart backend server after editing `.env`

**File upload fails:**
- Check file size (max 10MB)
- Verify uploads directory exists

**Frontend won't connect:**
- Ensure backend is running on port 5000
- Check browser console for errors

## Deployment to Vercel

**✅ Recommended: Deploy as Single Project (Option 2)**

The project is already configured to deploy both frontend and backend together!

### Quick Deploy Steps:

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy from root:**
   ```bash
   vercel
   ```

3. **Set environment variables:**
   ```bash
   vercel env add TEST_API_KEY
   vercel env add PROD_API_KEY
   vercel env add NODE_ENV
   ```

4. **Redeploy:**
   ```bash
   vercel --prod
   ```

**See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.**

## Technologies Used

### Backend
- Express.js - Web framework
- Axios - HTTP client for KYCAID API
- Multer - File upload handling
- CORS - Cross-origin resource sharing
- dotenv - Environment variable management

### Frontend
- React 18 - UI library
- Vite - Build tool and dev server
- Axios - HTTP client
- CSS3 - Modern styling with CSS variables

## Security Notes

- API keys are stored only in the backend `.env` file
- Backend acts as a secure proxy to KYCAID API
- Frontend never exposes API keys
- `.env` file is gitignored

## Troubleshooting

### Backend Issues

- **Port already in use**: Change the `PORT` in `.env`
- **API errors**: Verify API keys are correct in `.env`
- **File upload fails**: Check uploads directory permissions

### Frontend Issues

- **Cannot connect to backend**: Ensure backend is running on port 5000
- **Build errors**: Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`

## KYCAID Documentation

For more information about KYCAID API:
- Documentation: https://docs-v1.kycaid.com/
- API Reference: https://docs-v1.kycaid.com/#api-reference

## License

MIT

