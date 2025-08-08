const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const {
  getCustomers,
  getCustomerById,
  createCustomerBill,
  addCustomerPayment,
  getCustomerStats,
  getBillPayments,
  deleteCustomer
} = require('./customersController.cjs');

// Create receipts directory if it doesn't exist
const receiptsDir = path.join(__dirname, 'images', 'receipts');
if (!fs.existsSync(receiptsDir)) {
  fs.mkdirSync(receiptsDir, { recursive: true });
}

// Configure multer for receipt uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, receiptsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, 'receipt-' + uniqueSuffix + extension);
  }
});

const fileFilter = (req, file, cb) => {
  // Check file type
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Middleware for handling receipt upload
const uploadReceiptImage = upload.single('receipt_image');

// Error handling middleware for multer
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB.'
      });
    }
    return res.status(400).json({
      success: false,
      message: 'File upload error: ' + err.message
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  next();
};

// Test route
router.get('/test', async (req, res) => {
  try {
    const { pool } = require('../config/database.cjs');
    const [result] = await pool.execute('SELECT COUNT(*) as count FROM customers');
    res.json({ success: true, count: result[0].count });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// Serve receipt images
router.get('/images/receipts/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(receiptsDir, filename);

  res.sendFile(imagePath, (err) => {
    if (err) {
      res.status(404).json({
        success: false,
        message: 'Receipt image not found'
      });
    }
  });
});

// Routes for customers
router.get('/', getCustomers);
router.get('/stats', getCustomerStats);
router.get('/:id', getCustomerById);
router.get('/bills/:billId/payments', getBillPayments);
router.delete('/:id', deleteCustomer);
router.post('/bills', createCustomerBill);
router.post('/payments', uploadReceiptImage, handleUploadError, addCustomerPayment);

module.exports = router;
