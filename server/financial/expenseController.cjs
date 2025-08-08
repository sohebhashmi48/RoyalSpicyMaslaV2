const { pool } = require('../config/database.cjs');
const path = require('path');
const fs = require('fs');

// Get all expenses with pagination and filters
const getExpenses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      date,
      dateFrom,
      dateTo,
      category,
      todayOnly = false
    } = req.query;

    // Convert to integers
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Calculate offset for pagination
    const offset = (pageNum - 1) * limitNum;

    // Base query for counting total records
    let countQuery = 'SELECT COUNT(*) as total FROM expenses';

    // Base query for fetching expenses
    let query = `
      SELECT
        id,
        category,
        expense_name,
        expense_amount,
        notes,
        receipt_image,
        expense_date,
        created_at,
        updated_at
      FROM expenses
    `;

    const conditions = [];
    const params = [];

    // Filter for today's expenses only
    if (todayOnly === 'true') {
      const today = new Date().toISOString().split('T')[0];
      conditions.push('expense_date = ?');
      params.push(today);
    } else {
      // Date range filtering
      if (dateFrom && dateTo) {
        conditions.push('expense_date BETWEEN ? AND ?');
        params.push(dateFrom, dateTo);
      } else if (dateFrom) {
        conditions.push('expense_date >= ?');
        params.push(dateFrom);
      } else if (dateTo) {
        conditions.push('expense_date <= ?');
        params.push(dateTo);
      }

      // Single date filter (for backward compatibility)
      if (date && !dateFrom && !dateTo) {
        conditions.push('expense_date = ?');
        params.push(date);
      }
    }

    // Category filter
    if (category && category !== 'all') {
      conditions.push('category = ?');
      params.push(category);
    }

    // Add WHERE clause if conditions exist
    const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

    // Complete the queries
    countQuery += whereClause;
    query += whereClause;

    // Add ordering and pagination
    query += ' ORDER BY expense_date DESC, created_at DESC';

    // Create separate parameter arrays for count and main queries
    const countParams = [...params]; // Copy params for count query
    const mainParams = [...params]; // Copy params for main query

    // Execute count query
    const [countResult] = await pool.execute(countQuery, countParams);
    const totalRecords = countResult[0].total;

    // Add pagination only if not fetching today's expenses
    if (todayOnly !== 'true') {
      query += ` LIMIT ${limitNum} OFFSET ${offset}`;
    }

    // Execute main query
    const [expenses] = await pool.execute(query, mainParams);

    // Calculate pagination info
    const totalPages = Math.ceil(totalRecords / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.json({
      success: true,
      expenses: expenses,
      pagination: {
        currentPage: pageNum,
        totalPages: totalPages,
        totalRecords: totalRecords,
        limit: limitNum,
        hasNextPage: hasNextPage,
        hasPrevPage: hasPrevPage
      },
      filters: {
        date,
        dateFrom,
        dateTo,
        category,
        todayOnly
      }
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expenses',
      error: error.message
    });
  }
};

// Get expense categories
const getExpenseCategories = async (req, res) => {
  try {
    const [categories] = await pool.execute(
      'SELECT category_name, description FROM expense_categories WHERE is_active = TRUE ORDER BY category_name'
    );
    
    res.json({
      success: true,
      categories: categories
    });
  } catch (error) {
    console.error('Error fetching expense categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expense categories',
      error: error.message
    });
  }
};

// Create new expense
const createExpense = async (req, res) => {
  try {
    const { category, expense_name, expense_amount, notes, expense_date } = req.body;
    
    // Validate required fields
    if (!category || !expense_name || !expense_amount || !expense_date) {
      return res.status(400).json({
        success: false,
        message: 'Category, expense name, amount, and date are required'
      });
    }
    
    // Validate amount is positive number
    const amount = parseFloat(expense_amount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Expense amount must be a positive number'
      });
    }
    
    // Handle receipt image if uploaded
    let receiptImagePath = null;
    if (req.file) {
      receiptImagePath = req.file.filename;
    }
    
    const insertQuery = `
      INSERT INTO expenses (category, expense_name, expense_amount, notes, receipt_image, expense_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await pool.execute(insertQuery, [
      category,
      expense_name,
      amount,
      notes || null,
      receiptImagePath,
      expense_date
    ]);
    
    // Get the created expense
    const [createdExpense] = await pool.execute(
      'SELECT * FROM expenses WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      expense: createdExpense[0]
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create expense',
      error: error.message
    });
  }
};

// Update expense
const updateExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, expense_name, expense_amount, notes, expense_date } = req.body;
    
    // Check if expense exists
    const [existingExpense] = await pool.execute(
      'SELECT * FROM expenses WHERE id = ?',
      [id]
    );
    
    if (existingExpense.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }
    
    // Validate required fields
    if (!category || !expense_name || !expense_amount || !expense_date) {
      return res.status(400).json({
        success: false,
        message: 'Category, expense name, amount, and date are required'
      });
    }
    
    // Validate amount
    const amount = parseFloat(expense_amount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Expense amount must be a positive number'
      });
    }
    
    // Handle receipt image
    let receiptImagePath = existingExpense[0].receipt_image;
    if (req.file) {
      // Delete old image if exists
      if (receiptImagePath) {
        const oldImagePath = path.join(__dirname, 'receipts', receiptImagePath);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      receiptImagePath = req.file.filename;
    }
    
    const updateQuery = `
      UPDATE expenses 
      SET category = ?, expense_name = ?, expense_amount = ?, notes = ?, receipt_image = ?, expense_date = ?
      WHERE id = ?
    `;
    
    await pool.execute(updateQuery, [
      category,
      expense_name,
      amount,
      notes || null,
      receiptImagePath,
      expense_date,
      id
    ]);
    
    // Get updated expense
    const [updatedExpense] = await pool.execute(
      'SELECT * FROM expenses WHERE id = ?',
      [id]
    );
    
    res.json({
      success: true,
      message: 'Expense updated successfully',
      expense: updatedExpense[0]
    });
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update expense',
      error: error.message
    });
  }
};

// Delete expense
const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if expense exists
    const [existingExpense] = await pool.execute(
      'SELECT * FROM expenses WHERE id = ?',
      [id]
    );
    
    if (existingExpense.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }
    
    // Delete receipt image if exists
    if (existingExpense[0].receipt_image) {
      const imagePath = path.join(__dirname, 'receipts', existingExpense[0].receipt_image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await pool.execute('DELETE FROM expenses WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete expense',
      error: error.message
    });
  }
};

// Get today's expenses specifically
const getTodayExpenses = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const query = `
      SELECT
        id,
        category,
        expense_name,
        expense_amount,
        notes,
        receipt_image,
        expense_date,
        created_at,
        updated_at
      FROM expenses
      WHERE expense_date = ?
      ORDER BY created_at DESC
    `;

    const [expenses] = await pool.execute(query, [today]);

    // Calculate today's total
    const totalAmount = expenses.reduce((sum, expense) => sum + parseFloat(expense.expense_amount), 0);

    res.json({
      success: true,
      expenses: expenses,
      total: expenses.length,
      totalAmount: totalAmount,
      date: today
    });
  } catch (error) {
    console.error('Error fetching today expenses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch today expenses',
      error: error.message
    });
  }
};

// Get expense statistics
const getExpenseStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

    // Today's total
    const [todayResult] = await pool.execute(
      'SELECT COALESCE(SUM(expense_amount), 0) as total FROM expenses WHERE expense_date = ?',
      [today]
    );

    // This month's total
    const [monthResult] = await pool.execute(
      'SELECT COALESCE(SUM(expense_amount), 0) as total FROM expenses WHERE expense_date LIKE ?',
      [`${currentMonth}%`]
    );

    // All time total
    const [allTimeResult] = await pool.execute(
      'SELECT COALESCE(SUM(expense_amount), 0) as total FROM expenses'
    );

    // Category breakdown for current month
    const [categoryBreakdown] = await pool.execute(
      `SELECT
        category,
        COUNT(*) as count,
        SUM(expense_amount) as total
      FROM expenses
      WHERE expense_date LIKE ?
      GROUP BY category
      ORDER BY total DESC`,
      [`${currentMonth}%`]
    );

    res.json({
      success: true,
      stats: {
        today: parseFloat(todayResult[0].total),
        thisMonth: parseFloat(monthResult[0].total),
        allTime: parseFloat(allTimeResult[0].total),
        categoryBreakdown: categoryBreakdown.map(cat => ({
          category: cat.category,
          count: cat.count,
          total: parseFloat(cat.total)
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching expense stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expense statistics',
      error: error.message
    });
  }
};

// Simple test endpoint to check if expenses exist
const testExpenses = async (req, res) => {
  try {
    const [expenses] = await pool.execute('SELECT COUNT(*) as count FROM expenses');
    const [categories] = await pool.execute('SELECT COUNT(*) as count FROM expense_categories');

    res.json({
      success: true,
      data: {
        expenseCount: expenses[0].count,
        categoryCount: categories[0].count,
        message: 'Database connection working'
      }
    });
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({
      success: false,
      message: 'Database test failed',
      error: error.message
    });
  }
};

// Export expenses to CSV
const exportExpenses = async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    if (!dateFrom || !dateTo) {
      return res.status(400).json({
        success: false,
        message: 'Date range is required for export'
      });
    }

    const query = `
      SELECT
        expense_date,
        category,
        expense_name,
        expense_amount,
        notes,
        created_at
      FROM expenses
      WHERE expense_date BETWEEN ? AND ?
      ORDER BY expense_date DESC, created_at DESC
    `;

    const [expenses] = await pool.execute(query, [dateFrom, dateTo]);

    // Create CSV content
    const csvHeaders = [
      'Date',
      'Category',
      'Expense Name',
      'Amount (₹)',
      'Notes',
      'Created At'
    ];

    const csvRows = expenses.map(expense => [
      expense.expense_date,
      expense.category,
      `"${expense.expense_name}"`, // Wrap in quotes to handle commas
      expense.expense_amount,
      `"${expense.notes || ''}"`, // Wrap in quotes and handle null
      new Date(expense.created_at).toLocaleString('en-IN')
    ]);

    // Combine headers and rows
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="expenses_${dateFrom}_to_${dateTo}.csv"`);

    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting expenses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export expenses',
      error: error.message
    });
  }
};

module.exports = {
  getExpenses,
  getTodayExpenses,
  getExpenseStats,
  getExpenseCategories,
  createExpense,
  updateExpense,
  deleteExpense,
  testExpenses,
  exportExpenses
};
