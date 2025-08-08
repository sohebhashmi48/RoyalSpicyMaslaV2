const { pool } = require('../config/database.cjs');

// Initialize expenses database
const initializeExpensesDatabase = async () => {
  try {
    console.log('🔄 Initializing expenses database...');

    // Create expenses table
    const createExpensesTable = `
      CREATE TABLE IF NOT EXISTS expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category VARCHAR(100) NOT NULL,
        expense_name VARCHAR(255) NOT NULL,
        expense_amount DECIMAL(10, 2) NOT NULL,
        notes TEXT,
        receipt_image VARCHAR(500),
        expense_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_expense_date (expense_date),
        INDEX idx_category (category),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await pool.execute(createExpensesTable);
    console.log('✅ Expenses table created/verified successfully');

    // Create expense categories table for predefined categories
    const createExpenseCategoriesTable = `
      CREATE TABLE IF NOT EXISTS expense_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        category_name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await pool.execute(createExpenseCategoriesTable);
    console.log('✅ Expense categories table created/verified successfully');

    // Insert default expense categories
    const defaultCategories = [
      { name: 'Office Supplies', description: 'Stationery, equipment, and office materials' },
      { name: 'Transportation', description: 'Vehicle fuel, maintenance, and travel expenses' },
      { name: 'Utilities', description: 'Electricity, water, internet, and phone bills' },
      { name: 'Marketing', description: 'Advertising, promotional materials, and marketing campaigns' },
      { name: 'Raw Materials', description: 'Spices, packaging materials, and ingredients' },
      { name: 'Equipment', description: 'Machinery, tools, and equipment purchases' },
      { name: 'Rent', description: 'Office rent, warehouse rent, and facility costs' },
      { name: 'Staff Expenses', description: 'Employee benefits, training, and staff-related costs' },
      { name: 'Maintenance', description: 'Equipment maintenance and repair costs' },
      { name: 'Miscellaneous', description: 'Other business-related expenses' }
    ];

    for (const category of defaultCategories) {
      const insertCategoryQuery = `
        INSERT IGNORE INTO expense_categories (category_name, description) 
        VALUES (?, ?)
      `;
      await pool.execute(insertCategoryQuery, [category.name, category.description]);
    }

    console.log('✅ Default expense categories inserted successfully');
    console.log('✅ Expenses database initialization completed!');

  } catch (error) {
    console.error('❌ Error initializing expenses database:', error);
    throw error;
  }
};

module.exports = {
  initializeExpensesDatabase
};
