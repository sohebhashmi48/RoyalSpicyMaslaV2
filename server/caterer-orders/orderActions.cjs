const pool = require('./db.cjs');

// Generate unique order number
const generateCatererOrderNumber = async () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  // Get count of orders today for sequence
  const [rows] = await pool.execute(`
    SELECT COUNT(*) as count 
    FROM caterer_orders
    WHERE DATE(created_at) = CURDATE()
  `);

  const sequence = String(rows[0].count + 1).padStart(3, '0');
  return `CAT-${year}${month}${day}-${sequence}`;
};

// Get caterer order by ID with items
const getCatererOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await pool.getConnection();

    // Get order details with payment information - FIXED JOINS
    const [orderRows] = await connection.execute(`
      SELECT
        co.*,
        COALESCE(SUM(cp.amount), 0) as total_paid_amount,
        COALESCE(co.total_amount, 0) as order_total_amount,
        COALESCE(co.payment_method, '') as order_payment_method,
        COALESCE(co.payment_status, '') as order_payment_status,
        COALESCE(co.payment_amount, 0) as advance_payment_amount
      FROM caterer_orders co
      LEFT JOIN caterer_bills cb ON cb.caterer_order_id = co.id
      LEFT JOIN caterer_payments cp ON cp.bill_id = cb.id
      WHERE co.id = ?
      GROUP BY co.id
    `, [id]);

    if (orderRows.length === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'Caterer order not found'
      });
    }

    const order = orderRows[0];

    // Get order items with product images and cost information
    const [itemRows] = await connection.execute(`
      SELECT
        coi.*,
        COALESCE(p1.product_images, p2.product_images) as product_images,
        COALESCE(p1.retail_price, p2.retail_price) as product_retail_price,
        COALESCE(inv1.average_cost_per_kg, inv2.average_cost_per_kg, 0) as average_cost_price
      FROM caterer_order_items coi
      LEFT JOIN products p1 ON coi.product_id = p1.id
      LEFT JOIN products p2 ON coi.product_id IS NULL AND coi.product_name = p2.name
      LEFT JOIN inventory_summary inv1 ON coi.product_id = inv1.product_id
      LEFT JOIN inventory_summary inv2 ON p2.id = inv2.product_id
      WHERE coi.caterer_order_id = ?
      ORDER BY coi.id
    `, [id]);

    connection.release();

    // Process items to include product images
    const processedItems = itemRows.map(item => {
      let productImage = null;
      if (item.product_images) {
        try {
          let images;
          if (typeof item.product_images === 'string') {
            if (item.product_images.startsWith('[') || item.product_images.startsWith('{')) {
              images = JSON.parse(item.product_images);
            } else {
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

    const finalOrder = {
      ...order,
      items: processedItems
    };

    res.json({
      success: true,
      data: finalOrder
    });
  } catch (error) {
    console.error('Error fetching caterer order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch caterer order'
    });
  }
};

// Create new caterer order - NO BILL CREATION HERE
const createCatererOrder = async (req, res) => {
  try {
    const {
      caterer_name,
      contact_person,
      caterer_phone,
      caterer_email,
      caterer_address,
      gst_number,
      notes,
      cart_items,
      subtotal,
      delivery_fee,
      total_amount,
      order_source = 'caterer_online',
      payment_amount = 0,
      payment_method = 'later'
    } = req.body;

    // Convert undefined values to null for database compatibility
    const safeEmail = caterer_email || null;
    const safeGstNumber = gst_number || null;
    const safeNotes = notes || null;

    // Validate required fields
    if (!caterer_name || !contact_person || !caterer_phone || !caterer_address || !cart_items || cart_items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: caterer_name, contact_person, caterer_phone, caterer_address, cart_items'
      });
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Check if caterer exists, if not create it automatically
      console.log('🔍 [CATERER CHECK] Checking if caterer exists with phone:', caterer_phone);
      const [existingCaterer] = await connection.execute(`
        SELECT id FROM caterers WHERE phone_number = ?
      `, [caterer_phone]);

      let catererId;
      if (existingCaterer.length === 0) {
        console.log('📝 [CATERER CHECK] Caterer not found, creating new caterer automatically...');
        console.log('📝 [CATERER CHECK] Caterer data to be created:', {
          caterer_name,
          contact_person,
          caterer_phone,
          caterer_email: safeEmail,
          caterer_address,
          gst_number: safeGstNumber
        });

        // Create new caterer
        const [catererResult] = await connection.execute(`
          INSERT INTO caterers (
            caterer_name, contact_person, phone_number, email, address, gst_number
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          caterer_name.trim(),
          contact_person.trim(),
          caterer_phone.trim(),
          safeEmail,
          caterer_address,
          safeGstNumber
        ]);

        catererId = catererResult.insertId;
        console.log('✅ [CATERER CHECK] New caterer created with ID:', catererId);
      } else {
        catererId = existingCaterer[0].id;
        console.log('✅ [CATERER CHECK] Existing caterer found with ID:', catererId);
      }

      // Generate order number
      const order_number = await generateCatererOrderNumber();

      console.log('🔍 [ORDER CREATION] Order data being inserted:', {
        order_number, caterer_name, contact_person, caterer_phone, safeEmail,
        caterer_address, safeGstNumber, safeNotes, subtotal, delivery_fee, total_amount, order_source,
        payment_amount, payment_method, catererId
      });

      console.log('🔍 [ORDER CREATION] Caterer validation check completed. Caterer ID:', catererId);
      console.log('🔍 [ORDER CREATION] About to insert order into caterer_orders table...');

      // Map payment method from frontend to database values
      const dbPaymentMethod = payment_method === 'half' || payment_method === 'later' ? 'bank_transfer' : payment_method;

      // Calculate payment status
      const paymentStatus = payment_amount >= total_amount ? 'paid' :
        payment_amount > 0 ? 'partial' : 'pending';

      console.log('🔍 [PAYMENT PROCESSING] Payment calculation details:', {
        receivedPaymentAmount: payment_amount,
        orderTotalAmount: total_amount,
        mappedPaymentMethod: dbPaymentMethod,
        calculatedPaymentStatus: paymentStatus,
        paymentMethodFromFrontend: payment_method
      });

      // Validate payment amount doesn't exceed total
      if (payment_amount > total_amount) {
        console.error('❌ [PAYMENT PROCESSING] Payment amount exceeds order total:', {
          paymentAmount: payment_amount,
          totalAmount: total_amount,
          difference: payment_amount - total_amount
        });
        await connection.rollback();
        connection.release();
        return res.status(400).json({
          success: false,
          message: `Payment amount (₹${payment_amount.toFixed(2)}) cannot exceed order total (₹${total_amount.toFixed(2)})`
        });
      }

      // Insert caterer order with payment information
      const [orderResult] = await connection.execute(`
        INSERT INTO caterer_orders (
          order_number, caterer_name, contact_person, caterer_phone, caterer_email,
          caterer_address, gst_number, notes, subtotal, delivery_fee, total_amount, order_source,
          payment_method, payment_status, payment_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        order_number, caterer_name, contact_person, caterer_phone, safeEmail,
        caterer_address, safeGstNumber, safeNotes, subtotal, delivery_fee, total_amount, order_source,
        dbPaymentMethod, paymentStatus, payment_amount
      ]);

      const catererOrderId = orderResult.insertId;

      console.log('✅ [ORDER CREATION] Order inserted successfully with ID:', catererOrderId);
      console.log('🔍 [ORDER CREATION] Now inserting order items...');

      // Insert order items
      for (const item of cart_items) {
        let productId = null;

        // For mix items, product_id should be null since they're virtual products
        if (item.isMix) {
          productId = null;
        } else {
          productId = item.product_id || null;

          // If no product_id, try to find by name
          if (!productId && item.name) {
            const [productRows] = await connection.execute(`
              SELECT id FROM products WHERE name = ?
            `, [item.name]);

            if (productRows.length > 0) {
              productId = productRows[0].id;
            }
          }
        }

        // Prepare custom details for mix items
        let customDetails = null;
        if (item.isMix && item.mixDetails) {
          customDetails = {
            mixDetails: item.mixDetails,
            components: item.components || []
          };
        } else if (item.isCustom && item.customDetails) {
          customDetails = item.customDetails;
        }

        await connection.execute(`
          INSERT INTO caterer_order_items (
            caterer_order_id, product_id, product_name, quantity, unit,
            unit_price, total_price, source, mix_number, is_custom, custom_details
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          catererOrderId,
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

      // ✅ NO BILL CREATION HERE - Bills will ONLY be created when order status changes to 'delivered'

      await connection.commit();
      connection.release();

      console.log('✅ [ORDER CREATION] Order creation completed successfully!');
      console.log('🔍 [ORDER CREATION] Final order details:', {
        orderId: catererOrderId,
        orderNumber: order_number,
        catererId: catererId,
        catererName: caterer_name,
        paymentAmount: payment_amount,
        paymentStatus: paymentStatus
      });

      res.status(201).json({
        success: true,
        message: 'Caterer order created successfully',
        data: {
          id: catererOrderId,
          order_number,
          payment_amount: payment_amount,
          payment_status: paymentStatus
        }
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Error creating caterer order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create caterer order'
    });
  }
};

// Update caterer order status - SINGLE BILL CREATION ONLY WHEN DELIVERED
const updateCatererOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, confirmed_by } = req.body;

    const validStatuses = ['pending', 'confirmed', 'processing', 'ready', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const connection = await pool.getConnection();

    // Build update query based on status
    let updateFields = ['status = ?', 'updated_at = NOW()'];
    let updateValues = [status];

    if (status === 'confirmed' && confirmed_by) {
      updateFields.push('confirmed_at = NOW()', 'confirmed_by = ?');
      updateValues.push(confirmed_by);
    } else if (status === 'delivered') {
      updateFields.push('delivered_at = NOW()');
    } else if (status === 'cancelled') {
      updateFields.push('cancelled_at = NOW()');
    }

    updateValues.push(id);

    const [result] = await connection.execute(`
      UPDATE caterer_orders
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, updateValues);

    if (result.affectedRows === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'Caterer order not found'
      });
    }

    // ✅ CREATE SINGLE BILL ONLY WHEN DELIVERED
    if (status === 'delivered') {
      console.log('🔥 [SINGLE BILL CREATION] Creating bill for delivered order:', { orderId: id });

      try {
        // Get complete order details from caterer_orders table
        const [orderRows] = await connection.execute(`
          SELECT
            co.*,
            c.id as caterer_id
          FROM caterer_orders co
          LEFT JOIN caterers c ON CAST(co.caterer_phone AS CHAR) = CAST(c.phone_number AS CHAR)
          WHERE co.id = ?
        `, [id]);

        if (orderRows.length > 0) {
          const order = orderRows[0];

          // Check if bill already exists - PREVENT DUPLICATES
          const [existingBills] = await connection.execute(`
            SELECT id, bill_number FROM caterer_bills WHERE caterer_order_id = ?
          `, [id]);

          if (existingBills.length > 0) {
            console.log(`🔥 [SINGLE BILL] Bill already exists for order ${order.order_number}`);
          } else {
            // Create SINGLE bill using data from caterer_orders table
            const billNumber = `BILL-${order.order_number}-${Date.now()}`;
            
            const [billResult] = await connection.execute(`
              INSERT INTO caterer_bills (
                caterer_id, caterer_order_id, bill_number, bill_date,
                subtotal, total_amount, paid_amount, pending_amount, status
              ) VALUES (?, ?, ?, CURDATE(), ?, ?, ?, ?, ?)
            `, [
              order.caterer_id,
              order.id,
              billNumber,
              order.subtotal,           // From caterer_orders.subtotal
              order.total_amount,       // From caterer_orders.total_amount
              order.payment_amount,     // From caterer_orders.payment_amount
              order.total_amount - order.payment_amount, // Calculated pending
              order.payment_amount >= order.total_amount ? 'paid' : 
              order.payment_amount > 0 ? 'partial' : 'pending'
            ]);

            const billId = billResult.insertId;

            // Create payment record ONLY if advance payment was made
            if (order.payment_amount > 0) {
              await connection.execute(`
                INSERT INTO caterer_payments (
                  caterer_id, bill_id, amount, payment_method, payment_date,
                  reference_number, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
              `, [
                order.caterer_id,
                billId,
                order.payment_amount,     // From caterer_orders.payment_amount
                order.payment_method,     // From caterer_orders.payment_method
                order.created_at,         // Payment date = order creation date
                `ADV-${order.order_number}`,
                `Advance payment for order ${order.order_number}`
              ]);
            }

            console.log(`✅ [SINGLE BILL] Created bill: ${billNumber} - Total: ₹${order.total_amount}, Paid: ₹${order.payment_amount}, Pending: ₹${order.total_amount - order.payment_amount}`);
          }
        }
      } catch (billError) {
        console.error('🔥 [SINGLE BILL] Error creating bill:', billError);
        // Don't fail the status update if bill creation fails
      }
    }

    connection.release();

    res.json({
      success: true,
      message: 'Caterer order status updated successfully'
    });
  } catch (error) {
    console.error('Error updating caterer order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update caterer order status'
    });
  }
};

module.exports = {
  getCatererOrderById,
  createCatererOrder,
  updateCatererOrderStatus,
};
