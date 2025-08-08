const { pool } = require('../config/database.cjs');

// Initialize inventory database
const initializeInventoryDatabase = async () => {
  try {
    console.log('🔄 Initializing inventory database...');

    // Create inventory table
    const createInventoryTable = `
      CREATE TABLE IF NOT EXISTS inventory (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        batch VARCHAR(100) NOT NULL,
        action ENUM('added', 'updated', 'deducted', 'merged') NOT NULL DEFAULT 'added',
        quantity DECIMAL(10, 3) NOT NULL DEFAULT 0.000,
        value DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        cost_per_kg DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        unit ENUM('kg', 'gram', 'pound', 'box', 'pack', 'litre') DEFAULT 'kg',
        status ENUM('active', 'inactive', 'expired', 'merged') NOT NULL DEFAULT 'active',
        notes TEXT,
        reference_type ENUM('purchase', 'manual', 'adjustment', 'transfer') DEFAULT 'manual',
        reference_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_product_id (product_id),
        INDEX idx_batch (batch),
        INDEX idx_action (action),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at),
        INDEX idx_reference (reference_type, reference_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await pool.execute(createInventoryTable);
    console.log('✅ Inventory table created/verified successfully');

    // Create inventory_summary table for current stock levels
    const createInventorySummaryTable = `
      CREATE TABLE IF NOT EXISTS inventory_summary (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        total_quantity DECIMAL(10, 3) NOT NULL DEFAULT 0.000,
        total_value DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        average_cost_per_kg DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        unit ENUM('kg', 'gram', 'pound', 'box', 'pack', 'litre') DEFAULT 'kg',
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        UNIQUE KEY unique_product (product_id),
        INDEX idx_product_id (product_id),
        INDEX idx_total_quantity (total_quantity)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await pool.execute(createInventorySummaryTable);
    console.log('✅ Inventory summary table created/verified successfully');

    // Add cost_per_kg column to existing inventory table if it doesn't exist
    try {
      await pool.execute(`
        ALTER TABLE inventory
        ADD COLUMN cost_per_kg DECIMAL(10, 2) NOT NULL DEFAULT 0.00
        AFTER value
      `);
      console.log('✅ Added cost_per_kg column to inventory table');
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ cost_per_kg column already exists in inventory table');
      }
    }

    // Add average_cost_per_kg column to existing inventory_summary table if it doesn't exist
    try {
      await pool.execute(`
        ALTER TABLE inventory_summary
        ADD COLUMN average_cost_per_kg DECIMAL(10, 2) NOT NULL DEFAULT 0.00
        AFTER total_value
      `);
      console.log('✅ Added average_cost_per_kg column to inventory_summary table');
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ average_cost_per_kg column already exists in inventory_summary table');
      }
    }

    // Update status ENUM to include 'merged' if it doesn't exist
    try {
      await pool.execute(`
        ALTER TABLE inventory
        MODIFY COLUMN status ENUM('active', 'inactive', 'expired', 'merged') NOT NULL DEFAULT 'active'
      `);
      console.log('✅ Updated status ENUM to include merged value');
    } catch (error) {
      if (error.code !== 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ Status ENUM already includes merged value or update failed:', error.message);
      }
    }

    // Create triggers to automatically update inventory_summary
    const createUpdateTrigger = `
      CREATE TRIGGER IF NOT EXISTS update_inventory_summary
      AFTER INSERT ON inventory
      FOR EACH ROW
      BEGIN
        INSERT INTO inventory_summary (product_id, product_name, total_quantity, total_value, unit)
        VALUES (NEW.product_id, NEW.product_name, NEW.quantity, NEW.value, NEW.unit)
        ON DUPLICATE KEY UPDATE
          total_quantity = CASE 
            WHEN NEW.action = 'added' OR NEW.action = 'updated' THEN total_quantity + NEW.quantity
            WHEN NEW.action = 'deducted' THEN total_quantity - NEW.quantity
            ELSE total_quantity
          END,
          total_value = CASE 
            WHEN NEW.action = 'added' OR NEW.action = 'updated' THEN total_value + NEW.value
            WHEN NEW.action = 'deducted' THEN total_value - NEW.value
            ELSE total_value
          END,
          product_name = NEW.product_name,
          unit = NEW.unit,
          last_updated = CURRENT_TIMESTAMP;
      END;
    `;

    try {
      await pool.execute(createUpdateTrigger);
      console.log('✅ Inventory summary trigger created/verified successfully');
    } catch (error) {
      if (!error.message.includes('already exists')) {
        console.log('⚠️ Trigger creation note:', error.message);
      }
    }

    return true;
  } catch (error) {
    console.error('❌ Error initializing inventory database:', error);
    return false;
  }
};

module.exports = {
  initializeInventoryDatabase
};
