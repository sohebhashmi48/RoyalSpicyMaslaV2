const { pool } = require('../config/database.cjs');

// Get all categories
const getCategories = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    const [categories] = await connection.execute(`
      SELECT id, name, sub_category, description, created_at, updated_at
      FROM categories 
      ORDER BY created_at DESC
    `);
    
    connection.release();
    
    res.json({
      success: true,
      data: categories,
      message: 'Categories retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
};

// Create new category
const createCategory = async (req, res) => {
  try {
    const { name, subCategory, description } = req.body;
    
    // Validate required fields
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }
    
    const connection = await pool.getConnection();
    
    // Check if category already exists
    const [existingCategory] = await connection.execute(
      'SELECT id FROM categories WHERE name = ?',
      [name.trim()]
    );
    
    if (existingCategory.length > 0) {
      connection.release();
      return res.status(409).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }
    
    // Insert new category
    const [result] = await connection.execute(`
      INSERT INTO categories (name, sub_category, description)
      VALUES (?, ?, ?)
    `, [
      name.trim(),
      subCategory ? subCategory.trim() : null,
      description ? description.trim() : null
    ]);
    
    // Get the created category
    const [newCategory] = await connection.execute(
      'SELECT id, name, sub_category, description, created_at FROM categories WHERE id = ?',
      [result.insertId]
    );
    
    connection.release();
    
    res.status(201).json({
      success: true,
      data: newCategory[0],
      message: 'Category created successfully'
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create category',
      error: error.message
    });
  }
};

// Update category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subCategory, description } = req.body;
    
    // Validate required fields
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }
    
    const connection = await pool.getConnection();
    
    // Check if category exists
    const [existingCategory] = await connection.execute(
      'SELECT id FROM categories WHERE id = ?',
      [id]
    );
    
    if (existingCategory.length === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Check if another category with same name exists
    const [duplicateCategory] = await connection.execute(
      'SELECT id FROM categories WHERE name = ? AND id != ?',
      [name.trim(), id]
    );
    
    if (duplicateCategory.length > 0) {
      connection.release();
      return res.status(409).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }
    
    // Update category
    await connection.execute(`
      UPDATE categories 
      SET name = ?, sub_category = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      name.trim(),
      subCategory ? subCategory.trim() : null,
      description ? description.trim() : null,
      id
    ]);
    
    // Get updated category
    const [updatedCategory] = await connection.execute(
      'SELECT id, name, sub_category, description, created_at, updated_at FROM categories WHERE id = ?',
      [id]
    );
    
    connection.release();
    
    res.json({
      success: true,
      data: updatedCategory[0],
      message: 'Category updated successfully'
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category',
      error: error.message
    });
  }
};

// Delete category
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const connection = await pool.getConnection();

    // Check if category exists
    const [existingCategory] = await connection.execute(
      'SELECT id FROM categories WHERE id = ?',
      [id]
    );

    if (existingCategory.length === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // TODO: Check if category is being used by products before deletion
    // const [productsUsingCategory] = await connection.execute(
    //   'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
    //   [id]
    // );
    //
    // if (productsUsingCategory[0].count > 0) {
    //   connection.release();
    //   return res.status(409).json({
    //     success: false,
    //     message: 'Cannot delete category. It is being used by products.'
    //   });
    // }

    // Delete category
    await connection.execute('DELETE FROM categories WHERE id = ?', [id]);

    connection.release();

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category',
      error: error.message
    });
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
