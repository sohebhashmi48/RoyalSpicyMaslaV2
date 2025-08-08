const jwt = require('jsonwebtoken');
const { pool } = require('../config/database.cjs');

const generateToken = (adminId) => {
  return jwt.sign({ adminId, type: 'admin' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        message: 'Username and password are required'
      });
    }

    // Find admin user
    const [admins] = await pool.execute(
      'SELECT id, username, password, full_name, email, role, is_active FROM admin_users WHERE username = ? AND is_active = 1',
      [username]
    );

    if (admins.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const admin = admins[0];

    // Verify password (simple text comparison)
    if (password !== admin.password) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    await pool.execute(
      'UPDATE admin_users SET last_login = NOW() WHERE id = ?',
      [admin.id]
    );

    // Generate token
    const token = generateToken(admin.id);

    res.json({
      message: 'Login successful',
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        full_name: admin.full_name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getAdminProfile = async (req, res) => {
  try {
    const adminId = req.admin.id;

    const [admins] = await pool.execute(
      'SELECT id, username, full_name, email, role, created_at, last_login FROM admin_users WHERE id = ? AND is_active = 1',
      [adminId]
    );

    if (admins.length === 0) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json({ admin: admins[0] });
  } catch (error) {
    console.error('Get admin profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get safety password (for authenticated users only)
const getSafetyPassword = async (req, res) => {
  try {
    const connection = await pool.getConnection();

    // Get the admin user (using admin ID from token)
    const [admins] = await connection.execute(
      'SELECT safety_password FROM admin_users WHERE id = ? AND is_active = 1',
      [req.admin.id]
    );

    connection.release();

    if (admins.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }

    res.json({
      success: true,
      password: admins[0].safety_password || 'admin123'
    });
  } catch (error) {
    console.error('Error getting safety password:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Update safety settings
const updateSafetySettings = async (req, res) => {
  try {
    const { enabled, newPassword, currentPassword } = req.body;

    const connection = await pool.getConnection();

    // Get the admin user
    const [admins] = await connection.execute(
      'SELECT id, safety_password FROM admin_users WHERE id = ? AND is_active = 1',
      [req.admin.id]
    );

    if (admins.length === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }

    // Verify current password
    const currentSafetyPassword = admins[0].safety_password || 'admin123';
    if (currentSafetyPassword !== currentPassword) {
      connection.release();
      return res.status(401).json({
        success: false,
        message: 'Invalid current password'
      });
    }

    // Update safety password if provided
    if (newPassword) {
      await connection.execute(
        'UPDATE admin_users SET safety_password = ? WHERE id = ?',
        [newPassword, req.admin.id]
      );
    }

    connection.release();

    res.json({
      success: true,
      message: 'Safety settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating safety settings:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

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

module.exports = {
  adminLogin,
  getAdminProfile,
  verifyAdminToken,
  getSafetyPassword,
  updateSafetySettings
};
