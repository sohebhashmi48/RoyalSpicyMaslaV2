// Login module exports
const adminAuthRoutes = require('./adminAuthRoutes');
const { verifyAdminToken, requireAdminRole, logAdminAction } = require('./adminMiddleware');
const { initializeAdminSystem, createDefaultAdmin } = require('./adminDatabase');
const { adminLogin, getAdminProfile } = require('./adminAuthController');

module.exports = {
  // Routes
  adminAuthRoutes,
  
  // Middleware
  verifyAdminToken,
  requireAdminRole,
  logAdminAction,
  
  // Database functions
  initializeAdminSystem,
  createDefaultAdmin,
  
  // Controllers
  adminLogin,
  getAdminProfile
};
