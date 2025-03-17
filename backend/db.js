const mysql = require('mysql2/promise');
require('dotenv').config();

// For debugging
console.log('==========================================');
console.log('RAILWAY DATABASE CONNECTION DIAGNOSTICS');
console.log('==========================================');

// Hardcoded Railway MySQL credentials as a last resort
const RAILWAY_MYSQL_CREDENTIALS = {
  host: 'mysql.railway.internal',
  user: 'root',
  password: 'QmoWNRzccHMRSNcYxciNpmMNhhMhxdvp',
  database: 'railway',
  port: 3306
};

// Enhanced logging for all environment variables (filtering out sensitive ones)
console.log('Environment variables:');
Object.keys(process.env)
  .filter(key => !key.includes('KEY') && !key.includes('SECRET') && !key.includes('TOKEN') && !key.includes('PASSWORD'))
  .sort()
  .forEach(key => console.log(`${key}: ${process.env[key] || 'undefined'}`));

// List database-related environment variables separately
console.log('\nDatabase-related environment variables:');
['DATABASE_URL', 'MYSQL_URL', 'MYSQLDATABASE', 'MYSQLHOST', 'MYSQLPASSWORD', 'MYSQLPORT', 'MYSQLUSER', 
 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_PORT'].forEach(key => {
  if (process.env[key]) {
    console.log(`${key}: [Set]`);
  } else {
    console.log(`${key}: [Not set]`);
  }
});

// Try to get database connection info from various sources
let connectionConfig = null;

// Option 1: Try DATABASE_URL (Railway recommended format)
if (process.env.DATABASE_URL) {
  console.log('\nFound DATABASE_URL, trying to parse it');
  try {
    const url = new URL(process.env.DATABASE_URL);
    connectionConfig = {
      host: url.hostname,
      user: url.username,
      password: url.password,
      database: url.pathname.substring(1) || 'railway',
      port: parseInt(url.port) || 3306
    };
    console.log('Successfully parsed DATABASE_URL');
  } catch (error) {
    console.error('Failed to parse DATABASE_URL:', error.message);
  }
}

// Option 2: Try MYSQL_URL (Railway format)
if (!connectionConfig && process.env.MYSQL_URL) {
  console.log('\nFound MYSQL_URL, trying to parse it');
  try {
    const url = new URL(process.env.MYSQL_URL);
    connectionConfig = {
      host: url.hostname,
      user: url.username,
      password: url.password,
      database: url.pathname.substring(1) || 'railway',
      port: parseInt(url.port) || 3306
    };
    console.log('Successfully parsed MYSQL_URL');
  } catch (error) {
    console.error('Failed to parse MYSQL_URL:', error.message);
  }
}

// Option 3: Use individual env vars (MYSQLHOST, etc.)
if (!connectionConfig && process.env.MYSQLHOST) {
  console.log('\nUsing individual MYSQL* environment variables');
  connectionConfig = {
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || '',
    database: process.env.MYSQLDATABASE || 'railway',
    port: parseInt(process.env.MYSQLPORT) || 3306
  };
}

// Option 4: Fallback to legacy DB_* variables
if (!connectionConfig && process.env.DB_HOST) {
  console.log('\nUsing legacy DB_* environment variables');
  connectionConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'job_management',
    port: parseInt(process.env.DB_PORT) || 3306
  };
}

// Option 5: Hardcoded Railway MySQL credentials
if (!connectionConfig) {
  console.log('\nNo DB configuration found in environment, using hardcoded Railway MySQL credentials');
  connectionConfig = RAILWAY_MYSQL_CREDENTIALS;
}

// Pool configuration with improved timeouts and retries
const config = {
  ...connectionConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 30000, // Longer timeout for initial connection
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  timezone: '+00:00',
  multipleStatements: true // Allow multiple statements per query
};

console.log('\nUsing database connection config:');
console.log('Host:', config.host);
console.log('User:', config.user);
console.log('Database:', config.database);
console.log('Port:', config.port);
console.log('==========================================');

// Create a pool with error handlers
const pool = mysql.createPool(config);

// Testing the connection immediately
(async () => {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('✅ Database connection established successfully');
    
    // Test a simple query to verify actual database access
    const [result] = await connection.query('SELECT 1 AS test');
    console.log('✅ Database query test successful:', result);
    
    // Get server info
    const [serverInfo] = await connection.query('SELECT version() AS version');
    console.log('MySQL Server Info:', serverInfo[0].version);
    
    // Test creating a table
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS connection_test (
          id INT AUTO_INCREMENT PRIMARY KEY,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await connection.query(`INSERT INTO connection_test VALUES (NULL, NOW())`);
      console.log('✅ Database write test successful');
    } catch (err) {
      console.error('❌ Database write test failed:', err.message);
    }
    
  } catch (err) {
    console.error('❌ Failed to establish database connection:', err.message);
    if (err.code) console.error('Error code:', err.code);
    if (err.errno) console.error('Error number:', err.errno);
    if (err.sqlState) console.error('SQL state:', err.sqlState);
    if (err.sqlMessage) console.error('SQL message:', err.sqlMessage);
    
    // Additional Railway-specific debugging
    if (err.code === 'ENOTFOUND' && config.host === 'mysql.railway.internal') {
      console.error('\n🚨 CRITICAL ERROR: Cannot connect to mysql.railway.internal');
      console.error('This likely means:');
      console.error('1. Your database service may not be properly linked to your app in Railway');
      console.error('2. The MySQL database might not be running or accessible');
      console.error('3. You may need to check the Railway dashboard for database status');
    }
  } finally {
    if (connection) connection.release();
  }
})();

// Improved query function with better error handling and retries
async function query(sql, params, retries = 2) {
  let attempt = 0;
  
  while (attempt <= retries) {
    try {
      const truncatedSql = sql.length > 150 ? sql.substring(0, 150) + '...' : sql;
      console.log(`Executing query (attempt ${attempt + 1}/${retries + 1}):`, truncatedSql, 
        params ? 'with params' : 'without params');
      
      if (params) {
        // Safely log parameters without exposing sensitive data
        console.log('Query parameters:', 
          Array.isArray(params) 
            ? `Array with ${params.length} items` 
            : `Object with keys: ${Object.keys(params).join(', ')}`);
      }
      
      const [results] = await pool.execute(sql, params);
      
      console.log('Query successful, results:', 
        Array.isArray(results) 
          ? `${results.length} rows returned` 
          : typeof results === 'object' 
            ? `Object with keys: ${Object.keys(results).join(', ')}` 
            : results);
      
      return results;
    } catch (error) {
      console.error(`Database query error (attempt ${attempt + 1}/${retries + 1}):`, error.message);
      console.error('Query:', sql.substring(0, 200) + (sql.length > 200 ? '...' : ''));
      
      if (error.code) console.error('Error code:', error.code);
      if (error.errno) console.error('Error number:', error.errno);
      if (error.sqlState) console.error('SQL state:', error.sqlState);
      if (error.sqlMessage) console.error('SQL message:', error.sqlMessage);
      
      // Check if we should retry
      if (attempt < retries && 
          (error.code === 'PROTOCOL_CONNECTION_LOST' || 
           error.code === 'ECONNRESET' ||
           error.code === 'ETIMEDOUT')) {
        attempt++;
        console.log(`Retrying query (${attempt}/${retries})...`);
        // Wait before retrying (exponential backoff)
        await new Promise(r => setTimeout(r, 1000 * attempt));
      } else {
        throw error; // No more retries or not a retriable error
      }
    }
  }
}

// Export the pool and query function
module.exports = { query, pool }; 