const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const {
  getPaymentRecords,
  createPaymentRecord,
  updatePaymentRecord,
  deletePaymentRecord
} = require('./paymentRecordsController.cjs');

const router = express.Router();

// Create payment receipts directory if it doesn't exist
const paymentReceiptsDir = path.join(__dirname, 'payment-receipts');
if (!fs.existsSync(paymentReceiptsDir)) {
  fs.mkdirSync(paymentReceiptsDir, { recursive: true });
}

// Configure multer for payment receipt uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, paymentReceiptsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, 'payment-receipt-' + uniqueSuffix + extension);
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

// Multer middleware for handling payment receipt uploads
const uploadPaymentReceiptImages = upload.fields([
  { name: 'receipt_image', maxCount: 1 }
]);

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB.'
      });
    }
    return res.status(400).json({
      success: false,
      message: 'File upload error: ' + error.message
    });
  } else if (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  next();
};

// Serve payment receipt images
router.get('/receipts/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(paymentReceiptsDir, filename);
  
  res.sendFile(imagePath, (err) => {
    if (err) {
      res.status(404).json({
        success: false,
        message: 'Payment receipt image not found'
      });
    }
  });
});

// Routes for payment records
router.get('/purchase/:purchaseId', getPaymentRecords);
router.post('/', uploadPaymentReceiptImages, handleUploadError, createPaymentRecord);
router.put('/:id', uploadPaymentReceiptImages, handleUploadError, updatePaymentRecord);
router.delete('/:id', deletePaymentRecord);

module.exports = router;
