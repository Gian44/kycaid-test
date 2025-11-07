# Deployment Guide

## Deploying to Vercel

This guide will help you deploy the KYCAID Testing Application to Vercel.

### Prerequisites

- Vercel account (sign up at https://vercel.com)
- Git repository (optional but recommended)

## Option 1: Deploy via Vercel CLI

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Deploy Backend

```bash
cd backend
vercel
```

Follow the prompts:
- Set up and deploy: Y
- Which scope: Select your account
- Link to existing project: N
- Project name: kycaid-backend (or your choice)
- Directory: ./
- Override settings: N

After deployment, note your backend URL (e.g., `https://kycaid-backend.vercel.app`)

**Set Environment Variables:**
```bash
vercel env add TEST_API_KEY
# Enter: 8cbee1d11cc1314f1109fff62d1bf444fde7

vercel env add PROD_API_KEY
# Enter: b48bfcea1adae142390b39163284cfa567bf

vercel env add PORT
# Enter: 5000
```

Redeploy to apply environment variables:
```bash
vercel --prod
```

### Step 3: Update Frontend Configuration

Edit `frontend/vite.config.js` and update the proxy target to your backend URL:

```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://your-backend-url.vercel.app', // Update this
        changeOrigin: true,
      }
    }
  }
})
```

Also create `frontend/.env.production`:
```
VITE_API_URL=https://your-backend-url.vercel.app
```

And update your axios calls to use this env variable, or use a config file.

### Step 4: Deploy Frontend

```bash
cd ../frontend
vercel
```

Follow the same prompts as before.

After deployment, your frontend will be available at a Vercel URL.

## Option 2: Deploy via Vercel Dashboard

### Deploy Backend

1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Import your Git repository (or upload folder)
4. Configure project:
   - **Framework Preset**: Other
   - **Root Directory**: `backend`
   - **Build Command**: (leave empty)
   - **Output Directory**: (leave empty)
   - **Install Command**: `npm install`
5. Add Environment Variables:
   - `TEST_API_KEY`: `8cbee1d11cc1314f1109fff62d1bf444fde7`
   - `PROD_API_KEY`: `b48bfcea1adae142390b39163284cfa567bf`
   - `PORT`: `5000`
6. Click "Deploy"

### Deploy Frontend

1. Create a new project in Vercel
2. Import your repository
3. Configure project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
4. Add Environment Variable:
   - `VITE_API_URL`: (your backend Vercel URL)
5. Click "Deploy"

## Important Notes for Vercel Deployment

### Backend Considerations

1. **Vercel Serverless Functions**: Vercel uses serverless functions. Your Express app needs to be adapted.

Create `backend/api/index.js`:
```javascript
const app = require('../server');
module.exports = app;
```

And update `backend/server.js` to export the app:
```javascript
// At the end of server.js, replace the listen block with:
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
```

Create `backend/vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ]
}
```

2. **File Uploads**: Vercel serverless functions have a 4.5MB body size limit. For production, consider using:
   - Direct upload to S3/Cloud Storage
   - Increase function payload size (Pro plan)

### Frontend Considerations

1. **API URL**: Update axios baseURL in frontend to use environment variable:

Create `frontend/src/config.js`:
```javascript
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
```

Update API calls in components:
```javascript
import { API_URL } from './config';
axios.post(`${API_URL}/api/applicants`, ...)
```

Or configure axios globally in `main.jsx`:
```javascript
import axios from 'axios';
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
```

## ✅ Option 2: Deploy Both as One Project (RECOMMENDED)

**This is already configured!** The project is set up to deploy both frontend and backend together.

### What's Already Done:

1. ✅ `vercel.json` in root - Routes `/api/*` to backend, everything else to frontend
2. ✅ `package.json` in root - Build script for frontend
3. ✅ `backend/server.js` - Exports app for Vercel serverless functions
4. ✅ Frontend components - Use relative URLs (`/api/...`) that work in both dev and production

### Deploy Steps (Via Vercel Website):

1. **Push to GitHub** (if not already):
```bash
git add .
git commit -m "Configure for Vercel deployment"
git push
```

2. **Deploy on Vercel Website**:
   - Go to https://vercel.com
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Configure project settings:
     - **Framework Preset**: Other
     - **Root Directory**: `./` (leave as root)
     - **Build Command**: `cd frontend && npm install && npm run build`
     - **Output Directory**: `frontend/dist`
     - **Install Command**: (leave empty or use `npm install`)
   - Click "Deploy"

3. **Set Environment Variables** (in Vercel Dashboard):
   - Go to your project → Settings → Environment Variables
   - Add these variables:
     - `TEST_API_KEY` = `8cbee1d11cc1314f1109fff62d1bf444fde7`
     - `PROD_API_KEY` = `b48bfcea1adae142390b39163284cfa567bf`
     - `NODE_ENV` = `production`
   - Click "Save"
   - Redeploy (Deployments → ... → Redeploy)

### Deploy Steps (Via Vercel CLI - Alternative):

1. **Install Vercel CLI**:
```bash
npm install -g vercel
```

2. **Deploy from root directory**:
```bash
vercel
```

3. **Set Environment Variables**:
```bash
vercel env add TEST_API_KEY
vercel env add PROD_API_KEY
vercel env add NODE_ENV
```

4. **Redeploy**:
```bash
vercel --prod
```

### How It Works:

- **Frontend**: Built and served as static files
- **Backend**: Runs as serverless functions
- **Routes**: 
  - `/api/*` → Backend serverless function
  - `/*` → Frontend static files
- **API Calls**: Frontend uses relative URLs (`/api/...`) which automatically route to backend

### Benefits:

✅ Single deployment
✅ Single URL for everything
✅ No CORS issues (same origin)
✅ Simpler configuration
✅ Environment variables in one place

## Testing Your Deployment

After deployment:

1. Visit your frontend URL
2. Test mode toggle should work
3. Create a test applicant with John Snow
4. Upload a document
5. Add address
6. Create verification
7. Check verification status

## Troubleshooting

### Backend Issues
- Check Vercel function logs in dashboard
- Verify environment variables are set
- Test API endpoints directly

### Frontend Issues
- Check browser console for errors
- Verify API_URL is correct
- Test in incognito mode to avoid cache issues

### CORS Issues
If you get CORS errors:
- Ensure backend CORS is configured correctly
- Add your frontend domain to allowed origins
- Check Vercel function responses include CORS headers

## Cost Considerations

**Vercel Free Tier includes:**
- 100 GB bandwidth
- Unlimited deployments
- Serverless function executions (100 GB-hours)

**KYCAID Costs:**
- Test mode: Free (with limits)
- Production: Per verification (check KYCAID pricing)

## Security Checklist

- ✅ API keys stored in environment variables
- ✅ .env files in .gitignore
- ✅ Backend validates all inputs
- ✅ HTTPS enabled (automatic on Vercel)
- ✅ CORS properly configured

## Support

For issues:
- Vercel: https://vercel.com/docs
- KYCAID: https://docs-v1.kycaid.com/
- Project GitHub: (your repository URL)

