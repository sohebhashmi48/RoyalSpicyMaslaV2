const express = require('express');
const router = express.Router();
const {
  adminLogin,
  getAdminProfile,
  verifyAdminToken,
  getSafetyPassword,
  updateSafetySettings
} = require('./adminAuthController.cjs');

// Admin login route
router.post('/admin-login', adminLogin);

// Protected admin routes
router.get('/admin-profile', verifyAdminToken, getAdminProfile);
router.get('/safety-password', verifyAdminToken, getSafetyPassword);
router.post('/update-safety', verifyAdminToken, updateSafetySettings);

// Admin logout (client-side token removal, but we can log it)
router.post('/admin-logout', verifyAdminToken, (req, res) => {
  // Log the logout action
  console.log(`Admin ${req.admin.username} logged out at ${new Date().toISOString()}`);

  res.json({
    message: 'Logout successful',
    timestamp: new Date().toISOString()
  });
});

// Verify admin token endpoint
router.get('/verify-admin', verifyAdminToken, (req, res) => {
  res.json({
    valid: true,
    admin: {
      id: req.admin.id,
      username: req.admin.username,
      full_name: req.admin.full_name,
      email: req.admin.email,
      role: req.admin.role
    }
  });
});

module.exports = router;
