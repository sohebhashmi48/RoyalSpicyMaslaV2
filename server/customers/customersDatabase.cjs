const { pool } = require('../config/database.cjs');

const initializeCustomersDatabase = async () => {
  try {
    console.log('🔧 Initializing customers database...');

    // Create customers table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL UNIQUE,
        email VARCHAR(255) NULL,
        address TEXT NULL,
        total_orders INT DEFAULT 0,
        total_amount DECIMAL(15,2) DEFAULT 0.00,
        total_paid DECIMAL(15,2) DEFAULT 0.00,
        outstanding_balance DECIMAL(15,2) DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        INDEX idx_phone (phone),
        INDEX idx_name (name),
        INDEX idx_outstanding_balance (outstanding_balance),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Customers table created/verified successfully');

    // Create customer_bills table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS customer_bills (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        order_id INT NOT NULL,
        bill_number VARCHAR(50) NOT NULL UNIQUE,
        bill_date DATE NOT NULL,
        order_items JSON NOT NULL,
        subtotal DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        total_amount DECIMAL(15,2) NOT NULL,
        paid_amount DECIMAL(15,2) DEFAULT 0.00,
        pending_amount DECIMAL(15,2) NOT NULL,
        status ENUM('pending', 'partial', 'paid', 'overdue') DEFAULT 'pending',
        due_date DATE NULL,
        payment_receipts JSON NULL,
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        INDEX idx_customer_id (customer_id),
        INDEX idx_order_id (order_id),
        INDEX idx_bill_number (bill_number),
        INDEX idx_status (status),
        INDEX idx_bill_date (bill_date),
        INDEX idx_due_date (due_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Customer bills table created/verified successfully');

    // Create customer_payments table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS customer_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        bill_id INT NULL,
        payment_date DATE NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        payment_method ENUM('cash', 'upi', 'card', 'bank_transfer', 'cheque') NOT NULL,
        reference_number VARCHAR(100) NULL,
        notes TEXT NULL,
        receipt_image VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (bill_id) REFERENCES customer_bills(id) ON DELETE SET NULL,
        INDEX idx_customer_id (customer_id),
        INDEX idx_bill_id (bill_id),
        INDEX idx_payment_date (payment_date),
        INDEX idx_payment_method (payment_method)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Customer payments table created/verified successfully');

    console.log('✅ Customers database initialization completed!');
    return true;
  } catch (error) {
    console.error('❌ Error initializing customers database:', error);
    throw error;
  }
};

module.exports = {
  initializeCustomersDatabase
};
