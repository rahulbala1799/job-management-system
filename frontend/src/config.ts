// Determine if we're running on Railway or locally
// If we're on the same domain (Railway deployment), use relative /api path
// Otherwise use the absolute Railway URL for local development
const isLocalDevelopment = !window.location.host.includes('railway.app');

// Railway production URL - this ensures API calls work both in prod and local dev
const RAILWAY_API_URL = 'https://web-production-d2fc6.up.railway.app/api';

export const API_BASE_URL = isLocalDevelopment && process.env.NODE_ENV === 'development' 
  ? RAILWAY_API_URL  // Use Railway URL in local development
  : '/api';          // Use relative path in production

console.log('API_BASE_URL:', API_BASE_URL);

export const ENDPOINTS = {
  LOGIN: `${API_BASE_URL}/users/login`,
  REGISTER: `${API_BASE_URL}/users/register`,
  USERS: `${API_BASE_URL}/users`,
  
  // Add all the endpoints needed for the dashboard
  CUSTOMERS: `${API_BASE_URL}/customers`,
  PRODUCTS: `${API_BASE_URL}/products`, 
  JOBS: `${API_BASE_URL}/jobs`,
  JOB_COSTING: `${API_BASE_URL}/job-costing`,
  INVOICES: `${API_BASE_URL}/invoices`,
  OVERVIEW: `${API_BASE_URL}/jobs/overview`,
}; 