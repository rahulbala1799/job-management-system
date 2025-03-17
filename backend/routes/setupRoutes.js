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
      try {
        console.log(`Executing: ${sql.substring(0, 60)}...`);
        await db.query(sql);
        results.push(`Table created: ${sql.split('CREATE TABLE IF NOT EXISTS ')[1].split(' ')[0]}`);
      } catch (tableError) {
        console.error('Error creating table:', tableError);
        results.push(`Failed to create table: ${tableError.message}`);
        // Continue with next table instead of failing completely
      }
    }
    
    // Seed initial data
    try {
      for (const sql of SEED_DATA) {
        console.log(`Executing seed: ${sql.substring(0, 60)}...`);
        await db.query(sql);
        results.push('Default admin user created');
      }
    } catch (seedError) {
      console.error('Error seeding data:', seedError);
      results.push(`Failed to seed data: ${seedError.message}`);
      // Continue with returning results instead of failing
    }
    
    res.json({
      success: results.every(r => !r.includes('Failed')),
      message: 'Database initialization completed with some results',
      details: results,
      login: {
        username: 'admin',
        password: 'password'
      }
    });
  } catch (error) {
    console.error('Database initialization error:', error);
    // Get full error details
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    };
    res.status(500).json({
      success: false,
      message: 'Database initialization failed',
      error: error.message || 'Unknown error',
      errorDetails
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

// Route to create a new admin user
router.get('/create-admin', async (req, res) => {
  try {
    // Generate new admin with predictable password
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    // Delete existing admin first (to avoid duplicates)
    await db.query('DELETE FROM users WHERE username = ?', ['admin']);
    
    // Create fresh admin user
    await db.query(`
      INSERT INTO users (username, password, email, role) 
      VALUES (?, ?, ?, ?)
    `, ['admin', hashedPassword, 'admin@example.com', 'admin']);
    
    res.json({
      success: true,
      message: 'New admin user created successfully',
      login: {
        username: 'admin',
        email: 'admin@example.com',
        password: 'admin123'
      }
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating admin user',
      error: error.message
    });
  }
});

// Direct login bypass - creates a valid token without checking password
router.get('/bypass-login', async (req, res) => {
  try {
    const jwt = require('jsonwebtoken');
    
    // Get admin user from database
    const [users] = await db.query('SELECT * FROM users WHERE username = ?', ['admin']);
    const user = users[0];
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found. Please run /api/setup/create-admin first'
      });
    }
    
    // Generate JWT token with admin privileges
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      message: 'Login bypass successful. Copy this token and instructions below.',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email, 
        role: user.role
      },
      instructions: 'Open browser console and run these commands: localStorage.setItem("token", "' + token + '"); localStorage.setItem("user", JSON.stringify(' + JSON.stringify(user) + ')); Then navigate to /dashboard'
    });
  } catch (error) {
    console.error('Bypass login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating bypass login',
      error: error.message
    });
  }
});

// Combined endpoint - creates admin and generates token in one request
router.get('/complete-setup', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const jwt = require('jsonwebtoken');
    
    console.log('Starting complete setup process...');
    console.log('Database connection:', !!db);
    
    // Check database connection
    try {
      const [testResult] = await db.query('SELECT 1 as test');
      console.log('Database connection test:', testResult);
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return res.status(500).json({
        success: false,
        message: 'Database connection failed',
        error: dbError.message
      });
    }
    
    // Step 1: Create admin user
    console.log('Creating admin user...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    // Delete existing admin first
    await db.query('DELETE FROM users WHERE username = ? OR email = ?', 
      ['admin', 'admin@example.com']);
    
    // Insert new admin
    const insertResult = await db.query(`
      INSERT INTO users (username, password, email, role) 
      VALUES (?, ?, ?, ?)
    `, ['admin', hashedPassword, 'admin@example.com', 'admin']);
    
    console.log('Admin user created:', insertResult);
    
    // Step 2: Verify user was created
    const [users] = await db.query(
      'SELECT * FROM users WHERE username = ?', 
      ['admin']
    );
    
    console.log('Found users:', users.length);
    const user = users[0];
    
    if (!user) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create admin user - not found after creation'
      });
    }
    
    // Step 3: Generate token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    // Step 4: Return everything
    res.json({
      success: true,
      message: 'Setup completed successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email, 
        role: user.role
      },
      token,
      login: {
        email: 'admin@example.com',
        password: 'admin123'
      },
      manual_login_steps: `
        1. Open browser console
        2. Run: localStorage.setItem("token", "${token}")
        3. Run: localStorage.setItem("user", '${JSON.stringify({
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        })}')
        4. Navigate to: /dashboard
      `
    });
  } catch (error) {
    console.error('Complete setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during complete setup process',
      error: error.message,
      stack: error.stack
    });
  }
});

module.exports = router; 