const db = require('../config/database.cjs');

// Create payment record
const createCatererPayment = async (req, res) => {
  try {
    const {
      caterer_id,
      bill_id,
      amount,
      paymentMethod,
      referenceNumber,
      notes,
      caterer_phone,
      caterer_name,
      order_id
    } = req.body;

    // Validate required fields
    if (!caterer_id || !bill_id || !amount || !paymentMethod) {
      return res.status(400).json({ 
        error: 'Missing required fields: caterer_id, bill_id, amount, paymentMethod' 
      });
    }

    // Check if bill exists and get current pending amount
    const [billResult] = await db.query(
      'SELECT pending_amount FROM caterer_bills WHERE id = ?',
      [bill_id]
    );

    if (!billResult || billResult.length === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const currentPending = parseFloat(billResult[0].pending_amount || 0);
    const paymentAmount = parseFloat(amount);

    if (paymentAmount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be greater than 0' });
    }

    if (paymentAmount > currentPending) {
      return res.status(400).json({ 
        error: `Payment amount exceeds outstanding balance of ${currentPending}` 
      });
    }

    // Insert payment record
    const [paymentResult] = await db.query(
      `INSERT INTO caterer_payments 
       (caterer_id, bill_id, amount, payment_method, reference_number, notes, payment_date, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [caterer_id, bill_id, paymentAmount, paymentMethod, referenceNumber || null, notes || null]
    );

    // Update bill pending amount
    const newPending = currentPending - paymentAmount;
    await db.query(
      'UPDATE caterer_bills SET pending_amount = ?, updated_at = NOW() WHERE id = ?',
      [newPending, bill_id]
    );

    // If fully paid, update bill status
    if (newPending <= 0) {
      await db.query(
        'UPDATE caterer_bills SET status = "paid", updated_at = NOW() WHERE id = ?',
        [bill_id]
      );
    }

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      payment_id: paymentResult.insertId,
      new_pending_amount: newPending
    });

  } catch (error) {
    console.error('Error creating caterer payment:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
};

// Get payment history for a caterer
const getCatererPaymentHistory = async (req, res) => {
  try {
    const { caterer_id } = req.params;

    const [payments] = await db.query(
      `SELECT cp.*, cb.bill_number, cb.order_number, cb.pending_amount as original_pending
       FROM caterer_payments cp
       JOIN caterer_bills cb ON cp.bill_id = cb.id
       WHERE cp.caterer_id = ?
       ORDER BY cp.payment_date DESC`,
      [caterer_id]
    );

    res.json({ success: true, payments });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
};

module.exports = {
  createCatererPayment,
  getCatererPaymentHistory
};
