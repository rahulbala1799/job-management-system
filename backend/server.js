require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const fs = require('fs');

const app = express();

// Environment variables
const PORT = process.env.PORT || 5001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

// Middleware
app.use(cors({
  origin: '*', // Allow requests from any origin
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint MUST come before any other routes to ensure it works
// even if there are errors elsewhere
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Server is running'
  });
});

// Import routes safely with try/catch to avoid crashing if files are missing
let userRoutes, productRoutes, jobRoutes, customerRoutes, invoiceRoutes, 
    jobCostingRoutes, attendanceRoutes, finishedProductRoutes, setupRoutes;

// Setup routes first (most important)
try {
  setupRoutes = require('./routes/setupRoutes');
  app.use('/api/setup', setupRoutes);
} catch (error) {
  console.warn('Warning: setupRoutes not found or error loading:', error.message);
  app.use('/api/setup', express.Router());
}

try {
  userRoutes = require('./routes/userRoutes');
  app.use('/api/users', userRoutes);
} catch (error) {
  console.warn('Warning: userRoutes not found or error loading:', error.message);
  // Create empty router to avoid app crash
  app.use('/api/users', express.Router());
}

try {
  productRoutes = require('./routes/productRoutes');
  app.use('/api/products', productRoutes);
} catch (error) {
  console.warn('Warning: productRoutes not found or error loading:', error.message);
  app.use('/api/products', express.Router());
}

try {
  jobRoutes = require('./routes/jobRoutes');
  app.use('/api/jobs', jobRoutes);
} catch (error) {
  console.warn('Warning: jobRoutes not found or error loading:', error.message);
  app.use('/api/jobs', express.Router());
}

try {
  customerRoutes = require('./routes/customerRoutes');
  app.use('/api/customers', customerRoutes);
} catch (error) {
  console.warn('Warning: customerRoutes not found or error loading:', error.message);
  app.use('/api/customers', express.Router());
}

try {
  invoiceRoutes = require('./routes/invoiceRoutes');
  app.use('/api/invoices', invoiceRoutes);
} catch (error) {
  console.warn('Warning: invoiceRoutes not found or error loading:', error.message);
  app.use('/api/invoices', express.Router());
}

try {
  jobCostingRoutes = require('./routes/jobCostingRoutes');
  app.use('/api/job-costing', jobCostingRoutes);
} catch (error) {
  console.warn('Warning: jobCostingRoutes not found or error loading:', error.message);
  app.use('/api/job-costing', express.Router());
}

// These files don't exist yet but are included in the server.js file
try {
  attendanceRoutes = require('./routes/attendanceRoutes');
  app.use('/api/attendance', attendanceRoutes);
} catch (error) {
  console.warn('Warning: attendanceRoutes not found or error loading:', error.message);
  app.use('/api/attendance', express.Router());
}

try {
  finishedProductRoutes = require('./routes/finishedProductRoutes');
  app.use('/api/finished-products', finishedProductRoutes);
} catch (error) {
  console.warn('Warning: finishedProductRoutes not found or error loading:', error.message);
  app.use('/api/finished-products', express.Router());
}

// Test DB connection - non-blocking
(async () => {
  try {
    await db.query('SELECT 1');
    console.log('Successfully connected to MySQL database');
  } catch (err) {
    console.error('Error connecting to MySQL:', err);
  }
})();

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  // First check if frontend/build directory exists
  const frontendBuildPath = path.join(__dirname, '../frontend/build');
  
  try {
    if (fs.existsSync(frontendBuildPath) && fs.existsSync(path.join(frontendBuildPath, 'index.html'))) {
      // Directory and index.html exist, serve static files
      app.use(express.static(frontendBuildPath));
      
      // For any request that doesn't match an API route, serve the React app
      app.get('*', (req, res) => {
        res.sendFile(path.join(frontendBuildPath, 'index.html'));
      });
      
      console.log('Running in production mode - serving static files from', frontendBuildPath);
    } else {
      // Frontend build doesn't exist, just serve API
      console.log('Frontend build not found at', frontendBuildPath);
      console.log('Running in API-only mode');
      
      // Provide a simple response for the root path
      app.get('/', (req, res) => {
        res.send('Job Management API is running - Frontend not available');
      });
    }
  } catch (error) {
    console.error('Error checking frontend build:', error);
    // Fallback to API-only mode
    app.get('/', (req, res) => {
      res.send('Job Management API is running - Error checking frontend');
    });
  }
} else {
  // Basic route for development
  app.get('/', (req, res) => {
    res.send('Job Management API is running');
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Export pool for use in routes
app.locals.db = db.pool;

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
}); 