const initializeCaterers = async (pool) => {
  try {
    console.log('🔧 Initializing caterers database...');

    // Create caterers table with proper constraints
    const createCaterersTable = `
      CREATE TABLE IF NOT EXISTS caterers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        caterer_name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255) NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        email VARCHAR(255) UNIQUE,
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        pincode VARCHAR(20),
        gst_number VARCHAR(50) UNIQUE,
        card_image VARCHAR(500),
        description TEXT,
        balance_due DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_caterer_name (caterer_name),
        INDEX idx_contact_person (contact_person),
        INDEX idx_phone_number (phone_number),
        INDEX idx_email (email),
        INDEX idx_is_active (is_active),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await pool.execute(createCaterersTable);
    console.log('✅ Caterers table created/verified successfully');

    // Check if table has data
    const [countResult] = await pool.execute('SELECT COUNT(*) as count FROM caterers');
    console.log(`📊 Current caterers count: ${countResult[0].count}`);
  } catch (error) {
    console.error('❌ Error initializing caterers database:', error);
    console.error('Error details:', error.message);
  }
};
module.exports = { initializeCaterers };
