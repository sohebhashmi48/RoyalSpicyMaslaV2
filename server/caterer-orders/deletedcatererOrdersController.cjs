// const mysql = require('mysql2/promise');

// // Database connection pool
// const pool = mysql.createPool({
//   host: process.env.DB_HOST || 'localhost',
//   user: process.env.DB_USER || 'root',
//   password: process.env.DB_PASSWORD || '',
//   database: process.env.DB_NAME || 'royal_spicy_masala',
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0
// });

// // Generate unique order number
// const generateCatererOrderNumber = async () => {
//   const now = new Date();
//   const year = now.getFullYear();
//   const month = String(now.getMonth() + 1).padStart(2, '0');
//   const day = String(now.getDate()).padStart(2, '0');
  
//   // Get count of orders today for sequence
//   const [rows] = await pool.execute(`
//     SELECT COUNT(*) as count 
//     FROM caterer_orders
//     WHERE DATE(created_at) = CURDATE()
//   `);
  
//   const sequence = String(rows[0].count + 1).padStart(3, '0');
//   return `CAT-${year}${month}${day}-${sequence}`;
// };

// // Get all caterer orders with pagination and filtering
// const getCatererOrders = async (req, res) => {
//   try {
//     const connection = await pool.getConnection();
    
//     const {
//       page = 1,
//       limit = 50,
//       status,
//       source,
//       search,
//       date_from,
//       date_to
//     } = req.query;
    
//     let whereConditions = [];
//     let queryParams = [];
    
//     // Build WHERE conditions
//     if (status && status !== 'all') {
//       // Special handling for pending status - show all pending orders regardless of date
//       if (status === 'pending') {
//         whereConditions.push('status = ?');
//         queryParams.push(status);
//         // Don't add date filters for pending orders - show all pending orders
//       } else {
//         whereConditions.push('status = ?');
//         queryParams.push(status);
//         // Apply date filters for other statuses
//         if (date_from && date_to) {
//           if (date_from === date_to) {
//             // Same date - filter for that specific date
//             whereConditions.push('DATE(created_at) = ?');
//             queryParams.push(date_from);
//           } else {
//             // Date range
//             whereConditions.push('DATE(created_at) >= ? AND DATE(created_at) <= ?');
//             queryParams.push(date_from, date_to);
//           }
//         } else if (date_from) {
//           whereConditions.push('DATE(created_at) >= ?');
//           queryParams.push(date_from);
//         } else if (date_to) {
//           whereConditions.push('DATE(created_at) <= ?');
//           queryParams.push(date_to);
//         }
//       }
//     } else {
//       // For 'all' status, apply date filters normally
//       if (date_from && date_to) {
//         if (date_from === date_to) {
//           // Same date - filter for that specific date
//           whereConditions.push('DATE(created_at) = ?');
//           queryParams.push(date_from);
//         } else {
//           // Date range
//           whereConditions.push('DATE(created_at) >= ? AND DATE(created_at) <= ?');
//           queryParams.push(date_from, date_to);
//         }
//       } else if (date_from) {
//         whereConditions.push('DATE(created_at) >= ?');
//         queryParams.push(date_from);
//       } else if (date_to) {
//         whereConditions.push('DATE(created_at) <= ?');
//         queryParams.push(date_to);
//       }
//     }

//     if (source && source !== 'all') {
//       whereConditions.push('order_source = ?');
//       queryParams.push(source);
//     }

//     if (search) {
//       whereConditions.push('(order_number LIKE ? OR caterer_name LIKE ? OR caterer_phone LIKE ?)');
//       const searchTerm = `%${search}%`;
//       queryParams.push(searchTerm, searchTerm, searchTerm);
//     }
    
//     const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

//     // Debug logging removed for production

//     // Test if table exists first
//     try {
//       const [tableCheck] = await connection.execute(`
//         SELECT COUNT(*) as count FROM caterer_orders LIMIT 1
//       `);
//       console.log('✅ Table exists, count:', tableCheck[0].count);
//     } catch (tableError) {
//       console.error('❌ Table does not exist or error:', tableError.message);
//       connection.release();
//       return res.status(500).json({
//         success: false,
//         message: 'Caterer orders table not found'
//       });
//     }

//     // Get total count using simple query
//     let total = 0;
//     try {
//       if (whereConditions.length === 0) {
//         const [countRows] = await connection.execute(`SELECT COUNT(*) as total FROM caterer_orders`);
//         total = countRows[0].total;
//       } else {
//         // Build a safe query string for counting
//         const countQuery = `SELECT COUNT(*) as total FROM caterer_orders ${whereClause}`;
//         const [countRows] = await connection.execute(countQuery, queryParams);
//         total = countRows[0].total;
//       }
//     } catch (countError) {
//       console.error('❌ Count query error:', countError.message);
//       total = 0;
//     }

//     // Calculate pagination
//     const offset = (page - 1) * limit;

//     // Get orders with calculated item counts and quantities
//     let orderRows = [];
//     try {
//       if (whereConditions.length === 0) {
//         const query = `
//           SELECT
//             co.*,
//             COALESCE(item_stats.item_count, 0) as item_count,
//             COALESCE(item_stats.total_quantity, 0) as total_quantity
//           FROM caterer_orders co
//           LEFT JOIN (
//             SELECT
//               caterer_order_id,
//               COUNT(*) as item_count,
//               SUM(quantity) as total_quantity
//             FROM caterer_order_items
//             GROUP BY caterer_order_id
//           ) item_stats ON co.id = item_stats.caterer_order_id
//           ORDER BY co.created_at DESC
//           LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
//         `;
//         [orderRows] = await connection.execute(query);
//       } else {
//         const query = `
//           SELECT
//             co.*,
//             COALESCE(item_stats.item_count, 0) as item_count,
//             COALESCE(item_stats.total_quantity, 0) as total_quantity
//           FROM caterer_orders co
//           LEFT JOIN (
//             SELECT
//               caterer_order_id,
//               COUNT(*) as item_count,
//               SUM(quantity) as total_quantity
//             FROM caterer_order_items
//             GROUP BY caterer_order_id
//           ) item_stats ON co.id = item_stats.caterer_order_id
//           ${whereClause}
//           ORDER BY co.created_at DESC
//           LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
//         `;
//         [orderRows] = await connection.execute(query, queryParams);
//       }
//     } catch (queryError) {
//       console.error('❌ Main query error:', queryError.message);
//       orderRows = [];
//     }
    
//     connection.release();
    
//     res.json({
//       success: true,
//       data: orderRows,
//       pagination: {
//         page: parseInt(page),
//         limit: parseInt(limit),
//         total,
//         pages: Math.ceil(total / limit)
//       }
//     });
//   } catch (error) {
//     console.error('Error fetching caterer orders:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch caterer orders'
//     });
//   }
// };

// // Get caterer order by ID with items
// const getCatererOrderById = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const connection = await pool.getConnection();
    
//     // Get order details with payment information
//     const [orderRows] = await connection.execute(`
//       SELECT
//         co.*,
//         COALESCE(SUM(cp.amount), 0) as total_paid_amount,
//         COALESCE(co.total_amount, 0) as order_payment_amount,
//         COALESCE(co.payment_method, '') as order_payment_method,
//         COALESCE(co.payment_status, '') as order_payment_status
//       FROM caterer_orders co
//       LEFT JOIN caterer_payments cp ON co.id = cp.bill_id
//       WHERE co.id = ?
//       GROUP BY co.id
//     `, [id]);
    
//     if (orderRows.length === 0) {
//       connection.release();
//       return res.status(404).json({
//         success: false,
//         message: 'Caterer order not found'
//       });
//     }
    
//     const order = orderRows[0];
    
//     // Get order items with product images and cost information
//     const [itemRows] = await connection.execute(`
//       SELECT
//         coi.*,
//         COALESCE(p1.product_images, p2.product_images) as product_images,
//         COALESCE(p1.retail_price, p2.retail_price) as product_retail_price,
//         COALESCE(inv1.average_cost_per_kg, inv2.average_cost_per_kg, 0) as average_cost_price
//       FROM caterer_order_items coi
//       LEFT JOIN products p1 ON coi.product_id = p1.id
//       LEFT JOIN products p2 ON coi.product_id IS NULL AND coi.product_name = p2.name
//       LEFT JOIN inventory_summary inv1 ON coi.product_id = inv1.product_id
//       LEFT JOIN inventory_summary inv2 ON p2.id = inv2.product_id
//       WHERE coi.caterer_order_id = ?
//       ORDER BY coi.id
//     `, [id]);
    
//     connection.release();

//     // Process items to include product images (same logic as customer orders)
//     const processedItems = itemRows.map(item => {
//       let productImage = null;
//       if (item.product_images) {
//         try {
//           // Check if it's already a JSON string or a direct URL
//           let images;
//           if (typeof item.product_images === 'string') {
//             // Try to parse as JSON first
//             if (item.product_images.startsWith('[') || item.product_images.startsWith('{')) {
//               images = JSON.parse(item.product_images);
//             } else {
//               // It's a direct URL string
//               images = [item.product_images];
//             }
//           } else {
//             images = item.product_images;
//           }

//           if (images && images.length > 0) {
//             const imageUrl = images[0];
//             if (imageUrl.startsWith('http')) {
//               productImage = imageUrl;
//             } else if (imageUrl.startsWith('/api/')) {
//               productImage = `http://localhost:5000${imageUrl}`;
//             } else {
//               productImage = `http://localhost:5000/api/products/images/${imageUrl}`;
//             }
//           }
//         } catch (e) {
//           console.error('Error parsing product images:', e);
//           // If parsing fails, treat as direct URL
//           if (typeof item.product_images === 'string') {
//             if (item.product_images.startsWith('http')) {
//               productImage = item.product_images;
//             } else if (item.product_images.startsWith('/api/')) {
//               productImage = `http://localhost:5000${item.product_images}`;
//             }
//           }
//         }
//       }

//       return {
//         ...item,
//         product_image: productImage
//       };
//     });

//     const finalOrder = {
//       ...order,
//       items: processedItems
//     };

//     res.json({
//       success: true,
//       data: finalOrder
//     });
//   } catch (error) {
//     console.error('Error fetching caterer order:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch caterer order'
//     });
//   }
// };

// // Create new caterer order
// const createCatererOrder = async (req, res) => {
//   try {
//     const {
//       caterer_name,
//       contact_person,
//       caterer_phone,
//       caterer_email,
//       caterer_address,
//       gst_number,
//       notes,
//       cart_items,
//       subtotal,
//       delivery_fee,
//       total_amount,
//       order_source = 'caterer_online',
//       payment_amount = 0,
//       payment_method = 'later'
//     } = req.body;

//     // Convert undefined values to null for database compatibility
//     const safeEmail = caterer_email || null;
//     const safeGstNumber = gst_number || null;
//     const safeNotes = notes || null;
    
//     // Validate required fields
//     if (!caterer_name || !contact_person || !caterer_phone || !caterer_address || !cart_items || cart_items.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Missing required fields: caterer_name, contact_person, caterer_phone, caterer_address, cart_items'
//       });
//     }
    
//     const connection = await pool.getConnection();
//     await connection.beginTransaction();
    
//     try {
//       // Generate order number
//       const order_number = await generateCatererOrderNumber();
      
//       // Debug log the values being inserted
//       console.log('🔍 Order data being inserted:', {
//         order_number, caterer_name, contact_person, caterer_phone, safeEmail,
//         caterer_address, safeGstNumber, safeNotes, subtotal, delivery_fee, total_amount, order_source,
//         payment_amount, payment_method
//       });

//       // Map payment method from frontend to database values
//       const dbPaymentMethod = payment_method === 'half' || payment_method === 'later' ? 'bank_transfer' : payment_method;
      
//       // Insert caterer order with payment information
//       const [orderResult] = await connection.execute(`
//         INSERT INTO caterer_orders (
//           order_number, caterer_name, contact_person, caterer_phone, caterer_email,
//           caterer_address, gst_number, notes, subtotal, delivery_fee, total_amount, order_source,
//           payment_method, payment_status
//         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//       `, [
//         order_number, caterer_name, contact_person, caterer_phone, safeEmail,
//         caterer_address, safeGstNumber, safeNotes, subtotal, delivery_fee, total_amount, order_source,
//         dbPaymentMethod, payment_amount >= total_amount ? 'paid' :
//         payment_amount > 0 ? 'partial' : 'unpaid'
//       ]);
      
//       const catererOrderId = orderResult.insertId;
      
//       // Insert order items
//       for (const item of cart_items) {
//         // Try to find product by name if no ID provided
//         let productId = null;

//         // For mix items, product_id should be null since they're virtual products
//         if (item.isMix) {
//           productId = null;
//         } else {
//           // For regular items, try to get product_id
//           productId = item.product_id || null;

//           // If no product_id, try to find by name
//           if (!productId && item.name) {
//             const [productRows] = await connection.execute(`
//               SELECT id FROM products WHERE name = ?
//             `, [item.name]);

//             if (productRows.length > 0) {
//               productId = productRows[0].id;
//             }
//           }
//         }
        
//         // Prepare custom details for mix items
//         let customDetails = null;
//         if (item.isMix && item.mixDetails) {
//           customDetails = {
//             mixDetails: item.mixDetails,
//             components: item.components || []
//           };
//         } else if (item.isCustom && item.customDetails) {
//           customDetails = item.customDetails;
//         }

//         await connection.execute(`
//           INSERT INTO caterer_order_items (
//             caterer_order_id, product_id, product_name, quantity, unit,
//             unit_price, total_price, source, mix_number, is_custom, custom_details
//           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//         `, [
//           catererOrderId,
//           productId,
//           item.name,
//           item.quantity,
//           item.unit || 'kg',
//           item.price,
//           item.originalEnteredAmount || (item.price * item.quantity),
//           item.isMix ? 'mix-calculator' : (item.isCustom ? 'custom' : 'manual'),
//           item.mixNumber || null,
//           item.isCustom || false,
//           customDetails ? JSON.stringify(customDetails) : null
//         ]);
//       }
      
//       // Create or update caterer record (only update basic info, not stats)
//       await connection.execute(`
//         INSERT INTO caterers (caterer_name, contact_person, phone_number, email, address, gst_number)
//         VALUES (?, ?, ?, ?, ?, ?)
//         ON DUPLICATE KEY UPDATE
//           caterer_name = VALUES(caterer_name),
//           contact_person = VALUES(contact_person),
//           email = VALUES(email),
//           address = VALUES(address),
//           gst_number = VALUES(gst_number),
//           updated_at = NOW()
//       `, [caterer_name, contact_person, caterer_phone, safeEmail, caterer_address, safeGstNumber]);
      
//       await connection.commit();
//       connection.release();
      
//       res.status(201).json({
//         success: true,
//         message: 'Caterer order created successfully',
//         data: {
//           id: catererOrderId,
//           order_number
//         }
//       });
//     } catch (error) {
//       await connection.rollback();
//       connection.release();
//       throw error;
//     }
//   } catch (error) {
//     console.error('Error creating caterer order:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to create caterer order'
//     });
//   }
// };

// // Update caterer order status
// const updateCatererOrderStatus = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { status, confirmed_by } = req.body;

//     const validStatuses = ['pending', 'confirmed', 'processing', 'ready', 'delivered', 'cancelled'];
//     if (!validStatuses.includes(status)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid status'
//       });
//     }

//     const connection = await pool.getConnection();

//     // Build update query based on status
//     let updateFields = ['status = ?', 'updated_at = NOW()'];
//     let updateValues = [status];

//     if (status === 'confirmed' && confirmed_by) {
//       updateFields.push('confirmed_at = NOW()', 'confirmed_by = ?');
//       updateValues.push(confirmed_by);
//     } else if (status === 'delivered') {
//       updateFields.push('delivered_at = NOW()');
//     } else if (status === 'cancelled') {
//       updateFields.push('cancelled_at = NOW()');
//     }

//     updateValues.push(id);

//     const [result] = await connection.execute(`
//       UPDATE caterer_orders
//       SET ${updateFields.join(', ')}
//       WHERE id = ?
//     `, updateValues);

//     if (result.affectedRows === 0) {
//       connection.release();
//       return res.status(404).json({
//         success: false,
//         message: 'Caterer order not found'
//       });
//     }

//     // If status is delivered, create a bill for this order
//     if (status === 'delivered') {
//       try {
//         // Get order details
//         const [orderRows] = await connection.execute(`
//           SELECT co.*, c.id as caterer_id
//           FROM caterer_orders co
//           LEFT JOIN caterers c ON co.caterer_phone = c.phone_number
//           WHERE co.id = ?
//         `, [id]);

//         if (orderRows.length > 0) {
//           const order = orderRows[0];
          
//           // Generate bill number
//           const billNumber = `BILL-${order.id}-${Date.now()}`;
          
//           // Calculate payment amounts
//           // Since payment_amount column doesn't exist in schema, we'll check payment_status
//           let orderPaymentAmount = 0;
//           if (order.payment_status === 'paid') {
//             orderPaymentAmount = parseFloat(order.total_amount) || 0;
//           } else if (order.payment_status === 'partial') {
//             // For partial payments, we need to get the actual payment amount
//             // This is a limitation since we don't store the payment_amount in the order
//             // For now, we'll assume it's half of the total amount
//             orderPaymentAmount = (parseFloat(order.total_amount) || 0) / 2;
//           }
          
//           const totalAmount = parseFloat(order.total_amount) || 0;
//           const remainingAmount = Math.max(0, totalAmount - orderPaymentAmount);
          
//           // Create bill with proper payment status
//           await connection.execute(`
//             INSERT INTO caterer_bills (
//               caterer_id, caterer_order_id, bill_number, bill_date,
//               subtotal, total_amount, paid_amount, pending_amount, status
//             ) VALUES (?, ?, ?, CURDATE(), ?, ?, ?, ?, ?)
//           `, [
//             order.caterer_id || id, // Use caterer_id if available, otherwise use order_id as fallback
//             order.id,
//             billNumber,
//             order.subtotal || 0,
//             totalAmount,
//             orderPaymentAmount,
//             remainingAmount,
//             remainingAmount > 0 ? 'pending' : 'paid'
//           ]);
          
//           console.log(`✅ Created bill ${billNumber} for order ${order.order_number} with amount ₹${totalAmount}, paid: ₹${orderPaymentAmount}, remaining: ₹${remainingAmount}`);
//         }
//       } catch (billError) {
//         console.error('Error creating bill for delivered order:', billError);
//         // Don't fail the status update if bill creation fails
//       }
//     }

//     connection.release();

//     res.json({
//       success: true,
//       message: 'Caterer order status updated successfully'
//     });
//   } catch (error) {
//     console.error('Error updating caterer order status:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to update caterer order status'
//     });
//   }
// };

// // Get caterer order statistics
// const getCatererOrderStats = async (req, res) => {
//   try {
//     const { date_from, date_to } = req.query;
//     const connection = await pool.getConnection();

//     // Determine date filter for stats
//     let dateFilter = '';
//     let dateParams = [];
    
//     if (date_from && date_to) {
//       if (date_from === date_to) {
//         // Same date - filter for that specific date
//         dateFilter = 'DATE(created_at) = ?';
//         dateParams = [date_from];
//       } else {
//         // Date range
//         dateFilter = 'DATE(created_at) >= ? AND DATE(created_at) <= ?';
//         dateParams = [date_from, date_to];
//       }
//     } else if (date_from) {
//       dateFilter = 'DATE(created_at) >= ?';
//       dateParams = [date_from];
//     } else if (date_to) {
//       dateFilter = 'DATE(created_at) <= ?';
//       dateParams = [date_to];
//     } else {
//       // Default to today if no dates provided
//       dateFilter = 'DATE(created_at) = CURDATE()';
//     }

//     // Get filtered stats
//     const [todayStats] = await connection.execute(`
//       SELECT
//         COUNT(*) as total_orders,
//         COALESCE(SUM(total_amount), 0) as total_revenue,
//         COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
//         COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_orders,
//         COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_orders,
//         COUNT(CASE WHEN status = 'ready' THEN 1 END) as ready_orders,
//         COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders
//       FROM caterer_orders
//       WHERE ${dateFilter}
//     `, dateParams.length > 0 ? dateParams : []);

//     // Get this month's stats (unchanged, as it's not date-specific)
//     const [monthStats] = await connection.execute(`
//       SELECT
//         COUNT(*) as total_orders,
//         COALESCE(SUM(total_amount), 0) as total_revenue
//       FROM caterer_orders
//       WHERE YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())
//     `);

//     // Calculate profit for delivered orders only (filtered by date)
//     const [deliveredOrders] = await connection.execute(`
//       SELECT id, total_amount
//       FROM caterer_orders
//       WHERE status = 'delivered' AND ${dateFilter}
//     `, dateParams.length > 0 ? dateParams : []);

//     let totalProfit = 0;
//     let deliveredRevenue = 0;

//     // Calculate profit for each delivered order
//     for (const order of deliveredOrders) {
//       deliveredRevenue += parseFloat(order.total_amount) || 0;

//       // Get order items with cost information
//       const [orderItems] = await connection.execute(`
//         SELECT
//           coi.*,
//           COALESCE(inv1.average_cost_per_kg, inv2.average_cost_per_kg, 0) as average_cost_price
//         FROM caterer_order_items coi
//         LEFT JOIN products p1 ON coi.product_id = p1.id
//         LEFT JOIN products p2 ON coi.product_id IS NULL AND coi.product_name = p2.name
//         LEFT JOIN inventory_summary inv1 ON coi.product_id = inv1.product_id
//         LEFT JOIN inventory_summary inv2 ON p2.id = inv2.product_id
//         WHERE coi.caterer_order_id = ?
//       `, [order.id]);

//       // Calculate profit for each item
//       for (const item of orderItems) {
//         const unitPrice = parseFloat(item.unit_price) || 0;
//         const quantity = parseFloat(item.quantity) || 0;
//         const costPrice = parseFloat(item.average_cost_price) || 0;

//         // Check if this is a mix item
//         if (item.is_mix && item.custom_details) {
//           try {
//             const mixDetails = JSON.parse(item.custom_details);
//             let mixProfit = 0;

//             if (mixDetails.components && Array.isArray(mixDetails.components)) {
//               for (const component of mixDetails.components) {
//                 const compQuantity = parseFloat(component.quantity) || 0;
//                 const compCatererPrice = parseFloat(component.caterer_price) || 0;

//                 // Get cost price for mix component
//                 const [compCost] = await connection.execute(`
//                   SELECT COALESCE(inv.average_cost_per_kg, 0) as cost_price
//                   FROM products p
//                   LEFT JOIN inventory_summary inv ON p.id = inv.product_id
//                   WHERE p.id = ? OR p.name = ?
//                   LIMIT 1
//                 `, [component.product_id, component.name]);

//                 const compCostPrice = compCost.length > 0 ? parseFloat(compCost[0].cost_price) || 0 : 0;

//                 if (compCostPrice > 0) {
//                   const compProfitPerUnit = compCatererPrice - compCostPrice;
//                   const compProfit = compProfitPerUnit * compQuantity;
//                   if (compProfit > 0) {
//                     mixProfit += compProfit;
//                   }
//                 }
//               }
//             }

//             if (mixProfit > 0) {
//               totalProfit += mixProfit;
//             }
//           } catch (e) {
//             console.error('Error parsing mix item custom_details:', e);
//           }
//         } else {
//           // Regular item profit calculation
//           if (costPrice > 0) {
//             const profitPerUnit = unitPrice - costPrice;
//             const itemProfit = profitPerUnit * quantity;

//             if (itemProfit > 0) {
//               totalProfit += itemProfit;
//             }
//           }
//         }
//       }
//     }

//     connection.release();

//     res.json({
//       success: true,
//       data: {
//         today: {
//           ...todayStats[0],
//           total_profit: totalProfit,
//           delivered_revenue: deliveredRevenue
//         },
//         month: monthStats[0]
//       }
//     });
//   } catch (error) {
//     console.error('Error fetching caterer order stats:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch caterer order statistics'
//     });
//   }
// };

// // Helper function to create bills for delivered orders that don't have bills yet
// const createBillsForDeliveredOrders = async (connection) => {
//   try {
//     // Find delivered orders without bills
//     const [deliveredOrders] = await connection.execute(`
//       SELECT co.*
//       FROM caterer_orders co
//       LEFT JOIN caterer_bills cb ON co.id = cb.caterer_order_id
//       WHERE co.status = 'delivered' AND cb.id IS NULL
//     `);

//     console.log(`📊 Found ${deliveredOrders.length} delivered orders without bills`);

//     for (const order of deliveredOrders) {
//       console.log(`🔍 Processing order ${order.id}:`, {
//         order_number: order.order_number,
//         total_amount: order.total_amount,
//         subtotal: order.subtotal,
//         caterer_name: order.caterer_name,
//         caterer_phone: order.caterer_phone
//       });

//       // First, find or create caterer in caterers table
//       let catererId;

//       // Try to find existing caterer by phone
//       const [existingCaterer] = await connection.execute(`
//         SELECT id FROM caterers WHERE phone_number = ?
//       `, [order.caterer_phone]);

//       if (existingCaterer.length > 0) {
//         catererId = existingCaterer[0].id;
//         console.log(`📋 Found existing caterer ID: ${catererId} for phone: ${order.caterer_phone}`);
//       } else {
//         // Create new caterer
//         const [catererResult] = await connection.execute(`
//           INSERT INTO caterers (
//             caterer_name, contact_person, phone_number, email, address, gst_number
//           ) VALUES (?, ?, ?, ?, ?, ?)
//         `, [
//           order.caterer_name,
//           order.contact_person,
//           order.caterer_phone,
//           order.caterer_email || null,
//           order.caterer_address,
//           order.gst_number || null
//         ]);

//         catererId = catererResult.insertId;
//         console.log(`✅ Created new caterer ID: ${catererId} for ${order.caterer_name}`);
//       }

//       // Generate bill number
//       const billNumber = `BILL-${order.id}-${Date.now()}`;

//       // Use subtotal if total_amount is 0
//       const billAmount = order.total_amount || order.subtotal || 0;

//       console.log(`💰 Bill amounts for order ${order.order_number}:`, {
//         total_amount: order.total_amount,
//         subtotal: order.subtotal,
//         using_amount: billAmount
//       });

//       // Calculate payment amounts based on order payment status
//       let orderPaymentAmount = 0;
//       if (order.payment_status === 'paid') {
//         orderPaymentAmount = billAmount;
//       } else if (order.payment_status === 'partial') {
//         // For partial payments, we need to get the actual payment amount
//         // This is a limitation since we don't store the payment_amount in the order
//         // For now, we'll assume it's half of the total amount
//         orderPaymentAmount = billAmount / 2;
//       }
      
//       const remainingAmount = Math.max(0, billAmount - orderPaymentAmount);
      
//       // Create bill with proper payment status
//       await connection.execute(`
//         INSERT INTO caterer_bills (
//           caterer_id, caterer_order_id, bill_number, bill_date,
//           subtotal, total_amount, paid_amount, pending_amount, status
//         ) VALUES (?, ?, ?, CURDATE(), ?, ?, ?, ?, ?)
//       `, [
//         catererId,
//         order.id,
//         billNumber,
//         order.subtotal || 0,
//         billAmount,
//         orderPaymentAmount,
//         remainingAmount,
//         remainingAmount > 0 ? 'pending' : 'paid'
//       ]);

//       console.log(`✅ Created bill ${billNumber} for order ${order.order_number} with amount ₹${billAmount}, paid: ₹${orderPaymentAmount}, remaining: ₹${remainingAmount}`);
//     }
//   } catch (error) {
//     console.error('Error creating bills for delivered orders:', error);
//   }
// };

// // Get caterer history with real bills and payments data
// const getCatererHistory = async (req, res) => {
//   try {
//     console.log('📊 Fetching caterer history...');

//     const {
//       status = 'all', // all, pending, partial, paid, overdue
//       search = '',
//       min_amount = '',
//       max_amount = '',
//       page = 1,
//       limit = 50
//     } = req.query;

//     const connection = await pool.getConnection();

//     // First, check if we need to create bills for delivered orders
//     await createBillsForDeliveredOrders(connection);

//     // Build where conditions
//     let whereConditions = [];
//     let queryParams = [];

//     // Status filter - these don't need parameters since they're direct conditions
//     if (status !== 'all') {
//       if (status === 'pending_caterers') {
//         // Show caterers with any pending bills
//         whereConditions.push('cb.pending_amount > 0');
//       } else if (status === 'pending') {
//         // Show bills with full pending amount
//         whereConditions.push('cb.pending_amount > 0 AND (cb.paid_amount IS NULL OR cb.paid_amount = 0)');
//       } else if (status === 'partial') {
//         // Show bills with partial payment
//         whereConditions.push('cb.paid_amount > 0 AND cb.pending_amount > 0');
//       } else if (status === 'paid') {
//         // Show fully paid bills
//         whereConditions.push('cb.pending_amount <= 0');
//       } else if (status === 'overdue') {
//         // Show overdue bills (you might want to add a due_date check here)
//         whereConditions.push('cb.pending_amount > 0 AND cb.due_date < CURDATE()');
//       } else {
//         // For other statuses, use the status column directly
//         whereConditions.push('cb.status = ?');
//         queryParams.push(status);
//       }
//     }

//     // Search filter (caterer name, contact person, phone, bill number)
//     if (search.trim()) {
//       whereConditions.push(`(
//         cb.bill_number LIKE ? OR
//         co.caterer_name LIKE ? OR
//         co.contact_person LIKE ? OR
//         co.caterer_phone LIKE ?
//       )`);
//       const searchTerm = `%${search.trim()}%`;
//       queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
//     }

//     // Amount filters
//     if (min_amount && !isNaN(parseFloat(min_amount))) {
//       whereConditions.push('cb.total_amount >= ?');
//       queryParams.push(parseFloat(min_amount));
//     }
//     if (max_amount && !isNaN(parseFloat(max_amount))) {
//       whereConditions.push('cb.total_amount <= ?');
//       queryParams.push(parseFloat(max_amount));
//     }

//     const whereClause = whereConditions.length > 0
//       ? `WHERE ${whereConditions.join(' AND ')}`
//       : '';

//     // Get total count for pagination
//     const countQuery = `
//       SELECT COUNT(DISTINCT cb.id) as total
//       FROM caterer_bills cb
//       LEFT JOIN caterer_orders co ON cb.caterer_order_id = co.id
//       ${whereClause}
//     `;

//     console.log('📊 Count query:', countQuery);
//     console.log('📊 Count params:', queryParams);

//     const [countResult] = await connection.execute(countQuery, queryParams);
//     const total = countResult[0].total;

//     // Calculate pagination
//     const pageNum = parseInt(page) || 1;
//     const limitNum = parseInt(limit) || 20;
//     const offset = (pageNum - 1) * limitNum;

//     // Get caterer bills with order details, items, and payment info
//     let billsQuery;
//     let bills;

//     // Check if we have actual parameters (not just WHERE conditions without parameters)
//     if (queryParams.length === 0) {
//       // No parameters needed - use string interpolation for everything
//       billsQuery = `
//         SELECT
//           cb.*,
//           co.order_number,
//           co.caterer_name,
//           co.contact_person,
//           co.caterer_phone,
//           co.caterer_email,
//           co.caterer_address,
//           co.gst_number,
//           co.delivered_at,
//           co.created_at as order_created_at
//         FROM caterer_bills cb
//         LEFT JOIN caterer_orders co ON cb.caterer_order_id = co.id
//         ${whereClause}
//         ORDER BY cb.created_at DESC, cb.bill_date DESC
//         LIMIT ${limitNum} OFFSET ${offset}
//       `;
      
//       console.log('📊 Final query (no params):', billsQuery);
//       [bills] = await connection.query(billsQuery);
//     } else {
//       // Has actual parameters - use prepared statements
//       billsQuery = `
//         SELECT
//           cb.*,
//           co.order_number,
//           co.caterer_name,
//           co.contact_person,
//           co.caterer_phone,
//           co.caterer_email,
//           co.caterer_address,
//           co.gst_number,
//           co.delivered_at,
//           co.created_at as order_created_at
//         FROM caterer_bills cb
//         LEFT JOIN caterer_orders co ON cb.caterer_order_id = co.id
//         ${whereClause}
//         ORDER BY cb.created_at DESC, cb.bill_date DESC
//         LIMIT ? OFFSET ?
//       `;
      
//       const finalParams = [...queryParams, limitNum, offset];
//       console.log('📊 Final query (with params):', billsQuery);
//       console.log('📊 Final params:', finalParams);
//       [bills] = await connection.execute(billsQuery, finalParams);
//     }

//     console.log('📊 Raw bills result:', bills.length);

//     // Debug: Log first bill data
//     if (bills.length > 0) {
//       console.log('🔍 First bill data:', {
//         id: bills[0].id,
//         bill_number: bills[0].bill_number,
//         total_amount: bills[0].total_amount,
//         subtotal: bills[0].subtotal,
//         pending_amount: bills[0].pending_amount,
//         order_number: bills[0].order_number,
//         caterer_order_id: bills[0].caterer_order_id
//       });
//     }

//     // If no bills found, return empty result
//     if (!bills || bills.length === 0) {
//       connection.release();
//       return res.json({
//         success: true,
//         data: [],
//         pagination: {
//           page: parseInt(page),
//           limit: parseInt(limit),
//           total: 0,
//           pages: 0
//         }
//       });
//     }

//     // Process the bills to add items and payment history
//     const processedBills = await Promise.all(bills.map(async (bill) => {
//       // Get items for this bill
//       const [items] = await connection.execute(`
//         SELECT
//           coi.*
//         FROM caterer_order_items coi
//         WHERE coi.caterer_order_id = ?
//         ORDER BY coi.id
//       `, [bill.caterer_order_id]);

//       // Process items to parse mix components
//       const processedItems = items.map(item => {
//         let parsedItem = { ...item };

//         // If it's a mix item and has custom_details, parse the mix components
//         if (item.custom_details) {
//           try {
//             const customDetails = typeof item.custom_details === 'string'
//               ? JSON.parse(item.custom_details)
//               : item.custom_details;

//             if (customDetails && customDetails.mixItems) {
//               parsedItem.mix_components = customDetails.mixItems;
//             }
//           } catch (error) {
//             console.error(`Error parsing custom_details for item ${item.id}:`, error);
//           }
//         }

//         return parsedItem;
//       });

//       console.log(`🛒 Items for bill ${bill.bill_number} (order ${bill.caterer_order_id}):`, {
//         items_count: processedItems.length,
//         items: processedItems.map(item => ({
//           id: item.id,
//           product_name: item.product_name,
//           quantity: item.quantity,
//           unit_price: item.unit_price,
//           total_price: item.total_price,
//           mix_number: item.mix_number,
//           source: item.source,
//           has_mix_components: !!item.mix_components,
//           mix_components_count: item.mix_components ? item.mix_components.length : 0
//         }))
//       });

//       // Get payment history for this bill
//       const [payments] = await connection.execute(`
//         SELECT
//           cp.*
//         FROM caterer_payments cp
//         WHERE cp.bill_id = ?
//         ORDER BY cp.payment_date DESC, cp.created_at DESC
//       `, [bill.id]);

//       return {
//         ...bill,
//         items: processedItems || [],
//         payment_history: payments || [],
//         // Calculate status based on amounts
//         status: bill.pending_amount <= 0 ? 'paid' :
//                 bill.paid_amount > 0 ? 'partial' : 'pending'
//       };
//     }));

//     connection.release();

//     res.json({
//       success: true,
//       data: processedBills,
//       pagination: {
//         page: parseInt(page),
//         limit: parseInt(limit),
//         total,
//         pages: Math.ceil(total / parseInt(limit))
//       }
//     });
//   } catch (error) {
//     console.error('Error fetching caterer history:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch caterer history'
//     });
//   }
// };

// // Get caterer history statistics
// const getCatererHistoryStats = async (req, res) => {
//   try {
//     const connection = await pool.getConnection();

//     // Get overall statistics
//     const [stats] = await connection.execute(`
//       SELECT
//         COUNT(DISTINCT cb.id) as total_bills,
//         COUNT(DISTINCT cb.caterer_id) as unique_caterers,
//         COALESCE(SUM(cb.total_amount), 0) as total_revenue,
//         COALESCE(SUM(cb.paid_amount), 0) as total_paid,
//         COALESCE(SUM(cb.pending_amount), 0) as total_pending,
//         COUNT(CASE WHEN cb.status = 'pending' THEN 1 END) as pending_bills,
//         COUNT(CASE WHEN cb.status = 'partial' THEN 1 END) as partial_bills,
//         COUNT(CASE WHEN cb.status = 'paid' THEN 1 END) as paid_bills,
//         COUNT(CASE WHEN cb.status = 'overdue' THEN 1 END) as overdue_bills,
//         COUNT(CASE WHEN cb.pending_amount > 0 THEN 1 END) as bills_with_pending_amount
//       FROM caterer_bills cb
//     `);

//     connection.release();

//     res.json({
//       success: true,
//       data: stats[0]
//     });
//   } catch (error) {
//     console.error('Error fetching caterer history stats:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch caterer history statistics'
//     });
//   }
// };

// // Record payment for caterer bill
// const recordCatererPayment = async (req, res) => {
//   try {
//     // For FormData (file uploads), we need to extract from req.body and req.file
//     let catererId, billId, amount, paymentMethod, referenceNumber, notes;
    
//     if (req.body && typeof req.body === 'object') {
//       catererId = req.body.catererId;
//       billId = req.body.billId;
//       amount = req.body.amount;
//       paymentMethod = req.body.paymentMethod;
//       referenceNumber = req.body.referenceNumber;
//       notes = req.body.notes;
//     } else {
//       // Fallback for JSON requests
//       const body = JSON.parse(req.body);
//       catererId = body.catererId;
//       billId = body.billId;
//       amount = body.amount;
//       paymentMethod = body.paymentMethod;
//       referenceNumber = body.referenceNumber;
//       notes = body.notes;
//     }

//     console.log('📝 Payment data received:', {
//       catererId,
//       billId,
//       amount,
//       paymentMethod,
//       referenceNumber,
//       notes,
//       hasFile: !!req.file
//     });

//     // Validate required fields
//     if (!amount || !paymentMethod || !catererId) {
//       return res.status(400).json({
//         success: false,
//         message: 'Missing required fields: amount, paymentMethod, catererId'
//       });
//     }

//     const connection = await pool.getConnection();
//     await connection.beginTransaction();

//     try {
//       let bill = null;
//       let actualBillId = billId; // Store the original billId
      
//       // If billId is provided, get specific bill
//       if (billId) {
//         const [billRows] = await connection.execute(`
//           SELECT * FROM caterer_bills WHERE id = ?
//         `, [billId]);

//         if (billRows.length === 0) {
//           await connection.rollback();
//           connection.release();
//           return res.status(404).json({
//             success: false,
//             message: 'Bill not found'
//           });
//         }
//         bill = billRows[0];
//       } else if (catererId) {
//         // If no specific bill, find the oldest pending bill for this caterer
//         const [billRows] = await connection.execute(`
//           SELECT * FROM caterer_bills
//           WHERE caterer_id = ? AND pending_amount > 0
//           ORDER BY bill_date ASC, created_at ASC
//           LIMIT 1
//         `, [catererId]);

//         if (billRows.length === 0) {
//           // No pending bills found, we'll create one after getting order details
//           console.log('📝 No pending bills found for caterer:', catererId);
//           bill = null;
//         } else {
//           bill = billRows[0];
//           actualBillId = bill.id;
//         }
//       }
      
//       const paymentAmount = parseFloat(amount);
      
//       // If no bill exists, create one from the order
//       if (!bill) {
//         // Get the order details to create a bill
//         const [orderRows] = await connection.execute(`
//           SELECT * FROM caterer_orders WHERE caterer_id = ?
//         `, [catererId]); // Use caterer_id to find associated orders
        
//         if (orderRows.length === 0) {
//           await connection.rollback();
//           connection.release();
//           return res.status(404).json({
//             success: false,
//             message: 'Order not found'
//           });
//         }
        
//         const order = orderRows[0];
        
//         // Get or create caterer
//         let catererRecordId = null;
//         const [catererRows] = await connection.execute(`
//           SELECT id FROM caterers WHERE phone_number = ?
//         `, [order.caterer_phone]);
        
//         if (catererRows.length > 0) {
//           catererRecordId = catererRows[0].id;
//         } else {
//           // Create new caterer record
//           const [catererResult] = await connection.execute(`
//             INSERT INTO caterers (caterer_name, contact_person, phone_number, email, address)
//             VALUES (?, ?, ?, ?, ?)
//           `, [
//             order.caterer_name,
//             order.contact_person,
//             order.caterer_phone,
//             order.caterer_email,
//             order.caterer_address
//           ]);
//           catererRecordId = catererResult.insertId;
//         }
        
//         // Create a new bill
//         const billNumber = `BILL-${order.id}-${Date.now()}`;
//         const totalAmount = parseFloat(order.total_amount) || 0;
        
//         const [billResult] = await connection.execute(`
//           INSERT INTO caterer_bills (
//             caterer_id, caterer_order_id, bill_number, bill_date,
//             subtotal, total_amount, paid_amount, pending_amount, status
//           ) VALUES (?, ?, ?, CURDATE(), ?, ?, 0, ?, 'pending')
//         `, [
//           catererRecordId,
//           order.id,
//           billNumber,
//           order.subtotal || 0,
//           totalAmount,
//           totalAmount
//         ]);
        
//         actualBillId = billResult.insertId;
        
//         // Get the newly created bill
//         const [newBillRows] = await connection.execute(`
//           SELECT * FROM caterer_bills WHERE id = ?
//         `, [actualBillId]);
        
//         bill = newBillRows[0];
//       }
      
//       // If we just created a bill, the pending amount should be the full amount
//       const currentPendingAmount = bill ? parseFloat(bill.pending_amount) || 0 : parseFloat(amount) || 0;

//       // Validate payment amount
//       if (paymentAmount <= 0) {
//         await connection.rollback();
//         connection.release();
//         return res.status(400).json({
//           success: false,
//           message: 'Payment amount must be greater than 0'
//         });
//       }

//       // Payment should not exceed pending amount
//       if (paymentAmount > currentPendingAmount) {
//         await connection.rollback();
//         connection.release();
//         return res.status(400).json({
//           success: false,
//           message: 'Payment amount cannot exceed pending amount'
//         });
//       }

//       // Handle receipt image if uploaded
//       let receiptImage = null;
//       if (req.file) {
//         receiptImage = req.file.filename;
//       }

//       // Insert payment record
//       await connection.execute(`
//         INSERT INTO caterer_payments (
//           caterer_id, bill_id, amount, payment_method, payment_date,
//           reference_number, notes, receipt_image
//         ) VALUES (?, ?, ?, ?, CURDATE(), ?, ?, ?)
//       `, [
//         bill.caterer_id,
//         actualBillId,
//         paymentAmount,
//         paymentMethod,
//         referenceNumber || null,
//         notes || null,
//         receiptImage
//       ]);

//       // Update bill amounts
//       let newPaidAmount = (parseFloat(bill.paid_amount) || 0) + paymentAmount;
//       let newPendingAmount = (parseFloat(bill.total_amount) || 0) - newPaidAmount;

//       // Ensure pending amount doesn't go negative
//       if (newPendingAmount < 0) {
//         newPendingAmount = 0;
//         // Adjust paid amount to match total if overpaid
//         newPaidAmount = parseFloat(bill.total_amount) || 0;
//       }

//       await connection.execute(`
//         UPDATE caterer_bills
//         SET paid_amount = ?, pending_amount = ?, updated_at = NOW()
//         WHERE id = ?
//       `, [newPaidAmount, newPendingAmount, actualBillId]);

//       // Update bill status based on payment
//       let billStatus = 'partial';
//       if (newPendingAmount <= 0) {
//         billStatus = 'paid';
//       } else if (newPaidAmount === 0) {
//         billStatus = 'pending';
//       }

//       await connection.execute(`
//         UPDATE caterer_bills
//         SET status = ?
//         WHERE id = ?
//       `, [billStatus, actualBillId]);

//       console.log('✅ Payment recorded successfully:', {
//         billId: actualBillId,
//         paymentAmount,
//         newPaidAmount,
//         newPendingAmount,
//         billStatus
//       });

//       await connection.commit();
//       connection.release();

//       res.json({
//         success: true,
//         message: 'Payment recorded successfully',
//         data: {
//           payment_amount: paymentAmount,
//           new_paid_amount: newPaidAmount,
//           new_pending_amount: newPendingAmount,
//           bill_status: billStatus
//         }
//       });

//     } catch (error) {
//       await connection.rollback();
//       connection.release();
//       throw error;
//     }

//   } catch (error) {
//     console.error('Error recording caterer payment:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to record payment'
//     });
//   }
// };

// module.exports = {
//   getCatererOrders,
//   getCatererOrderById,
//   createCatererOrder,
//   updateCatererOrderStatus,
//   getCatererOrderStats,
//   getCatererHistory,
//   getCatererHistoryStats,
//   recordCatererPayment
// };
