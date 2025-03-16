const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');
const pool = require('../utils/db');

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    // Check for existing user
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    const user = users[0];

    if (!user) {
      return res.status(400).json({ message: 'User does not exist' });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Register new user (admin only)
const register = async (req, res) => {
  try {
    const { username, password, email, name, role } = req.body;

    // Validate input
    if (!username || !password || !email || !name || !role) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    // Check for existing user
    const [existingUsers] = await pool.query(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create salt & hash
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    // Insert user into database
    const [result] = await pool.query(
      'INSERT INTO users (username, password, email, name, role) VALUES (?, ?, ?, ?, ?)',
      [username, hash, email, name, role]
    );

    const [newUser] = await pool.query('SELECT id, username, email, name, role FROM users WHERE id = ?', [result.insertId]);

    res.json({
      user: newUser[0]
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all users (admin only)
const getAllUsers = async (req, res) => {
  try {
    const [users] = await pool.query(
      'SELECT id, username, email, name, role, created_at FROM users'
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  login,
  register,
  getAllUsers
}; 