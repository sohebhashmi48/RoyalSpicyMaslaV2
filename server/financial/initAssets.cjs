const { pool } = require('../config/database.cjs');

const initializeAssets = async () => {
  try {
    console.log('🔧 Initializing assets system...');

    // Create asset_categories table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS asset_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category_name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create assets table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS assets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        asset_title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) NOT NULL,
        location VARCHAR(255),
        warranty VARCHAR(255),
        purchase_date DATE NOT NULL,
        purchase_amount DECIMAL(10, 2) NOT NULL,
        current_value DECIMAL(10, 2),
        warranty_expiry_date DATE,
        asset_image VARCHAR(255) NOT NULL,
        receipt_image VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category),
        INDEX idx_purchase_date (purchase_date),
        INDEX idx_location (location)
      )
    `);

    // Check if asset categories exist
    const [existingCategories] = await pool.execute(
      'SELECT COUNT(*) as count FROM asset_categories'
    );

    // Insert default asset categories if none exist
    if (existingCategories[0].count === 0) {
      const defaultCategories = [
        { name: 'Office Equipment', description: 'Computers, printers, furniture, etc.' },
        { name: 'Machinery', description: 'Production and manufacturing equipment' },
        { name: 'Vehicles', description: 'Company cars, trucks, delivery vehicles' },
        { name: 'Electronics', description: 'Phones, tablets, audio/video equipment' },
        { name: 'Furniture', description: 'Desks, chairs, cabinets, storage' },
        { name: 'Software', description: 'Software licenses and subscriptions' },
        { name: 'Tools', description: 'Hand tools, power tools, equipment' },
        { name: 'Real Estate', description: 'Buildings, land, property' },
        { name: 'Kitchen Equipment', description: 'Commercial kitchen appliances and tools' },
        { name: 'Other', description: 'Miscellaneous assets' }
      ];

      for (const category of defaultCategories) {
        await pool.execute(
          'INSERT INTO asset_categories (category_name, description) VALUES (?, ?)',
          [category.name, category.description]
        );
      }

      console.log('✅ Default asset categories created');
    }

    console.log('✅ Assets system initialized successfully!');
  } catch (error) {
    console.error('❌ Error initializing assets system:', error);
    throw error;
  }
};

module.exports = { initializeAssets };
