const { pool } = require('../config/database.cjs');

// Create default admin user
const createDefaultAdmin = async () => {
  try {
    // Check if any admin users exist
    const [existingAdmins] = await pool.execute(
      'SELECT id FROM admin_users LIMIT 1'
    );

    if (existingAdmins.length > 0) {
      console.log('✅ Admin users already exist');
      return true;
    }

    // Create default admin user with plain text password
    await pool.execute(
      `INSERT INTO admin_users
       (username, password, full_name, email, role)
       VALUES (?, ?, ?, ?, ?)`,
      [
        'admin',
        'admin123',
        'System Administrator',
        'admin@royalspicymasala.com',
        'super_admin'
      ]
    );

    console.log('✅ Default admin user created successfully');
    console.log('📝 Login Credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   Role: super_admin');

    return true;
  } catch (error) {
    console.error('❌ Error creating default admin user:', error);
    return false;
  }
};

// Initialize admin system
const initializeAdminSystem = async () => {
  try {
    console.log('👤 Initializing admin system...');

    const adminCreated = await createDefaultAdmin();
    if (!adminCreated) {
      throw new Error('Failed to create default admin');
    }

    console.log('✅ Admin system initialized successfully!');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize admin system:', error);
    return false;
  }
};

module.exports = {
  createDefaultAdmin,
  initializeAdminSystem
};
