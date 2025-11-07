// API configuration
// In production (Vercel), API calls go to /api which routes to backend
// In development, use the proxy or direct localhost URL
export const API_URL = import.meta.env.VITE_API_URL || '';

// Helper function to get the full API URL
export const getApiUrl = (endpoint) => {
  if (API_URL) {
    return `${API_URL}${endpoint}`;
  }
  // In production on Vercel, use relative URLs (they'll route to /api)
  // In development, vite proxy handles it
  return endpoint;
};

