const pool = require('./db.cjs');

// Get caterer order statistics
const getCatererOrderStats = async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    const connection = await pool.getConnection();

    // --- DATE FILTERS ---
    let dateFilter = '';
    let dateParams = [];
    if (date_from && date_to) {
      if (date_from === date_to) {
        dateFilter = 'DATE(created_at) = ?';
        dateParams = [date_from];
      } else {
        dateFilter = 'DATE(created_at) >= ? AND DATE(created_at) <= ?';
        dateParams = [date_from, date_to];
      }
    } else if (date_from) {
      dateFilter = 'DATE(created_at) >= ?';
      dateParams = [date_from];
    } else if (date_to) {
      dateFilter = 'DATE(created_at) <= ?';
      dateParams = [date_to];
    } else {
      dateFilter = 'DATE(created_at) = CURDATE()';
    }

    // --- STATISTICS QUERY ---
    let statsQuery = `
      SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_orders,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_orders,
        COUNT(CASE WHEN status = 'ready' THEN 1 END) as ready_orders,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders
      FROM caterer_orders
      WHERE ${dateFilter}
    `;
    const [todayStats] = await connection.execute(statsQuery, dateParams);

    // --- THIS MONTH'S STATS ---
    const [monthStats] = await connection.execute(`
      SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue
      FROM caterer_orders
      WHERE YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())
    `);

    // --- DELIVERED ORDERS ONLY (for profit calculation) ---
    let deliveredOrdersQuery = `
      SELECT id, total_amount FROM caterer_orders
      WHERE status = 'delivered' AND ${dateFilter}
    `;
    const [deliveredOrders] = await connection.execute(deliveredOrdersQuery, dateParams);

    let totalProfit = 0;
    let deliveredRevenue = 0;

    // --- LOOP ALL DELIVERED ORDERS ---
    for (const order of deliveredOrders) {
      deliveredRevenue += parseFloat(order.total_amount) || 0;

      // Fetch order items for each order
      const [orderItems] = await connection.execute(`
        SELECT
          coi.*,
          COALESCE(inv1.average_cost_per_kg, inv2.average_cost_per_kg, 0) AS average_cost_price
        FROM caterer_order_items coi
        LEFT JOIN products p1 ON coi.product_id = p1.id
        LEFT JOIN products p2 ON coi.product_id IS NULL AND coi.product_name = p2.name
        LEFT JOIN inventory_summary inv1 ON coi.product_id = inv1.product_id
        LEFT JOIN inventory_summary inv2 ON p2.id = inv2.product_id
        WHERE coi.caterer_order_id = ?
      `, [order.id]);

      for (const item of orderItems) {
        // Regular item calculation
        if (!item.is_mix) {
          const unitPrice = parseFloat(item.unit_price) || 0;
          const quantity = parseFloat(item.quantity) || 0;
          const costPrice = parseFloat(item.average_cost_price) || 0;
          const itemProfit = (unitPrice - costPrice) * quantity;

          // Optionally log per-item profit
          // console.log({ orderId: order.id, itemId: item.id, unitPrice, quantity, costPrice, itemProfit });

          totalProfit += itemProfit;
        } else if (item.is_mix && item.custom_details) {
          // Robust mix handling
          let mixProfit = 0;
          try {
            const mixDetails = JSON.parse(item.custom_details);
            if (mixDetails.components && Array.isArray(mixDetails.components)) {
              for (const component of mixDetails.components) {
                const compQty = parseFloat(component.quantity) || 0;
                const compCatererPrice = parseFloat(component.caterer_price) || 0;
                // Try to get correct cost price for each mix component
                const [costRows] = await connection.execute(`
                  SELECT COALESCE(inv.average_cost_per_kg, 0) AS cost_price
                  FROM products p
                  LEFT JOIN inventory_summary inv ON p.id = inv.product_id
                  WHERE p.id = ? OR p.name = ?
                  LIMIT 1
                `, [component.product_id || null, component.name || null]);
                const compCost = costRows.length > 0 ? parseFloat(costRows[0].cost_price) || 0 : 0;
                const compProfit = (compCatererPrice - compCost) * compQty;
                mixProfit += compProfit;
                // Optional per-component debug:
                // console.log({ orderId: order.id, item: item.id, mixComponent: component.name, compQty, compCatererPrice, compCost, compProfit });
              }
            }
          } catch (err) {
            // If JSON is invalid, skip item
            console.error('Invalid mix item custom_details for order', order.id, item.id, err);
          }
          totalProfit += mixProfit;
        }
      }
    }

    connection.release();

    // Optionally round final profit to 2 decimals
    totalProfit = Number(totalProfit.toFixed(2));
    deliveredRevenue = Number(deliveredRevenue.toFixed(2));

    res.json({
      success: true,
      data: {
        today: {
          ...todayStats[0],
          total_profit: totalProfit,
          delivered_revenue: deliveredRevenue
        },
        month: monthStats[0]
      }
    });
  } catch (error) {
    console.error('Error fetching caterer order stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch caterer order statistics'
    });
  }
};

module.exports = {
  getCatererOrderStats,
};
