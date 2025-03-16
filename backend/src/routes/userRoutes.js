const express = require('express');
const router = express.Router();
const { login, register, getAllUsers } = require('../controllers/userController');
const { auth, isAdmin } = require('../middleware/auth');

// Public routes
router.post('/login', login);

// Protected routes
router.post('/register', auth, isAdmin, register);
router.get('/all', auth, isAdmin, getAllUsers);

module.exports = router; 