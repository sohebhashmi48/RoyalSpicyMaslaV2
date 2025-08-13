const { pool } = require('../config/database.cjs');

// Initialize orders-related database tables
const initializeOrdersDatabase = async () => {
  try {
    const connection = await pool.getConnection();

    // Create orders table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_number VARCHAR(50) NOT NULL UNIQUE,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(20) NOT NULL,
        customer_email VARCHAR(255) NULL,
        delivery_address TEXT NOT NULL,
        notes TEXT NULL,
        subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        status ENUM('pending', 'confirmed', 'processing', 'out_for_delivery', 'delivered', 'cancelled') DEFAULT 'pending',
        order_source ENUM('online', 'phone', 'walk_in') DEFAULT 'online',
        payment_status ENUM('pending', 'paid', 'partial', 'refunded') DEFAULT 'pending',
        payment_method ENUM('cash', 'upi', 'card', 'bank_transfer', 'cod') NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        confirmed_at TIMESTAMP NULL,
        delivered_at TIMESTAMP NULL,
        cancelled_at TIMESTAMP NULL,
        confirmed_by VARCHAR(255) NULL,
        
        INDEX idx_order_number (order_number),
        INDEX idx_customer_phone (customer_phone),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at),
        INDEX idx_order_source (order_source)
      )
    `);

    // Create order_items table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        product_id INT NULL,
        product_name VARCHAR(255) NOT NULL,
        quantity DECIMAL(10,3) NOT NULL,
        unit VARCHAR(20) NOT NULL DEFAULT 'kg',
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(12,2) NOT NULL,
        source ENUM('manual', 'mix-calculator', 'custom') DEFAULT 'manual',
        mix_number INT NULL,
        is_custom BOOLEAN DEFAULT FALSE,
        custom_details JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        INDEX idx_order_id (order_id),
        INDEX idx_product_id (product_id),
        INDEX idx_source (source),
        INDEX idx_mix_number (mix_number)
      )
    `);

    // Create order_status_history table for tracking status changes
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS order_status_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        old_status VARCHAR(50) NULL,
        new_status VARCHAR(50) NOT NULL,
        changed_by VARCHAR(255) NULL,
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        INDEX idx_order_id (order_id),
        INDEX idx_created_at (created_at)
      )
    `);

    // Create order_inventory_allocations table to store per-batch allocations for delivery deductions
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS order_inventory_allocations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        order_item_id INT NULL,
        product_id INT NULL,
        product_name VARCHAR(255) NOT NULL,
        batch VARCHAR(100) NOT NULL,
        quantity DECIMAL(10,3) NOT NULL,
        unit ENUM('kg', 'gram', 'pound', 'box', 'pack', 'litre') DEFAULT 'kg',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE SET NULL,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        INDEX idx_order (order_id),
        INDEX idx_product (product_id),
        INDEX idx_batch (batch)
      )
    `);

    // Create product_cost_tracking table for profit calculations
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS product_cost_tracking (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        average_cost_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        current_retail_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        total_quantity_purchased DECIMAL(12,3) NOT NULL DEFAULT 0.000,
        total_cost_spent DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        UNIQUE KEY unique_product (product_id),
        INDEX idx_product_name (product_name),
        INDEX idx_last_updated (last_updated)
      )
    `);

    connection.release();
    console.log('✅ Orders database tables initialized successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error initializing orders database tables:', error.message);
    return false;
  }
};

module.exports = {
  initializeOrdersDatabase
};
