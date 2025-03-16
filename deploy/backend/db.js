const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration
const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'job_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create a pool
const pool = mysql.createPool(config);

// Helper function to execute queries
const query = async (sql, params) => {
  try {
    const [results] = await pool.execute(sql, params);
    return [results, null];
  } catch (error) {
    console.error('Database error:', error);
    return [null, error];
  }
};

module.exports = {
  query,
  config,
  pool
}; 