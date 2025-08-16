const { pool } = require('../config/database.cjs');

// Fetch saved allocations for an order
const getAllocations = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      `SELECT * FROM order_inventory_allocations WHERE order_id = ? ORDER BY id`,
      [id]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching allocations:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch allocations', error: error.message });
  }
};

// Save allocations for an order (replace existing)
const saveAllocations = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params; // order_id
    const { allocations } = req.body;

    if (!Array.isArray(allocations) || allocations.length === 0) {
      return res.status(400).json({ success: false, message: 'Allocations array is required' });
    }

    await connection.beginTransaction();

    // Remove previous allocations for idempotency
    await connection.execute('DELETE FROM order_inventory_allocations WHERE order_id = ?', [id]);

    // Validate availability per allocation (batch-level)
    for (const a of allocations) {
      const productId = parseInt(a.product_id);
      const qty = parseFloat(a.quantity);
      if (!productId || !a.batch || isNaN(qty) || qty <= 0) continue;

      const [availRows] = await connection.execute(
        `SELECT SUM(CASE WHEN action IN ('added','updated','merged') THEN quantity WHEN action='deducted' THEN -quantity ELSE 0 END) AS total
         FROM inventory WHERE product_id = ? AND batch = ? AND status != 'merged'`,
        [productId, a.batch]
      );
      const available = parseFloat(availRows[0]?.total || 0);
      if (available < qty - 1e-6) {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ success: false, message: `Insufficient stock in batch ${a.batch} for product ${a.product_name || productId}. Available ${available.toFixed(3)}, requested ${qty.toFixed(3)}.` });
      }
    }

    // Insert
    for (const a of allocations) {
      const productId = parseInt(a.product_id);
      const quantity = parseFloat(a.quantity);
      if (!productId || !a.batch || isNaN(quantity) || quantity <= 0) continue;

      // Handle mix items by setting order_item_id to NULL
      let orderItemId = null; // Default to NULL for safety
      
      if (a.source !== 'mix' && a.mix_component_index === undefined && a.order_item_id) {
        // Only set order_item_id for non-mix items that have a valid integer value
        const orderId = parseInt(a.order_item_id);
        if (!isNaN(orderId)) {
          orderItemId = orderId;
        }
      }

      console.log('Inserting allocation:', {
        order_id: id,
        order_item_id: orderItemId,
        product_id: productId,
        product_name: a.product_name || '',
        batch: a.batch,
        quantity: quantity,
        unit: a.unit || 'kg'
      });

      await connection.execute(
        `INSERT INTO order_inventory_allocations (
           order_id, order_item_id, product_id, product_name, batch, quantity, unit
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, orderItemId, productId, a.product_name || '', a.batch, quantity, a.unit || 'kg']
      );
    }

    await connection.commit();
    res.json({ success: true, message: 'Allocations saved' });
  } catch (error) {
    await connection.rollback();
    console.error('Error saving allocations:', error);
    res.status(500).json({ success: false, message: 'Failed to save allocations', error: error.message });
  } finally {
    connection.release();
  }
};

// Deduct inventory based on allocations and mark delivered optionally
const deductInventoryForDelivery = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params; // order_id
    const { markDelivered } = req.body || {};

    await connection.beginTransaction();

    // Ensure order exists
    const [orders] = await connection.execute('SELECT * FROM orders WHERE id = ?', [id]);
    if (orders.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Fetch allocations
    const [allocs] = await connection.execute(
      `SELECT * FROM order_inventory_allocations WHERE order_id = ?`,
      [id]
    );

    if (allocs.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ success: false, message: 'No allocations found for this order' });
    }

    // Deduct inventory per allocation and update summary
    for (const a of allocs) {
      // Insert inventory history as deducted
      await connection.execute(
        `INSERT INTO inventory (
           product_id, product_name, batch, action, quantity, value, cost_per_kg, unit, status, notes, reference_type, reference_id
         )
         SELECT 
           ?, ?, ?, 'deducted', ?, 
           ROUND( (CASE WHEN average_cost_per_kg > 0 THEN average_cost_per_kg * ? ELSE 0 END), 2) as value,
           average_cost_per_kg,
           ?, 'active', ?, 'transfer', ?
         FROM inventory_summary WHERE product_id = ?
        `,
        [
          a.product_id,
          a.product_name || '',
          a.batch,
          parseFloat(a.quantity),
          parseFloat(a.quantity),
          a.unit || 'kg',
          `Deducted for order ${orders[0].order_number}`,
          id,
          a.product_id
        ]
      );

      // Update inventory_summary
      await connection.execute(
        `UPDATE inventory_summary
           SET total_quantity = GREATEST(total_quantity - ?, 0),
               total_value = GREATEST(total_value - (average_cost_per_kg * ?), 0),
               average_cost_per_kg = CASE WHEN GREATEST(total_quantity - ?, 0) > 0 THEN 
                   GREATEST(total_value - (average_cost_per_kg * ?), 0) / GREATEST(total_quantity - ?, 0)
                 ELSE 0 END,
               last_updated = CURRENT_TIMESTAMP
         WHERE product_id = ?`,
        [a.quantity, a.quantity, a.quantity, a.quantity, a.quantity, a.product_id]
      );
    }

    // Optionally mark delivered
    if (markDelivered) {
      await connection.execute(
        `UPDATE orders SET status = 'delivered', delivered_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [id]
      );

      await connection.execute(
        `INSERT INTO order_status_history (order_id, old_status, new_status, notes)
         VALUES (?, NULL, 'delivered', 'Auto-marked delivered after inventory deduction')`,
        [id]
      );
    }

    await connection.commit();
    res.json({ success: true, message: 'Inventory deducted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error deducting inventory for delivery:', error);
    res.status(500).json({ success: false, message: 'Failed to deduct inventory', error: error.message });
  } finally {
    connection.release();
  }
};

module.exports = {
  getAllocations,
  saveAllocations,
  deductInventoryForDelivery,
};


