require('dotenv').config();
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function initializeDatabase() {
  try {
    // Create connection without database selected
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });

    // Read and execute database schema
    const schema = await fs.readFile(path.join(__dirname, '../../database.sql'), 'utf8');
    const statements = schema.split(';').filter(statement => statement.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await connection.query(statement);
      }
    }

    // Create test users
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('admin123', salt);
    const employeePassword = await bcrypt.hash('employee123', salt);

    // Insert test admin
    await connection.query(`
      INSERT INTO users (username, password, email, name, role)
      VALUES (?, ?, ?, ?, ?)
    `, ['admin', adminPassword, 'admin@test.com', 'Admin User', 'admin']);

    // Insert test employee
    await connection.query(`
      INSERT INTO users (username, password, email, name, role)
      VALUES (?, ?, ?, ?, ?)
    `, ['employee', employeePassword, 'employee@test.com', 'Employee User', 'employee']);

    console.log('Database initialized successfully!');
    console.log('Test Users Created:');
    console.log('Admin - Email: admin@test.com, Password: admin123');
    console.log('Employee - Email: employee@test.com, Password: employee123');

    await connection.end();
  } catch (err) {
    console.error('Error initializing database:', err);
    process.exit(1);
  }
}

initializeDatabase(); 