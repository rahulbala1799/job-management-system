const mysql = require('mysql2/promise');
require('dotenv').config();

// Log environment variables for debugging in Railway
console.log('Environment variables for database connection:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('Railway MySQL variables:');
console.log('MYSQLDATABASE:', process.env.MYSQLDATABASE);
console.log('MYSQLHOST:', process.env.MYSQLHOST);
console.log('MYSQLUSER:', process.env.MYSQLUSER);
console.log('MYSQLPASSWORD: [redacted for security]');

// Priority: Railway variables > custom env variables > defaults
const config = {
  host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
  user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'job_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

console.log('Using database:', config.database, 'on host:', config.host);

// Create a pool
const pool = mysql.createPool(config);

// Test the connection and handle errors gracefully
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Database connection established successfully');
    connection.release();
  } catch (err) {
    console.error('Failed to establish database connection:', err.message);
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
    // Re-throw with more details
    throw error;
  }
}

module.exports = { query, pool }; 