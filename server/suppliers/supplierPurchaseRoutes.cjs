const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const {
  getSupplierPurchases,
  getNextBillNumber,
  createSupplierPurchase,
  updateSupplierPurchase,
  deleteSupplierPurchase
} = require('./supplierPurchaseController.cjs');

const router = express.Router();

// Create receipts directory if it doesn't exist
const receiptsDir = path.join(__dirname, 'receipts');
if (!fs.existsSync(receiptsDir)) {
  fs.mkdirSync(receiptsDir, { recursive: true });
}

// Configure multer for file uploads
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

// Configure multer fields for receipt images
const uploadReceiptImages = upload.fields([
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
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Too many files or unexpected field name.'
      });
    }
  }
  
  if (error.message === 'Only image files are allowed!') {
    return res.status(400).json({
      success: false,
      message: 'Only image files are allowed!'
    });
  }
  
  next(error);
};

// Routes for supplier purchases
router.get('/', getSupplierPurchases);
router.get('/next-bill-number', getNextBillNumber);
router.post('/', uploadReceiptImages, handleUploadError, createSupplierPurchase);
router.put('/:id', uploadReceiptImages, handleUploadError, updateSupplierPurchase);
router.delete('/:id', deleteSupplierPurchase);

module.exports = router;
