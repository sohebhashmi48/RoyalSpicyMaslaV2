const { pool } = require('../config/database.cjs');
const { createOrUpdateCustomer } = require('../customers/customersController.cjs');


// Generate unique order number
const generateOrderNumber = async () => {
  try {
    const connection = await pool.getConnection();
    
    // Get the latest order number
    const [rows] = await connection.execute(
      'SELECT order_number FROM orders ORDER BY id DESC LIMIT 1'
    );
    
    let nextNumber = 1001;
    if (rows.length > 0) {
      const lastOrderNumber = rows[0].order_number;
      const lastNumber = parseInt(lastOrderNumber.replace('ORD', ''));
      nextNumber = lastNumber + 1;
    }
    
    connection.release();
    return `ORD${nextNumber}`;
  } catch (error) {
    console.error('Error generating order number:', error);
    return `ORD${Date.now()}`;
  }
};

// Get all orders with pagination and filtering
const getOrders = async (req, res) => {
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
      whereConditions.push('o.status = ?');
      queryParams.push(status);
    }
    
    if (source && source !== 'all') {
      whereConditions.push('o.order_source = ?');
      queryParams.push(source);
    }
    
    if (search) {
      whereConditions.push('(o.order_number LIKE ? OR o.customer_name LIKE ? OR o.customer_phone LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (date_from) {
      whereConditions.push('DATE(o.created_at) >= ?');
      queryParams.push(date_from);
    }
    
    if (date_to) {
      whereConditions.push('DATE(o.created_at) <= ?');
      queryParams.push(date_to);
    }
    
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // Get total count
    const [countResult] = await connection.execute(`
      SELECT COUNT(*) as total FROM orders o ${whereClause}
    `, queryParams);
    
    const totalOrders = countResult[0].total;
    
    // Get orders with items count
    const offset = (page - 1) * limit;

    // Build the final query with proper parameter handling
    // Note: profit calculation for mix items is complex and handled in frontend
    let finalQuery = `
      SELECT
        o.*,
        (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) as item_count,
        0 as profit
      FROM orders o
      ${whereClause}
      ORDER BY o.created_at DESC
    `;

    let finalParams = [...queryParams];

    // Add pagination if needed
    if (limit && limit > 0) {
      finalQuery += ` LIMIT ${parseInt(limit)}`;
      if (offset && offset > 0) {
        finalQuery += ` OFFSET ${parseInt(offset)}`;
      }
    }

    const [orders] = await connection.execute(finalQuery, finalParams);
    
    connection.release();
    
    res.json({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalOrders,
        pages: Math.ceil(totalOrders / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

// Get single order with items
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();
    
    // Get order details
    const [orderRows] = await connection.execute(
      'SELECT * FROM orders WHERE id = ?',
      [id]
    );
    
    if (orderRows.length === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Get order items with product images and cost information
    // For custom items without product_id, try to match by product name
    const [itemRows] = await connection.execute(`
      SELECT
        oi.*,
        COALESCE(p1.product_images, p2.product_images) as product_images,
        COALESCE(p1.retail_price, p2.retail_price) as product_retail_price,
        COALESCE(inv1.average_cost_per_kg, inv2.average_cost_per_kg, 0) as average_cost_price
      FROM order_items oi
      LEFT JOIN products p1 ON oi.product_id = p1.id
      LEFT JOIN products p2 ON oi.product_id IS NULL AND LOWER(oi.product_name) = LOWER(p2.name)
      LEFT JOIN inventory_summary inv1 ON oi.product_id = inv1.product_id
      LEFT JOIN inventory_summary inv2 ON p2.id = inv2.product_id
      WHERE oi.order_id = ?
      ORDER BY oi.id
    `, [id]);
    
    // Get status history
    const [historyRows] = await connection.execute(
      'SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at DESC',
      [id]
    );
    
    connection.release();

    // Process items to include product images
    const processedItems = itemRows.map(item => {
      let productImage = null;
      if (item.product_images) {
        try {
          // Check if it's already a JSON string or a direct URL
          let images;
          if (typeof item.product_images === 'string') {
            // Try to parse as JSON first
            if (item.product_images.startsWith('[') || item.product_images.startsWith('{')) {
              images = JSON.parse(item.product_images);
            } else {
              // It's a direct URL string
              images = [item.product_images];
            }
          } else {
            images = item.product_images;
          }

          if (images && images.length > 0) {
            const imageUrl = images[0];
            if (imageUrl.startsWith('http')) {
              productImage = imageUrl;
            } else if (imageUrl.startsWith('/api/')) {
              productImage = `http://localhost:5000${imageUrl}`;
            } else {
              productImage = `http://localhost:5000/api/products/images/${imageUrl}`;
            }
          }
        } catch (e) {
          console.error('Error parsing product images:', e);
          // If parsing fails, treat as direct URL
          if (typeof item.product_images === 'string') {
            if (item.product_images.startsWith('http')) {
              productImage = item.product_images;
            } else if (item.product_images.startsWith('/api/')) {
              productImage = `http://localhost:5000${item.product_images}`;
            }
          }
        }
      }

      return {
        ...item,
        product_image: productImage
      };
    });

    const order = {
      ...orderRows[0],
      items: processedItems,
      status_history: historyRows
    };



    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: error.message
    });
  }
};

// Create new order
const createOrder = async (req, res) => {
  try {
    const {
      customer_name,
      customer_phone,
      customer_email,
      delivery_address,
      notes,
      cart_items,
      subtotal,
      delivery_fee,
      total_amount,
      order_source = 'online'
    } = req.body;
    
    // Validate required fields
    if (!customer_name || !customer_phone || !delivery_address || !cart_items || cart_items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: customer_name, customer_phone, delivery_address, cart_items'
      });
    }
    
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      // Generate order number
      const order_number = await generateOrderNumber();
      
      console.log('🔥 [ORDER CREATION] Generated order number:', order_number);
      
      // Insert order
      const [orderResult] = await connection.execute(`
        INSERT INTO orders (
          order_number, customer_name, customer_phone, customer_email,
          delivery_address, notes, subtotal, delivery_fee, total_amount, order_source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        order_number, customer_name, customer_phone, customer_email,
        delivery_address, notes, subtotal, delivery_fee, total_amount, order_source
      ]);
      
      const orderId = orderResult.insertId;
      console.log('🔥 [ORDER CREATION] Order inserted with ID:', orderId);
      
      // Insert order items
      // Insert order items
      for (const item of cart_items) {
        // Store custom details for custom items and mix details for mix items
        let customDetails = null;
        if (item.isCustom) {
          customDetails = {
            originalEnteredAmount: item.originalEnteredAmount,
            originalRetailPrice: item.originalRetailPrice,
            displayName: item.displayName
          };
        } else if (item.isMix) {
          // Handle mix items - check different possible data structures
          let mixItems = [];
          let mixNumber = null;
          let totalBudget = item.price;

          if (item.mixDetails && item.mixDetails.items) {
            mixItems = item.mixDetails.items;
            totalBudget = item.mixDetails.totalBudget || item.price;
            mixNumber = item.id.replace('mix-', '');
          } else if (item.mixItems) {
            mixItems = item.mixItems;
            mixNumber = item.mixNumber || item.id.replace('mix-', '');
          }

          customDetails = {
            mixItems: mixItems,
            mixNumber: mixNumber,
            totalWeight: item.totalWeight || item.quantity,
            totalBudget: totalBudget,
            itemCount: mixItems.length
          };


        }
        
        // Handle product_id - ensure it's a valid integer or null
        let productId = null;
        if (item.product_id) {
          const parsedId = parseInt(item.product_id);
          if (!isNaN(parsedId) && parsedId > 0) {
            productId = parsedId;
          }
        } else if (item.id && !item.isMix && !item.isCustom) {
          // Only try to parse regular product IDs, not mix or custom items
          const parsedId = parseInt(item.id);
          if (!isNaN(parsedId) && parsedId > 0) {
            productId = parsedId;
          }
        }
        // For mix items and custom items, product_id will remain null (which is allowed)

        await connection.execute(`
          INSERT INTO order_items (
            order_id, product_id, product_name, quantity, unit,
            unit_price, total_price, source, mix_number, is_custom, custom_details
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          orderId,
          productId,
          item.name,
          item.quantity,
          item.unit || 'kg',
          item.price,
          item.originalEnteredAmount || (item.price * item.quantity),
          item.isMix ? 'mix-calculator' : (item.isCustom ? 'custom' : 'manual'),
          item.mixNumber || null,
          item.isCustom || false,
          customDetails ? JSON.stringify(customDetails) : null
        ]);


      }
      
      // Add initial status history
      await connection.execute(`
        INSERT INTO order_status_history (order_id, new_status, notes)
        VALUES (?, 'pending', 'Order created')
      `, [orderId]);
      
      console.log('🔥 [ORDER CREATION] Order created successfully:', { orderId, order_number });
      
      await connection.commit();
      connection.release();
      
      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: {
          id: orderId,
          order_number,
          status: 'pending'
        }
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
};

// Update order status
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, changed_by, payment } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Get current status
      const [currentOrder] = await connection.execute(
        'SELECT status FROM orders WHERE id = ?',
        [id]
      );

      if (currentOrder.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }

      const oldStatus = currentOrder[0].status;

      // Update order status and timestamps
      let updateFields = ['status = ?'];
      let updateValues = [status];

      if (status === 'confirmed') {
        updateFields.push('confirmed_at = CURRENT_TIMESTAMP');
        if (changed_by) {
          updateFields.push('confirmed_by = ?');
          updateValues.push(changed_by);
        }
      } else if (status === 'delivered') {
        updateFields.push('delivered_at = CURRENT_TIMESTAMP');
      } else if (status === 'cancelled') {
        updateFields.push('cancelled_at = CURRENT_TIMESTAMP');
      }

      updateValues.push(id);

      await connection.execute(`
        UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?
      `, updateValues);

      // Add status history
      await connection.execute(`
        INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, notes)
        VALUES (?, ?, ?, ?, ?)
      `, [id, oldStatus, status, changed_by, notes]);

      // If status is delivered, create customer bill
      if (status === 'delivered' && oldStatus !== 'delivered') {
        console.log('🔥 [BILL CREATION] Attempting to create bill for delivered order:', {
          orderId: id,
          oldStatus,
          newStatus: status,
          timestamp: new Date().toISOString()
        });

        try {
          // Get order details with items
          const [orderResult] = await connection.execute(`
            SELECT o.*,
                   GROUP_CONCAT(
                     JSON_OBJECT(
                       'product_name', oi.product_name,
                       'quantity', oi.quantity,
                       'unit', oi.unit,
                       'unit_price', oi.unit_price,
                       'total_price', oi.total_price
                     )
                   ) as order_items
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.id = ?
            GROUP BY o.id
          `, [id]);

          if (orderResult.length > 0) {
            const order = orderResult[0];
            console.log('🔥 [BILL CREATION] Retrieved order details:', { orderId: id, orderNumber: order.order_number });

            // Create or update customer
            const customerId = await createOrUpdateCustomer(order);

            // Parse order items
            let orderItems = [];
            if (order.order_items) {
              try {
                orderItems = JSON.parse(`[${order.order_items}]`);
              } catch (e) {
                console.error('Error parsing order items:', e);
                orderItems = [];
              }
            }

            // Check if bill already exists for this order - CRITICAL FIX TO PREVENT DUPLICATES
            const [existingBills] = await connection.execute(`
              SELECT id, bill_number FROM customer_bills WHERE order_id = ?
            `, [id]);

            console.log('🔥 [BILL CREATION] Existing bills check:', {
              orderId: id,
              existingBills: existingBills.map(b => ({ id: b.id, number: b.bill_number }))
            });

            if (existingBills.length > 0) {
              console.log(`🔥 [BILL CREATION] Bill already exists for order ${order.order_number}, skipping creation`);
              // Update existing bill amounts if needed (in case of order modifications)
              await connection.execute(`
                UPDATE customer_bills
                SET
                  subtotal = ?,
                  delivery_fee = ?,
                  total_amount = ?,
                  pending_amount = ?,
                  updated_at = CURRENT_TIMESTAMP
                WHERE order_id = ?
              `, [
                order.subtotal || 0,
                order.delivery_fee || 0,
                order.total_amount,
                order.total_amount,
                id
              ]);
              console.log(`🔥 [BILL CREATION] Updated existing bill amounts for order ${order.order_number}`);
            } else {
              console.log('🔥 [BILL CREATION] No existing bill found, creating new bill...');
              // Generate bill number
              const billNumber = `BILL-${Date.now()}`;

              // Create customer bill
              const [billResult] = await connection.execute(`
                INSERT INTO customer_bills (
                  customer_id, order_id, bill_number, bill_date,
                  order_items, subtotal, delivery_fee, total_amount, pending_amount, due_date
                ) VALUES (?, ?, ?, CURDATE(), ?, ?, ?, ?, ?, DATE_ADD(CURDATE(), INTERVAL 30 DAY))
              `, [
                customerId,
                id,
                billNumber,
                JSON.stringify(orderItems),
                order.subtotal || 0,
                order.delivery_fee || 0,
                order.total_amount,
                order.total_amount
              ]);
              const billId = billResult.insertId;
              console.log('🔥 [BILL CREATION] Bill created successfully:', { billId, billNumber, orderId: id });

              // Automatically record payment for the full bill amount
              const paymentAmount = order.total_amount;
              
              // Create payment record with receipt upload placeholder
              await connection.execute(`
                INSERT INTO customer_payments (
                  customer_id, bill_id, payment_date, amount,
                  payment_method, reference_number, notes, receipt_url
                ) VALUES (?, ?, CURDATE(), ?, 'full_payment', ?, ?, ?)
              `, [
                customerId,
                billId,
                paymentAmount,
                `Payment for order ${order.order_number} (Bill ${billNumber})`,
                `/api/receipts/bill-${billId}.pdf` // Placeholder for receipt upload
              ]);

              // Update bill status to 'paid' since full payment is recorded
              await connection.execute(`
                UPDATE customer_bills
                SET
                  paid_amount = ?,
                  pending_amount = 0,
                  status = 'paid',
                  updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
              `, [paymentAmount, billId]);

              // Update customer totals
              await connection.execute(`
                UPDATE customers
                SET
                  total_paid = total_paid + ?,
                  outstanding_balance = outstanding_balance - ?,
                  updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
              `, [paymentAmount, paymentAmount, customerId]);

              console.log('🔥 [BILL CREATION] Automatic payment recorded for bill:', { billId, amount: paymentAmount });
            }

            // If payment was provided, record it
            if (payment && payment.amount > 0) {
              const paymentAmount = parseFloat(payment.amount);

              // Create payment record
              await connection.execute(`
                INSERT INTO customer_payments (
                  customer_id, bill_id, payment_date, amount,
                  payment_method, reference_number, notes
                ) VALUES (?, ?, CURDATE(), ?, ?, ?, ?)
              `, [
                customerId,
                billId,
                paymentAmount,
                payment.paymentMethod || 'cash',
                payment.referenceNumber || null,
                payment.notes || `Payment for order ${order.order_number}`
              ]);

              // Update bill status and amounts
              await connection.execute(`
                UPDATE customer_bills
                SET
                  paid_amount = paid_amount + ?,
                  pending_amount = pending_amount - ?,
                  status = CASE
                    WHEN pending_amount - ? <= 0.01 THEN 'paid'
                    WHEN paid_amount + ? > 0 THEN 'partial'
                    ELSE 'pending'
                  END,
                  updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
              `, [paymentAmount, paymentAmount, paymentAmount, paymentAmount, billId]);

              // Update customer totals
              await connection.execute(`
                UPDATE customers
                SET
                  total_paid = total_paid + ?,
                  outstanding_balance = outstanding_balance - ?,
                  updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
              `, [paymentAmount, paymentAmount, customerId]);
            }
          }
        } catch (billError) {
          console.error('Error creating customer bill:', billError);
          // Don't fail the status update if bill creation fails
        }
      }

      await connection.commit();
      connection.release();

      res.json({
        success: true,
        message: 'Order status updated successfully'
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
};

// Get order statistics
const getOrderStats = async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const {
      date_from,
      date_to
    } = req.query;

    let whereConditions = [];
    let queryParams = [];

    // Build WHERE conditions for date filtering
    if (date_from) {
      whereConditions.push('DATE(created_at) >= ?');
      queryParams.push(date_from);
    }

    if (date_to) {
      whereConditions.push('DATE(created_at) <= ?');
      queryParams.push(date_to);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get status counts
    const [statusCounts] = await connection.execute(`
      SELECT
        status,
        COUNT(*) as count,
        SUM(total_amount) as total_value,
        SUM(CASE WHEN status = 'delivered' THEN total_amount ELSE 0 END) as delivered_revenue
      FROM orders
      ${whereClause}
      GROUP BY status
    `, queryParams);

    // Get today's orders
    const [todayStats] = await connection.execute(`
      SELECT
        COUNT(*) as today_orders,
        COALESCE(SUM(total_amount), 0) as today_revenue
      FROM orders
      WHERE DATE(created_at) = CURDATE()
    `);

    // Get monthly stats
    const [monthlyStats] = await connection.execute(`
      SELECT
        COUNT(*) as month_orders,
        COALESCE(SUM(total_amount), 0) as month_revenue,
        COALESCE(SUM(CASE WHEN status = 'delivered' THEN total_amount ELSE 0 END), 0) as month_delivered_revenue
      FROM orders
      WHERE YEAR(created_at) = YEAR(CURDATE())
      AND MONTH(created_at) = MONTH(CURDATE())
    `);

    // Get delivered orders profit (calculated from actual inventory costs) with date filtering
    const deliveredWhereClause = whereConditions.length > 0
      ? `WHERE o.status = 'delivered' AND ${whereConditions.join(' AND ')}`
      : `WHERE o.status = 'delivered'`;

    // Calculate profit manually to handle mix items properly
    const [deliveredOrders] = await connection.execute(`
      SELECT o.id, o.total_amount
      FROM orders o
      ${deliveredWhereClause}
    `, queryParams);

    let totalProfit = 0;
    let deliveredRevenue = 0;

    for (const order of deliveredOrders) {
      deliveredRevenue += parseFloat(order.total_amount);

      // Get order items with cost data
      const [orderItems] = await connection.execute(`
        SELECT
          oi.*,
          COALESCE(inv1.average_cost_per_kg, inv2.average_cost_per_kg, 0) as average_cost_price
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.id
        LEFT JOIN inventory_summary inv1 ON oi.product_id = inv1.product_id
        LEFT JOIN inventory_summary inv2 ON oi.product_id IS NULL AND LOWER(oi.product_name) = LOWER(p.name) AND inv2.product_id = p.id
        WHERE oi.order_id = ?
      `, [order.id]);

      // Calculate profit for each item
      for (const item of orderItems) {
        const quantity = parseFloat(item.quantity) || 0;
        const unitPrice = parseFloat(item.unit_price) || 0;
        const costPrice = parseFloat(item.average_cost_price) || 0;

        // Handle mix items specially
        if (item.source === 'mix-calculator' && item.custom_details) {
          try {
            const customDetails = typeof item.custom_details === 'string'
              ? JSON.parse(item.custom_details)
              : item.custom_details;

            if (customDetails.mixItems) {
              let mixProfit = 0;

              for (const mixItem of customDetails.mixItems) {
                const mixQuantity = parseFloat(mixItem.calculatedQuantity || mixItem.quantity || 0);
                const mixRetailPrice = parseFloat(mixItem.price || 0);

                // Look up cost price from inventory_summary by product name
                const [costData] = await connection.execute(`
                  SELECT inv.average_cost_per_kg
                  FROM inventory_summary inv
                  JOIN products p ON inv.product_id = p.id
                  WHERE LOWER(p.name) = LOWER(?)
                  LIMIT 1
                `, [mixItem.name]);

                const mixCostPrice = costData.length > 0 ? parseFloat(costData[0].average_cost_per_kg || 0) : 0;

                if (mixCostPrice > 0) {
                  const mixItemProfit = (mixRetailPrice - mixCostPrice) * mixQuantity;
                  if (mixItemProfit > 0) {
                    mixProfit += mixItemProfit;
                  }
                }
              }
              totalProfit += mixProfit;
            }
          } catch (e) {
            console.error('Error parsing mix item custom_details:', e);
          }
        } else {
          // Regular item profit calculation
          if (costPrice > 0) {
            const profitPerUnit = unitPrice - costPrice;
            const itemProfit = profitPerUnit * quantity;

            if (itemProfit > 0) {
              totalProfit += itemProfit;
            }
          }
        }
      }
    }

    const deliveredStats = [{
      delivered_orders: deliveredOrders.length,
      delivered_revenue: deliveredRevenue,
      total_profit: totalProfit
    }];

    connection.release();

    // Format response
    const stats = {
      total: 0,
      pending: 0,
      confirmed: 0,
      processing: 0,
      out_for_delivery: 0,
      delivered: 0,
      cancelled: 0,
      total_revenue: 0,
      delivered_revenue: deliveredStats[0].delivered_revenue,
      delivered_orders: deliveredStats[0].delivered_orders,
      totalProfit: deliveredStats[0].total_profit,
      today: todayStats[0],
      monthly: monthlyStats[0]
    };

    statusCounts.forEach(row => {
      stats[row.status] = row.count;
      stats.total += row.count;
      stats.total_revenue += parseFloat(row.total_value || 0);
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching order stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order statistics',
      error: error.message
    });
  }
};

module.exports = {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  getOrderStats
};
