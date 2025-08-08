const jwt = require('jsonwebtoken');
const { pool } = require('../config/database.cjs');

// Middleware to verify admin token
const verifyAdminToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Get admin from database
    const [admins] = await pool.execute(
      'SELECT id, username, full_name, email, role FROM admin_users WHERE id = ? AND is_active = 1',
      [decoded.adminId]
    );

    if (admins.length === 0) {
      return res.status(401).json({ message: 'Admin not found' });
    }

    req.admin = admins[0];
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Middleware to check admin role permissions
const requireAdminRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const roleHierarchy = {
      'super_admin': 3,
      'admin': 2,
      'manager': 1
    };

    const userRoleLevel = roleHierarchy[req.admin.role] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

    if (userRoleLevel < requiredRoleLevel) {
      return res.status(403).json({ 
        message: `Insufficient permissions. ${requiredRole} role required.` 
      });
    }

    next();
  };
};

// Middleware to log admin actions
const logAdminAction = (action) => {
  return (req, res, next) => {
    if (req.admin) {
      console.log(`[${new Date().toISOString()}] Admin ${req.admin.username} (${req.admin.role}) performed action: ${action}`);
    }
    next();
  };
};

module.exports = {
  verifyAdminToken,
  requireAdminRole,
  logAdminAction
};
