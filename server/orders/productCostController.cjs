const { pool } = require('../config/database.cjs');

// Update product cost tracking when inventory is purchased
const updateProductCost = async (productId, productName, quantity, costPrice, retailPrice) => {
  try {
    const connection = await pool.getConnection();
    
    // Get current cost tracking data
    const [existing] = await connection.execute(
      'SELECT * FROM product_cost_tracking WHERE product_id = ?',
      [productId]
    );
    
    if (existing.length > 0) {
      // Update existing record with weighted average
      const current = existing[0];
      const newTotalQuantity = parseFloat(current.total_quantity_purchased) + parseFloat(quantity);
      const newTotalCost = parseFloat(current.total_cost_spent) + (parseFloat(quantity) * parseFloat(costPrice));
      const newAverageCost = newTotalCost / newTotalQuantity;
      
      await connection.execute(`
        UPDATE product_cost_tracking 
        SET 
          average_cost_price = ?,
          current_retail_price = ?,
          total_quantity_purchased = ?,
          total_cost_spent = ?,
          last_updated = CURRENT_TIMESTAMP
        WHERE product_id = ?
      `, [newAverageCost, retailPrice, newTotalQuantity, newTotalCost, productId]);
    } else {
      // Create new record
      await connection.execute(`
        INSERT INTO product_cost_tracking (
          product_id, product_name, average_cost_price, current_retail_price,
          total_quantity_purchased, total_cost_spent
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [productId, productName, costPrice, retailPrice, quantity, (quantity * costPrice)]);
    }
    
    connection.release();
    return true;
  } catch (error) {
    console.error('Error updating product cost:', error);
    return false;
  }
};

// Get all product cost data
const getProductCosts = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    const [costs] = await connection.execute(`
      SELECT 
        pct.*,
        (pct.current_retail_price - pct.average_cost_price) as profit_per_unit,
        CASE 
          WHEN pct.average_cost_price > 0 
          THEN ((pct.current_retail_price - pct.average_cost_price) / pct.average_cost_price) * 100 
          ELSE 0 
        END as profit_margin_percentage
      FROM product_cost_tracking pct
      ORDER BY pct.product_name
    `);
    
    connection.release();
    
    res.json({
      success: true,
      data: costs
    });
  } catch (error) {
    console.error('Error fetching product costs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product costs',
      error: error.message
    });
  }
};

// Get cost data for a specific product
const getProductCost = async (req, res) => {
  try {
    const { productId } = req.params;
    const connection = await pool.getConnection();
    
    const [cost] = await connection.execute(
      'SELECT * FROM product_cost_tracking WHERE product_id = ?',
      [productId]
    );
    
    connection.release();
    
    if (cost.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product cost data not found'
      });
    }
    
    res.json({
      success: true,
      data: cost[0]
    });
  } catch (error) {
    console.error('Error fetching product cost:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product cost',
      error: error.message
    });
  }
};

// Calculate profit for an order (only for delivered orders)
const calculateOrderProfit = async (orderId) => {
  try {
    const connection = await pool.getConnection();
    
    // Get order items with cost data
    const [orderItems] = await connection.execute(`
      SELECT 
        oi.*,
        pct.average_cost_price,
        (oi.unit_price - COALESCE(pct.average_cost_price, 0)) * oi.quantity as item_profit
      FROM order_items oi
      LEFT JOIN product_cost_tracking pct ON oi.product_id = pct.product_id
      WHERE oi.order_id = ?
    `, [orderId]);
    
    connection.release();
    
    let totalProfit = 0;
    orderItems.forEach(item => {
      if (item.average_cost_price) {
        totalProfit += parseFloat(item.item_profit || 0);
      }
    });
    
    return {
      success: true,
      totalProfit,
      items: orderItems
    };
  } catch (error) {
    console.error('Error calculating order profit:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Update retail prices from products table
const syncRetailPrices = async (req, res) => {
  try {
    const connection = await pool.getConnection();
    
    // Update retail prices from products table
    await connection.execute(`
      UPDATE product_cost_tracking pct
      JOIN products p ON pct.product_id = p.id
      SET pct.current_retail_price = p.retail_price
      WHERE p.retail_price IS NOT NULL AND p.retail_price > 0
    `);
    
    connection.release();
    
    res.json({
      success: true,
      message: 'Retail prices synchronized successfully'
    });
  } catch (error) {
    console.error('Error syncing retail prices:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync retail prices',
      error: error.message
    });
  }
};

module.exports = {
  updateProductCost,
  getProductCosts,
  getProductCost,
  calculateOrderProfit,
  syncRetailPrices
};
