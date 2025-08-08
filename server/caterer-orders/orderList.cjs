const pool = require('./db.cjs');

// Get all caterer orders with pagination and filtering
const getCatererOrders = async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const {
      page = 1,
      limit = 50,
      status,
      source,
      search,
      date_from,
      date_to
    } = req.query;

    let whereConditions = [];
    let queryParams = [];

    // Build WHERE conditions
    if (status && status !== 'all') {
      if (status === 'pending') {
        whereConditions.push('status = ?');
        queryParams.push(status);
      } else {
        whereConditions.push('status = ?');
        queryParams.push(status);
        if (date_from && date_to) {
          if (date_from === date_to) {
            whereConditions.push('DATE(co.created_at) = ?');
            queryParams.push(date_from);
          } else {
            whereConditions.push('DATE(co.created_at) >= ? AND DATE(co.created_at) <= ?');
            queryParams.push(date_from, date_to);
          }
        } else if (date_from) {
          whereConditions.push('DATE(co.created_at) >= ?');
          queryParams.push(date_from);
        } else if (date_to) {
          whereConditions.push('DATE(co.created_at) <= ?');
          queryParams.push(date_to);
        }
      }
    } else {
      if (date_from && date_to) {
        if (date_from === date_to) {
          whereConditions.push('DATE(co.created_at) = ?');
          queryParams.push(date_from);
        } else {
          whereConditions.push('DATE(co.created_at) >= ? AND DATE(co.created_at) <= ?');
          queryParams.push(date_from, date_to);
        }
      } else if (date_from) {
        whereConditions.push('DATE(co.created_at) >= ?');
        queryParams.push(date_from);
      } else if (date_to) {
        whereConditions.push('DATE(co.created_at) <= ?');
        queryParams.push(date_to);
      }
    }

    if (source && source !== 'all') {
      whereConditions.push('order_source = ?');
      queryParams.push(source);
    }

    if (search) {
      whereConditions.push('(order_number LIKE ? OR caterer_name LIKE ? OR caterer_phone LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Check if table exists first
    try {
      const [tableCheck] = await connection.execute(`
        SELECT COUNT(*) as count FROM caterer_orders LIMIT 1
      `);
      console.log('✅ Table exists, count:', tableCheck[0].count);
    } catch (tableError) {
      console.error('❌ Table does not exist or error:', tableError.message);
      connection.release();
      return res.status(500).json({
        success: false,
        message: 'Caterer orders table not found'
      });
    }

    // Get total count using simple query
    let total = 0;
    try {
      if (whereConditions.length === 0) {
        const [countRows] = await connection.execute(`SELECT COUNT(*) as total FROM caterer_orders`);
        total = countRows[0].total;
      } else {
        let countWhereClause = whereClause.replace(/DATE\(co\.created_at\)/g, 'DATE(created_at)');
        const countQuery = `SELECT COUNT(*) as total FROM caterer_orders ${countWhereClause}`;
        const [countRows] = await connection.execute(countQuery, queryParams);
        total = countRows[0].total;
      }
    } catch (countError) {
      console.error('❌ Count query error:', countError.message);
      total = 0;
    }

    // Calculate pagination
    const offset = (page - 1) * limit;
    const safeLimit = parseInt(limit);
    const safeOffset = parseInt(offset);

    // Get orders with calculated item counts and quantities
    let orderRows = [];
    try {
      const baseQuery = `
        SELECT
          co.*,
          COALESCE(item_stats.item_count, 0) AS item_count,
          COALESCE(item_stats.total_quantity, 0) AS total_quantity,
          COALESCE(SUM(cp.amount), 0) AS total_paid_amount
        FROM caterer_orders co
        LEFT JOIN (
          SELECT
            caterer_order_id,
            COUNT(*) AS item_count,
            SUM(quantity) AS total_quantity
          FROM caterer_order_items
          GROUP BY caterer_order_id
        ) item_stats ON co.id = item_stats.caterer_order_id
        LEFT JOIN caterer_bills cb ON cb.caterer_order_id = co.id
        LEFT JOIN caterer_payments cp ON cp.bill_id = cb.id
        ${whereClause}
        GROUP BY co.id
        ORDER BY co.created_at DESC
        LIMIT ${safeLimit} OFFSET ${safeOffset}
      `;

      [orderRows] = await connection.execute(baseQuery, queryParams);
    } catch (queryError) {
      console.error('❌ Main query error:', queryError.message);
      console.error('Query params:', queryParams);
      orderRows = [];
    }

    connection.release();

    res.json({
      success: true,
      data: orderRows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching caterer orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch caterer orders'
    });
  }
};

module.exports = {
  getCatererOrders,
};
