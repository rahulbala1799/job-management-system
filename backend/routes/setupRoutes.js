const express = require('express');
const db = require('../db');
const router = express.Router();

// SQL statements for table creation
const CREATE_TABLES = [
  // Users table
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    role ENUM('admin', 'user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB;`,

  // Customers table
  `CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB;`,

  // Products table
  `CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    width DECIMAL(10,2),
    height DECIMAL(10,2),
    material VARCHAR(100),
    color VARCHAR(50),
    unit_price DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB;`,

  // Jobs table
  `CREATE TABLE IF NOT EXISTS jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_number VARCHAR(50) NOT NULL,
    customer_id INT,
    description TEXT,
    order_date DATE,
    due_date DATE,
    status ENUM('pending', 'in_progress', 'completed', 'delivered', 'cancelled') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
  ) ENGINE=InnoDB;`,

  // Job Items table
  `CREATE TABLE IF NOT EXISTS job_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT NOT NULL,
    product_id INT,
    quantity INT NOT NULL DEFAULT 1,
    width DECIMAL(10,2),
    height DECIMAL(10,2),
    ink_usage DECIMAL(10,2) DEFAULT 0,
    unit_price DECIMAL(10,2),
    description TEXT,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
  ) ENGINE=InnoDB;`,

  // Invoices table
  `CREATE TABLE IF NOT EXISTS invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL,
    job_id INT,
    customer_id INT,
    amount DECIMAL(10,2) NOT NULL,
    tax DECIMAL(10,2) DEFAULT 0,
    status ENUM('pending', 'paid', 'cancelled') DEFAULT 'pending',
    issue_date DATE,
    due_date DATE,
    payment_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
  ) ENGINE=InnoDB;`,

  // Job Costing table
  `CREATE TABLE IF NOT EXISTS job_costing (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT,
    job_item_id INT,
    cost_type ENUM('ink', 'material', 'labor', 'other') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (job_item_id) REFERENCES job_items(id) ON DELETE CASCADE
  ) ENGINE=InnoDB;`
];

// Seeds initial data
const SEED_DATA = [
  `INSERT INTO users (username, password, email, role) 
   SELECT 'admin', '$2b$10$CUAc35PPE0bH8e4o.vYuI.Y8JBJvFNmbDOTFDu5xdZdRLJTi7W3WS', 'admin@example.com', 'admin'
   FROM dual
   WHERE NOT EXISTS (SELECT * FROM users WHERE username = 'admin')`
];

// Route to set up the database
router.get('/init-db', async (req, res) => {
  try {
    const results = [];
    
    // Create tables
    for (const sql of CREATE_TABLES) {
      await db.query(sql);
      results.push(`Table created: ${sql.split('CREATE TABLE IF NOT EXISTS ')[1].split(' ')[0]}`);
    }
    
    // Seed initial data
    for (const sql of SEED_DATA) {
      await db.query(sql);
      results.push('Default admin user created');
    }
    
    res.json({
      success: true,
      message: 'Database initialized successfully',
      details: results,
      login: {
        username: 'admin',
        password: 'password'
      }
    });
  } catch (error) {
    console.error('Database initialization error:', error);
    res.status(500).json({
      success: false,
      message: 'Database initialization failed',
      error: error.message
    });
  }
});

// Route to check database status
router.get('/db-status', async (req, res) => {
  try {
    const tables = [
      'users', 'customers', 'products', 'jobs', 
      'job_items', 'invoices', 'job_costing'
    ];
    
    const status = {};
    
    for (const table of tables) {
      try {
        const result = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
        status[table] = {
          exists: true,
          count: result[0].count
        };
      } catch (error) {
        status[table] = {
          exists: false,
          error: error.message
        };
      }
    }
    
    res.json({
      success: true,
      database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'railway',
      tables: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking database status',
      error: error.message
    });
  }
});

module.exports = router; 