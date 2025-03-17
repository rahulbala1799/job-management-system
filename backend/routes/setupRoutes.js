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
    category VARCHAR(100) DEFAULT 'general',
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

// Direct login with redirect
router.get('/direct-login', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const jwt = require('jsonwebtoken');
    
    console.log('Starting direct login process...');
    
    // Check database connection first
    try {
      const [testResult] = await db.query('SELECT 1 as test');
      console.log('Database connection test:', testResult);
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return res.status(500).send('Database connection failed: ' + dbError.message);
    }
    
    // Create admin user directly without checking first
    console.log('Creating admin user directly...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    // Delete any existing admin users 
    try {
      await db.query('DELETE FROM users WHERE username = ? OR email = ?', 
        ['admin', 'admin@example.com']);
      console.log('Cleaned up any existing admin users');
    } catch (err) {
      console.log('Error during cleanup:', err.message);
    }
    
    // Insert new admin with COMMIT
    console.log('Inserting admin user...');
    try {
      await db.query('START TRANSACTION');
      
      const insertQuery = `
        INSERT INTO users (username, password, email, role) 
        VALUES (?, ?, ?, ?)
      `;
      await db.query(insertQuery, ['admin', hashedPassword, 'admin@example.com', 'admin']);
      
      await db.query('COMMIT');
      console.log('Admin user inserted and transaction committed');
    } catch (insertError) {
      console.error('Error inserting admin:', insertError);
      try {
        await db.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Error during rollback:', rollbackError);
      }
      return res.status(500).send(`Error creating admin user: ${insertError.message}`);
    }
    
    // Get newly created user
    console.log('Retrieving created admin user...');
    const [users] = await db.query('SELECT * FROM users WHERE username = ?', ['admin']);
    
    console.log('Users found:', users ? users.length : 0);
    if (!users || users.length === 0) {
      // Fallback - create a mock user if we can't retrieve from DB
      console.log('Creating mock user since DB retrieval failed');
      var user = {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin'
      };
    } else {
      var user = users[0];
      console.log('Retrieved user:', { id: user.id, username: user.username });
    }
    
    // Generate token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    // Create HTML with auto-login script
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Logging you in...</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          .card { border: 1px solid #ccc; border-radius: 8px; padding: 20px; margin-top: 20px; }
          h1 { color: #1976d2; }
          .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #1976d2; border-radius: 50%; width: 20px; height: 20px; animation: spin 1s linear infinite; display: inline-block; margin-right: 10px; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <h1>Job Management System</h1>
        <div class="card">
          <h2><div class="spinner"></div> Logging you in automatically...</h2>
          <p>You should be redirected to the dashboard automatically in a moment.</p>
          <p>If you're not redirected, <a href="#" id="manual-link">click here</a>.</p>
        </div>
        
        <script>
          // Set auth data in localStorage
          localStorage.setItem('token', '${token}');
          localStorage.setItem('user', '${JSON.stringify({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
          }).replace(/'/g, "\\'")}');
          
          // Create link
          document.getElementById('manual-link').addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = '/dashboard';
          });
          
          // Redirect after a short delay
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 1500);
        </script>
      </body>
      </html>
    `;
    
    // Send HTML response
    res.send(html);
  } catch (error) {
    console.error('Direct login error:', error);
    res.status(500).send(`Error during direct login: ${error.message}\n\nStack: ${error.stack}`);
  }
});

// Super simple login bypass that doesn't use prepared statements
router.get('/login-html', async (req, res) => {
  try {
    // Hardcoded user that matches what we're trying to create
    const hardcodedUser = {
      id: 1,
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin'
    };
    
    // Generate token 
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { userId: hardcodedUser.id, role: hardcodedUser.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    // Create HTML with auto-login script
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Direct Login</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          .card { border: 1px solid #ccc; border-radius: 8px; padding: 20px; margin-top: 20px; }
          h1 { color: #1976d2; }
          .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #1976d2; border-radius: 50%; width: 20px; height: 20px; animation: spin 1s linear infinite; display: inline-block; margin-right: 10px; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <h1>Job Management System</h1>
        <div class="card">
          <h2><div class="spinner"></div> Setting up login...</h2>
          <p>Attempting to log you in automatically.</p>
          
          <div id="status">Setting up authentication...</div>
          
          <pre id="debug"></pre>
          
          <p>If automatic redirect doesn't work:</p>
          <ol>
            <li>Click the "Manual Setup" button</li>
            <li>Navigate to <a href="/dashboard">/dashboard</a></li>
          </ol>
          
          <button id="manualBtn" style="padding: 10px; margin-top: 10px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">Manual Setup</button>
        </div>
        
        <script>
          const debugEl = document.getElementById('debug');
          const statusEl = document.getElementById('status');
          
          function log(msg) {
            debugEl.textContent += msg + '\\n';
          }
          
          function setupAuth() {
            try {
              // Set token and user in localStorage
              log('Setting token...');
              localStorage.setItem('token', '${token}');
              
              log('Setting user data...');
              localStorage.setItem('user', '${JSON.stringify(hardcodedUser).replace(/'/g, "\\'")}');
              
              log('Auth data set successfully');
              statusEl.textContent = 'Login successful! Redirecting...';
              
              // Redirect to dashboard
              setTimeout(() => {
                window.location.href = '/dashboard';
              }, 1500);
              
              return true;
            } catch (error) {
              log('Error: ' + error.message);
              statusEl.textContent = 'Error setting up login. Try manual setup.';
              return false;
            }
          }
          
          // Try automatic setup
          setupAuth();
          
          // Manual button
          document.getElementById('manualBtn').addEventListener('click', function() {
            setupAuth();
            statusEl.textContent = 'Manual setup done. Click dashboard link above.';
          });
        </script>
      </body>
      </html>
    `;
    
    res.send(html);
  } catch (error) {
    console.error('Login HTML error:', error);
    res.status(500).send('Error: ' + error.message);
  }
});

// Fix database schema issues
router.get('/fix-schema', async (req, res) => {
  const alterStatements = [];
  const results = {};
  
  try {
    console.log('Starting schema fix...');
    
    // Check if category column exists in products table
    try {
      const [columns] = await db.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'products' 
        AND COLUMN_NAME = 'category'
      `);
      
      if (columns.length === 0) {
        console.log('Adding category column to products table');
        alterStatements.push(`ALTER TABLE products ADD COLUMN category VARCHAR(100) DEFAULT 'general'`);
        await db.query(`ALTER TABLE products ADD COLUMN category VARCHAR(100) DEFAULT 'general'`);
        results.products_category = 'Added';
      } else {
        results.products_category = 'Already exists';
      }
    } catch (error) {
      console.error('Error checking products.category column:', error);
      results.products_category = `Error: ${error.message}`;
    }
    
    // Add more schema fixes here as needed
    
    // List all tables
    try {
      const [tables] = await db.query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE()
      `);
      
      results.existing_tables = tables.map(t => t.TABLE_NAME);
    } catch (error) {
      console.error('Error listing tables:', error);
      results.existing_tables = `Error: ${error.message}`;
    }
    
    // Return schema fix results
    res.json({
      success: true,
      message: 'Schema fixes applied',
      fixes_applied: alterStatements,
      results: results
    });
  } catch (error) {
    console.error('Schema fix error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fixing schema',
      error: error.message
    });
  }
});

// Add seed data through API
router.get('/add-seed-data', async (req, res) => {
  try {
    const results = {};
    
    // Add a sample product
    try {
      const [productCheck] = await db.query('SELECT * FROM products LIMIT 1');
      if (productCheck.length === 0) {
        // No products exist, create some examples
        await db.query(`
          INSERT INTO products (name, description, category, material, unit_price) 
          VALUES 
          ('Business Card', 'Standard business card', 'print', 'Paper', 59.99),
          ('Brochure', 'Tri-fold marketing brochure', 'print', 'Glossy Paper', 125.50),
          ('Vinyl Banner', 'Outdoor promotional banner', 'signage', 'Vinyl', 199.99),
          ('Logo Design', 'Custom logo creation', 'design', 'Digital', 350.00),
          ('T-Shirt', 'Custom printed t-shirt', 'apparel', 'Cotton', 25.99),
          ('Packaging Box', 'Product packaging', 'packaging', 'Cardboard', 8.75)
        `);
        results.products = 'Added 6 sample products';
      } else {
        results.products = 'Products already exist, skipped';
      }
    } catch (err) {
      console.error('Error adding products:', err);
      results.products = `Error: ${err.message}`;
    }
    
    // Add a sample customer
    try {
      const [customerCheck] = await db.query('SELECT * FROM customers LIMIT 1');
      if (customerCheck.length === 0) {
        await db.query(`
          INSERT INTO customers (name, contact_person, email, phone, address) 
          VALUES 
          ('ABC Corporation', 'John Smith', 'john@abccorp.com', '555-123-4567', '123 Main St, Suite 100, New York, NY 10001'),
          ('XYZ Company', 'Jane Doe', 'jane@xyzcompany.com', '555-987-6543', '456 Park Ave, Chicago, IL 60601')
        `);
        results.customers = 'Added 2 sample customers';
      } else {
        results.customers = 'Customers already exist, skipped';
      }
    } catch (err) {
      console.error('Error adding customers:', err);
      results.customers = `Error: ${err.message}`;
    }
    
    res.json({
      success: true,
      message: 'Seed data added successfully',
      results
    });
  } catch (error) {
    console.error('Error adding seed data:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding seed data',
      error: error.message
    });
  }
});

module.exports = router; 