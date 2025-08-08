const express = require('express');
const router = express.Router();
const { login, logout, checkAuth, getProfile, updateProfile } = require('../controllers/authController.cjs');
const { authenticateSession } = require('../middleware/auth.cjs');

// Public routes
router.post('/login', login);
router.post('/logout', logout);
router.get('/check', checkAuth);

// Protected routes
router.get('/profile', authenticateSession, getProfile);
router.put('/profile', authenticateSession, updateProfile);

module.exports = router;
