const { pool } = require('../config/database.cjs');
const path = require('path');
const fs = require('fs');

// Get all assets with pagination and filters
const getAssets = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      category,
      location
    } = req.query;
    
    // Convert to integers
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    // Calculate offset for pagination
    const offset = (pageNum - 1) * limitNum;
    
    // Build WHERE conditions
    const conditions = [];
    const params = [];
    
    // Category filter
    if (category && category !== 'all') {
      conditions.push('category = ?');
      params.push(category);
    }
    
    // Location filter
    if (location && location !== 'all') {
      conditions.push('location = ?');
      params.push(location);
    }
    
    // Build WHERE clause
    const whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
    
    // Count query
    const countQuery = `SELECT COUNT(*) as total FROM assets${whereClause}`;
    const [countResult] = await pool.execute(countQuery, params);
    const totalRecords = countResult[0].total;
    
    // Main query
    let mainQuery = `
      SELECT
        id,
        asset_title,
        description,
        category,
        location,
        warranty,
        purchase_date,
        purchase_amount,
        current_value,
        warranty_expiry_date,
        asset_image,
        receipt_image,
        created_at,
        updated_at
      FROM assets
      ${whereClause}
      ORDER BY purchase_date DESC, created_at DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    // Execute main query
    const [assets] = await pool.execute(mainQuery, params);

    // Calculate pagination info
    const totalPages = Math.ceil(totalRecords / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;
    
    res.json({
      success: true,
      assets: assets,
      pagination: {
        currentPage: pageNum,
        totalPages: totalPages,
        totalRecords: totalRecords,
        limit: limitNum,
        hasNextPage: hasNextPage,
        hasPrevPage: hasPrevPage
      },
      filters: {
        category,
        location
      }
    });
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch assets',
      error: error.message
    });
  }
};

// Get asset categories
const getAssetCategories = async (req, res) => {
  try {
    const [categories] = await pool.execute(
      'SELECT category_name, description FROM asset_categories WHERE is_active = TRUE ORDER BY category_name'
    );
    
    res.json({
      success: true,
      categories: categories
    });
  } catch (error) {
    console.error('Error fetching asset categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch asset categories',
      error: error.message
    });
  }
};

// Create new asset
const createAsset = async (req, res) => {
  try {
    const { 
      asset_title, 
      description, 
      category, 
      location, 
      warranty, 
      purchase_date, 
      purchase_amount, 
      current_value, 
      warranty_expiry_date 
    } = req.body;
    
    // Validate required fields
    if (!asset_title || !category || !purchase_date || !purchase_amount) {
      return res.status(400).json({
        success: false,
        message: 'Asset title, category, purchase date, and purchase amount are required'
      });
    }

    // Handle file uploads
    let assetImageName = null;
    let receiptImageName = null;

    if (req.files) {
      if (req.files.asset_image) {
        assetImageName = req.files.asset_image[0].filename;
      }
      if (req.files.receipt_image) {
        receiptImageName = req.files.receipt_image[0].filename;
      }
    }

    // Validate that asset image is provided
    if (!assetImageName) {
      return res.status(400).json({
        success: false,
        message: 'Asset image is required'
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO assets (
        asset_title, description, category, location, warranty, 
        purchase_date, purchase_amount, current_value, warranty_expiry_date,
        asset_image, receipt_image
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        asset_title,
        description || null,
        category,
        location || null,
        warranty || null,
        purchase_date,
        purchase_amount,
        current_value || null,
        warranty_expiry_date || null,
        assetImageName,
        receiptImageName
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Asset created successfully',
      assetId: result.insertId
    });
  } catch (error) {
    console.error('Error creating asset:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create asset',
      error: error.message
    });
  }
};

// Update asset
const updateAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      asset_title, 
      description, 
      category, 
      location, 
      warranty, 
      purchase_date, 
      purchase_amount, 
      current_value, 
      warranty_expiry_date 
    } = req.body;

    // Check if asset exists
    const [existingAsset] = await pool.execute(
      'SELECT * FROM assets WHERE id = ?',
      [id]
    );

    if (existingAsset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }

    // Handle file uploads
    let assetImageName = existingAsset[0].asset_image;
    let receiptImageName = existingAsset[0].receipt_image;

    if (req.files) {
      if (req.files.asset_image) {
        // Delete old asset image
        if (assetImageName) {
          const oldImagePath = path.join(__dirname, 'assets', assetImageName);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
        assetImageName = req.files.asset_image[0].filename;
      }
      
      if (req.files.receipt_image) {
        // Delete old receipt image
        if (receiptImageName) {
          const oldReceiptPath = path.join(__dirname, 'assets', 'receipts', receiptImageName);
          if (fs.existsSync(oldReceiptPath)) {
            fs.unlinkSync(oldReceiptPath);
          }
        }
        receiptImageName = req.files.receipt_image[0].filename;
      }
    }

    await pool.execute(
      `UPDATE assets SET 
        asset_title = ?, description = ?, category = ?, location = ?, warranty = ?,
        purchase_date = ?, purchase_amount = ?, current_value = ?, warranty_expiry_date = ?,
        asset_image = ?, receipt_image = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        asset_title,
        description || null,
        category,
        location || null,
        warranty || null,
        purchase_date,
        purchase_amount,
        current_value || null,
        warranty_expiry_date || null,
        assetImageName,
        receiptImageName,
        id
      ]
    );

    res.json({
      success: true,
      message: 'Asset updated successfully'
    });
  } catch (error) {
    console.error('Error updating asset:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update asset',
      error: error.message
    });
  }
};

// Delete asset
const deleteAsset = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if asset exists
    const [existingAsset] = await pool.execute(
      'SELECT * FROM assets WHERE id = ?',
      [id]
    );
    
    if (existingAsset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }
    
    // Delete asset image if exists
    if (existingAsset[0].asset_image) {
      const imagePath = path.join(__dirname, 'assets', existingAsset[0].asset_image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    // Delete receipt image if exists
    if (existingAsset[0].receipt_image) {
      const receiptPath = path.join(__dirname, 'assets', 'receipts', existingAsset[0].receipt_image);
      if (fs.existsSync(receiptPath)) {
        fs.unlinkSync(receiptPath);
      }
    }
    
    await pool.execute('DELETE FROM assets WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: 'Asset deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting asset:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete asset',
      error: error.message
    });
  }
};

// Export assets to CSV
const exportAssets = async (req, res) => {
  try {
    const query = `
      SELECT
        asset_title,
        description,
        category,
        location,
        warranty,
        purchase_date,
        purchase_amount,
        current_value,
        warranty_expiry_date,
        created_at
      FROM assets
      ORDER BY purchase_date DESC, created_at DESC
    `;

    const [assets] = await pool.execute(query);

    // Create CSV content
    const csvHeaders = [
      'Asset Title',
      'Description',
      'Category',
      'Location',
      'Warranty',
      'Purchase Date',
      'Purchase Amount (₹)',
      'Current Value (₹)',
      'Warranty Expiry Date',
      'Created At'
    ];

    const csvRows = assets.map(asset => [
      `"${asset.asset_title}"`,
      `"${asset.description || ''}"`,
      asset.category,
      `"${asset.location || ''}"`,
      `"${asset.warranty || ''}"`,
      asset.purchase_date,
      asset.purchase_amount,
      asset.current_value || asset.purchase_amount,
      asset.warranty_expiry_date || '',
      new Date(asset.created_at).toLocaleString('en-IN')
    ]);

    // Combine headers and rows
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="assets_${new Date().toISOString().split('T')[0]}.csv"`);

    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting assets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export assets',
      error: error.message
    });
  }
};

module.exports = {
  getAssets,
  getAssetCategories,
  createAsset,
  updateAsset,
  deleteAsset,
  exportAssets
};
