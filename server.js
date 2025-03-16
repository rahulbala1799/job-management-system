// Simple server wrapper to ensure the app starts
require('dotenv').config();
const child_process = require('child_process');
const path = require('path');

// Log all environment variables to debug
console.log('STARTING SERVER WRAPPER');
console.log('Environment variables:');
Object.keys(process.env)
  .filter(key => !key.includes('KEY') && !key.includes('SECRET') && !key.includes('PASSWORD') && !key.includes('TOKEN'))
  .forEach(key => console.log(`${key}: ${process.env[key] || 'undefined'}`));

// First try to initialize the database
try {
  console.log('Initializing database first...');
  child_process.execSync('node backend/init-db.js', {
    stdio: 'inherit',
    cwd: __dirname
  });
  console.log('Database initialization complete.');
} catch (error) {
  console.error('Database initialization failed, but continuing:', error.message);
}

// Then start the actual server
try {
  console.log('Starting main server...');
  // Start the main server process
  const serverProcess = child_process.spawn('node', ['backend/server.js'], {
    stdio: 'inherit',
    cwd: __dirname
  });

  // Handle server events
  serverProcess.on('exit', (code) => {
    console.log(`Backend server exited with code ${code}`);
    process.exit(code);
  });

  // Handle errors
  serverProcess.on('error', (err) => {
    console.error('Failed to start backend server:', err);
    process.exit(1);
  });

  // Handle termination signals
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down...');
    serverProcess.kill('SIGTERM');
  });

  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down...');
    serverProcess.kill('SIGINT');
  });
} catch (error) {
  console.error('Error starting server:', error.message);
  process.exit(1);
} 