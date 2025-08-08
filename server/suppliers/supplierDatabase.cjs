const { pool } = require('../config/database.cjs');

const initializeSuppliers = async () => {
  try {
    console.log('🔧 Initializing suppliers database...');

    // Create suppliers table
    const createSuppliersTable = `
      CREATE TABLE IF NOT EXISTS suppliers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        supplier_name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255) NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        email VARCHAR(255),
        address TEXT,
        notes TEXT,
        supplier_image VARCHAR(255),
        products_supplied JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_supplier_name (supplier_name),
        INDEX idx_contact_person (contact_person),
        INDEX idx_phone_number (phone_number),
        INDEX idx_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await pool.execute(createSuppliersTable);
    console.log('✅ Suppliers table created/verified successfully');

    // Clean up any malformed JSON data in existing records
    try {
      const [suppliers] = await pool.execute('SELECT id, products_supplied FROM suppliers WHERE products_supplied IS NOT NULL');

      for (const supplier of suppliers) {
        if (supplier.products_supplied) {
          try {
            // Try to parse existing JSON
            JSON.parse(supplier.products_supplied);
          } catch (error) {
            // If parsing fails, convert to proper JSON array
            console.log(`🔧 Fixing malformed JSON for supplier ID ${supplier.id}`);
            let fixedProducts = [];

            if (typeof supplier.products_supplied === 'string') {
              fixedProducts = supplier.products_supplied
                .split(',')
                .map(item => item.trim())
                .filter(item => item.length > 0);
            }

            await pool.execute(
              'UPDATE suppliers SET products_supplied = ? WHERE id = ?',
              [JSON.stringify(fixedProducts), supplier.id]
            );
          }
        }
      }

      if (suppliers.length > 0) {
        console.log('✅ Supplier data cleanup completed');
      }
    } catch (cleanupError) {
      console.log('⚠️ Supplier data cleanup skipped (table might be empty)');
    }

    return true;
  } catch (error) {
    console.error('❌ Error initializing suppliers database:', error);
    return false;
  }
};

module.exports = {
  initializeSuppliers
};
