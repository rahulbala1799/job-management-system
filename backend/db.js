const mysql = require('mysql2/promise');
require('dotenv').config();

// For debugging
console.log('==========================================');
console.log('RAILWAY DATABASE CONNECTION DIAGNOSTICS');
console.log('==========================================');

// Log all non-sensitive environment variables
console.log('Environment variables:');
Object.keys(process.env)
  .filter(key => !key.includes('KEY') && !key.includes('SECRET') && !key.includes('PASSWORD') && !key.includes('TOKEN'))
  .forEach(key => console.log(`${key}: ${process.env[key] || 'undefined'}`));

// Try to get database connection info from MYSQL_URL first (Railway format)
let connectionConfig = null;

// Option 1: Try MYSQL_URL (Railway format)
if (process.env.MYSQL_URL) {
  console.log('Found MYSQL_URL, trying to parse it');
  try {
    const url = new URL(process.env.MYSQL_URL);
    connectionConfig = {
      host: url.hostname,
      user: url.username,
      password: url.password,
      database: url.pathname.substring(1) || 'railway',
      port: url.port || 3306
    };
    console.log('Successfully parsed MYSQL_URL');
  } catch (error) {
    console.error('Failed to parse MYSQL_URL:', error.message);
  }
}

// Option 2: Try MYSQL_PUBLIC_URL (Railway public format, if available)
if (!connectionConfig && process.env.MYSQL_PUBLIC_URL) {
  console.log('Found MYSQL_PUBLIC_URL, trying to parse it');
  try {
    const url = new URL(process.env.MYSQL_PUBLIC_URL);
    connectionConfig = {
      host: url.hostname, 
      user: process.env.MYSQLUSER || 'root',
      password: process.env.MYSQLPASSWORD || '',
      database: process.env.MYSQLDATABASE || 'railway',
      port: url.port || 3306
    };
    console.log('Successfully parsed MYSQL_PUBLIC_URL');
  } catch (error) {
    console.error('Failed to parse MYSQL_PUBLIC_URL:', error.message);
  }
}

// Option 3: Use individual env vars (MYSQLHOST, etc.)
if (!connectionConfig && process.env.MYSQLHOST) {
  console.log('Using individual MYSQL* environment variables');
  connectionConfig = {
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || '',
    database: process.env.MYSQLDATABASE || 'railway',
    port: process.env.MYSQLPORT || 3306
  };
}

// Option 4: Fallback to legacy DB_* variables
if (!connectionConfig && process.env.DB_HOST) {
  console.log('Using legacy DB_* environment variables');
  connectionConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'job_management',
    port: process.env.DB_PORT || 3306
  };
}

// Option 5: Last resort - localhost
if (!connectionConfig) {
  console.log('No DB configuration found, using localhost defaults');
  connectionConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'railway',
    port: 3306
  };
}

// Pool configuration
const config = {
  ...connectionConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

console.log('Using database connection config:');
console.log('Host:', config.host);
console.log('User:', config.user);
console.log('Database:', config.database);
console.log('Port:', config.port);
console.log('==========================================');

// Create a pool
const pool = mysql.createPool(config);

// Test the connection and handle errors gracefully
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connection established successfully');
    connection.release();
  } catch (err) {
    console.error('❌ Failed to establish database connection:', err.message);
    if (err.code) console.error('Error code:', err.code);
    if (err.errno) console.error('Error number:', err.errno);
    if (err.sqlState) console.error('SQL state:', err.sqlState);
    if (err.sqlMessage) console.error('SQL message:', err.sqlMessage);
    // Don't exit process, let server continue
  }
})();

// Helper function to execute queries
async function query(sql, params) {
  try {
    console.log('Executing query:', sql.substring(0, 100), params ? 'with params' : 'without params');
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error.message);
    console.error('Query:', sql);
    console.error('Parameters:', params);
    if (error.code) console.error('Error code:', error.code);
    if (error.errno) console.error('Error number:', error.errno);
    if (error.sqlState) console.error('SQL state:', error.sqlState);
    if (error.sqlMessage) console.error('SQL message:', error.sqlMessage);
    throw error;
  }
}

module.exports = { query, pool }; 