// Simple server wrapper to ensure the app starts
require('dotenv').config();
const child_process = require('child_process');
const path = require('path');
const fs = require('fs');

// Log all environment variables to debug
console.log('STARTING SERVER WRAPPER');
console.log('Environment variables:');
Object.keys(process.env)
  .filter(key => !key.includes('KEY') && !key.includes('SECRET') && !key.includes('PASSWORD') && !key.includes('TOKEN'))
  .forEach(key => console.log(`${key}: ${process.env[key] || 'undefined'}`));

// Create a function to test MySQL connection directly
async function testDatabaseConnection() {
  try {
    console.log('Testing direct MySQL connection...');
    const mysql = require('mysql2/promise');
    
    const connectionConfig = {
      host: 'mysql.railway.internal',
      user: 'root',
      password: 'QmoWNRzccHMRSNcYxciNpmMNhhMhxdvp',
      database: 'railway',
      port: 3306
    };
    
    console.log('Connecting to MySQL with:', {
      host: connectionConfig.host,
      user: connectionConfig.user,
      database: connectionConfig.database,
      port: connectionConfig.port
    });
    
    const connection = await mysql.createConnection(connectionConfig);
    console.log('Direct MySQL connection successful!');
    
    // Try to create a simple table as a test
    console.log('Testing query execution...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS connection_test (
        id INT AUTO_INCREMENT PRIMARY KEY,
        test_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await connection.execute(`
      INSERT INTO connection_test (id) VALUES (NULL)
    `);
    
    const [rows] = await connection.execute('SELECT * FROM connection_test');
    console.log('Query successful, found records:', rows.length);
    
    await connection.end();
    return true;
  } catch (error) {
    console.error('Direct MySQL connection test failed:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error number:', error.errno);
    console.error('Error stack:', error.stack);
    return false;
  }
}

// Run the test
(async () => {
  console.log('Running database connection test...');
  const result = await testDatabaseConnection();
  console.log('Database test result:', result ? 'SUCCESS' : 'FAILED');
  
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
      cwd: __dirname,
      env: {
        ...process.env,
        // Explicitly set MySQL environment variables
        MYSQLHOST: 'mysql.railway.internal',
        MYSQLUSER: 'root',
        MYSQLPASSWORD: 'QmoWNRzccHMRSNcYxciNpmMNhhMhxdvp',
        MYSQLDATABASE: 'railway',
        MYSQLPORT: '3306'
      }
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
})(); 