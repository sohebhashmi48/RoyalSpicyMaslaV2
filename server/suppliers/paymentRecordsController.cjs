const { pool } = require('../config/database.cjs');

// Get payment records for a specific purchase
const getPaymentRecords = async (req, res) => {
  try {
    const { purchaseId } = req.params;

    if (!purchaseId) {
      return res.status(400).json({
        success: false,
        message: 'Purchase ID is required'
      });
    }

    const query = `
      SELECT 
        pr.id,
        pr.purchase_id,
        pr.payment_amount,
        pr.payment_method,
        pr.payment_date,
        pr.payment_time,
        pr.notes,
        pr.receipt_image,
        pr.created_at,
        pr.updated_at
      FROM payment_records pr
      WHERE pr.purchase_id = ?
      ORDER BY pr.payment_date DESC, pr.payment_time DESC, pr.created_at DESC
    `;

    const [payments] = await pool.execute(query, [purchaseId]);

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Error fetching payment records:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment records',
      error: error.message
    });
  }
};

// Create new payment record
const createPaymentRecord = async (req, res) => {
  try {
    const {
      purchase_id,
      payment_amount,
      payment_method,
      payment_date,
      notes
    } = req.body;

    // Validate required fields
    if (!purchase_id || !payment_amount || !payment_method || !payment_date) {
      return res.status(400).json({
        success: false,
        message: 'Purchase ID, payment amount, payment method, and payment date are required'
      });
    }

    // Validate payment amount is positive
    if (parseFloat(payment_amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be greater than 0'
      });
    }

    // Get current purchase details
    const [purchaseResult] = await pool.execute(
      'SELECT grand_total, amount_pending FROM supplier_purchases WHERE id = ?',
      [purchase_id]
    );

    if (purchaseResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Purchase not found'
      });
    }

    const purchase = purchaseResult[0];
    const currentPending = parseFloat(purchase.amount_pending);
    const paymentAmount = Math.round(parseFloat(payment_amount));

    // Check if payment amount exceeds pending amount
    if (paymentAmount > currentPending) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (₹${paymentAmount}) cannot exceed pending amount (₹${currentPending})`
      });
    }

    // Handle receipt image upload
    let receipt_image = null;
    if (req.files && req.files.receipt_image) {
      receipt_image = req.files.receipt_image[0].filename;
    }

    // Get current time for payment_time
    const currentTime = new Date().toTimeString().split(' ')[0];

    // Insert payment record
    const insertQuery = `
      INSERT INTO payment_records (
        purchase_id, 
        payment_amount, 
        payment_method, 
        payment_date, 
        payment_time,
        notes, 
        receipt_image
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(insertQuery, [
      purchase_id,
      paymentAmount,
      payment_method,
      payment_date,
      currentTime,
      notes || null,
      receipt_image
    ]);

    // Calculate new pending amount and total paid (round to integers)
    const newPendingAmount = Math.round(currentPending - paymentAmount);
    const totalPaid = Math.round(parseFloat(purchase.grand_total) - newPendingAmount);

    // Update purchase record
    const newStatus = newPendingAmount <= 0 ? 'completed' : 'pending';
    
    await pool.execute(
      `UPDATE supplier_purchases SET 
        payment_amount = ?, 
        amount_pending = ?, 
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [totalPaid, newPendingAmount, newStatus, purchase_id]
    );

    // Get the created payment record
    const [createdPayment] = await pool.execute(
      'SELECT * FROM payment_records WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: createdPayment[0],
      purchase_status: {
        total_paid: totalPaid,
        amount_pending: newPendingAmount,
        status: newStatus
      }
    });
  } catch (error) {
    console.error('Error creating payment record:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record payment',
      error: error.message
    });
  }
};

// Update payment record
const updatePaymentRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      payment_amount,
      payment_method,
      payment_date,
      notes
    } = req.body;

    // Get current payment record
    const [currentPaymentResult] = await pool.execute(
      'SELECT * FROM payment_records WHERE id = ?',
      [id]
    );

    if (currentPaymentResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    const currentPayment = currentPaymentResult[0];
    const oldAmount = parseFloat(currentPayment.payment_amount);
    const newAmount = payment_amount ? parseFloat(payment_amount) : oldAmount;

    // Get purchase details
    const [purchaseResult] = await pool.execute(
      'SELECT grand_total, amount_pending FROM supplier_purchases WHERE id = ?',
      [currentPayment.purchase_id]
    );

    const purchase = purchaseResult[0];
    const currentPending = parseFloat(purchase.amount_pending);
    
    // Calculate what the pending amount would be if we revert this payment and apply new amount
    const revertedPending = currentPending + oldAmount;
    const newPendingAmount = Math.round(revertedPending - newAmount);

    // Validate new payment amount
    if (newAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be greater than 0'
      });
    }

    if (newPendingAmount < 0) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (₹${newAmount}) would exceed total bill amount`
      });
    }

    // Handle receipt image upload
    let receipt_image = currentPayment.receipt_image;
    if (req.files && req.files.receipt_image) {
      receipt_image = req.files.receipt_image[0].filename;
    }

    // Update payment record
    const updateQuery = `
      UPDATE payment_records SET 
        payment_amount = ?,
        payment_method = ?,
        payment_date = ?,
        notes = ?,
        receipt_image = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await pool.execute(updateQuery, [
      newAmount,
      payment_method || currentPayment.payment_method,
      payment_date || currentPayment.payment_date,
      notes !== undefined ? notes : currentPayment.notes,
      receipt_image,
      id
    ]);

    // Update purchase record
    const totalPaid = Math.round(parseFloat(purchase.grand_total) - newPendingAmount);
    const newStatus = newPendingAmount <= 0 ? 'completed' : 'pending';
    
    await pool.execute(
      `UPDATE supplier_purchases SET 
        payment_amount = ?, 
        amount_pending = ?, 
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [totalPaid, newPendingAmount, newStatus, currentPayment.purchase_id]
    );

    // Get updated payment record
    const [updatedPayment] = await pool.execute(
      'SELECT * FROM payment_records WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Payment record updated successfully',
      data: updatedPayment[0],
      purchase_status: {
        total_paid: totalPaid,
        amount_pending: newPendingAmount,
        status: newStatus
      }
    });
  } catch (error) {
    console.error('Error updating payment record:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment record',
      error: error.message
    });
  }
};

// Delete payment record
const deletePaymentRecord = async (req, res) => {
  try {
    const { id } = req.params;

    // Get payment record details
    const [paymentResult] = await pool.execute(
      'SELECT * FROM payment_records WHERE id = ?',
      [id]
    );

    if (paymentResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    const payment = paymentResult[0];
    const paymentAmount = parseFloat(payment.payment_amount);

    // Get purchase details
    const [purchaseResult] = await pool.execute(
      'SELECT grand_total, amount_pending FROM supplier_purchases WHERE id = ?',
      [payment.purchase_id]
    );

    const purchase = purchaseResult[0];
    const currentPending = parseFloat(purchase.amount_pending);
    
    // Calculate new pending amount (add back the deleted payment)
    const newPendingAmount = Math.round(currentPending + paymentAmount);
    const totalPaid = Math.round(parseFloat(purchase.grand_total) - newPendingAmount);

    // Delete payment record
    await pool.execute('DELETE FROM payment_records WHERE id = ?', [id]);

    // Update purchase record
    const newStatus = newPendingAmount <= 0 ? 'completed' : 'pending';
    
    await pool.execute(
      `UPDATE supplier_purchases SET 
        payment_amount = ?, 
        amount_pending = ?, 
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [totalPaid, newPendingAmount, newStatus, payment.purchase_id]
    );

    res.json({
      success: true,
      message: 'Payment record deleted successfully',
      purchase_status: {
        total_paid: totalPaid,
        amount_pending: newPendingAmount,
        status: newStatus
      }
    });
  } catch (error) {
    console.error('Error deleting payment record:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete payment record',
      error: error.message
    });
  }
};

module.exports = {
  getPaymentRecords,
  createPaymentRecord,
  updatePaymentRecord,
  deletePaymentRecord
};
