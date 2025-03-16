const mysql = require('mysql2/promise');
require('dotenv').config();

// For debugging
console.log('==========================================');
console.log('RAILWAY DATABASE CONNECTION DIAGNOSTICS');
console.log('==========================================');

console.log('All environment variables:');
console.log(Object.keys(process.env).filter(key => 
  !key.includes('KEY') && !key.includes('SECRET') && !key.includes('PASSWORD') && 
  !key.includes('TOKEN') && !key.includes('AUTH')
).map(key => `${key}: ${process.env[key]}`));

console.log('Critical database variables:');
console.log('MYSQLDATABASE:', process.env.MYSQLDATABASE);
console.log('MYSQLHOST:', process.env.MYSQLHOST);
console.log('MYSQLUSER:', process.env.MYSQLUSER);
console.log('MYSQL_URL:', process.env.MYSQL_URL);
console.log('MYSQL_DATABASE:', process.env.MYSQL_DATABASE);

// If MYSQL_URL is available, extract connection details
let mysqlConfig = {};
if (process.env.MYSQL_URL) {
  try {
    console.log('Attempting to parse MYSQL_URL');
    const url = new URL(process.env.MYSQL_URL);
    mysqlConfig = {
      host: url.hostname,
      user: url.username,
      password: url.password,
      database: url.pathname.substring(1),
      port: url.port || 3306
    };
    console.log('Successfully parsed MYSQL_URL');
  } catch (error) {
    console.error('Failed to parse MYSQL_URL:', error.message);
  }
}

// Final database configuration
const config = {
  host: mysqlConfig.host || process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
  user: mysqlConfig.user || process.env.MYSQLUSER || process.env.DB_USER || 'root',
  password: mysqlConfig.password || process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
  database: mysqlConfig.database || process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || process.env.DB_NAME || 'railway',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

console.log('Using database connection config:');
console.log('Host:', config.host);
console.log('User:', config.user);
console.log('Database:', config.database);
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