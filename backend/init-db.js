require('dotenv').config();
const mysql = require('mysql2/promise');

// Log environment variables for debugging
console.log('Using database environment variables:');
console.log('MYSQLHOST:', process.env.MYSQLHOST);
console.log('MYSQLUSER:', process.env.MYSQLUSER);
console.log('MYSQLDATABASE:', process.env.MYSQLDATABASE);
console.log('MYSQLPORT:', process.env.MYSQLPORT);
console.log('MYSQLPASSWORD: [hidden]');

// Create database connection directly (not using pool)
async function initDatabase() {
  let connection;
  
  try {
    // Connection configuration
    const config = {
      host: process.env.MYSQLHOST || 'localhost',
      user: process.env.MYSQLUSER || 'root',
      password: process.env.MYSQLPASSWORD || '',
      database: process.env.MYSQLDATABASE || 'railway',
      multipleStatements: true // Allow multiple statements in one query
    };

    console.log(`Connecting to database ${config.database} on ${config.host}...`);
    
    // Create connection
    connection = await mysql.createConnection(config);
    console.log('Connected to MySQL!');
    
    // Basic tables only (simplified for troubleshooting)
    const sql = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(100),
        role ENUM('admin', 'user') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        contact_person VARCHAR(100),
        email VARCHAR(100),
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS jobs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        job_number VARCHAR(50) NOT NULL,
        customer_id INT,
        description TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
      );
      
      INSERT IGNORE INTO users (username, password, email, role)
      VALUES ('admin', '$2b$10$CUAc35PPE0bH8e4o.vYuI.Y8JBJvFNmbDOTFDu5xdZdRLJTi7W3WS', 'admin@example.com', 'admin');
    `;
    
    console.log('Executing SQL...');
    const [results] = await connection.query(sql);
    console.log('Database initialized successfully!');
    console.log('Results:', results);
    
    console.log('Default user created: username=admin, password=password');
    
    return true;
  } catch (error) {
    console.error('Database initialization failed:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    return false;
  } finally {
    if (connection) {
      console.log('Closing database connection...');
      await connection.end();
    }
  }
}

// Run the initialization
initDatabase().then(success => {
  if (success) {
    console.log('Database initialization completed successfully');
    process.exit(0);
  } else {
    console.error('Database initialization failed');
    process.exit(1);
  }
}); 