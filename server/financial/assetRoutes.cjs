const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const {
  getAssets,
  getAssetCategories,
  createAsset,
  updateAsset,
  deleteAsset,
  exportAssets
} = require('./assetController.cjs');

// Create directories if they don't exist
const assetsDir = path.join(__dirname, 'assets');
const receiptsDir = path.join(__dirname, 'assets', 'receipts');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

if (!fs.existsSync(receiptsDir)) {
  fs.mkdirSync(receiptsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'asset_image') {
      cb(null, assetsDir);
    } else if (file.fieldname === 'receipt_image') {
      cb(null, receiptsDir);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Check if the file is an image
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

// Configure upload fields
const uploadAssetImages = upload.fields([
  { name: 'asset_image', maxCount: 1 },
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
  } else if (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  next();
};

// Routes for assets
router.get('/export', exportAssets);
router.get('/', getAssets);
router.get('/categories', getAssetCategories);
router.post('/', uploadAssetImages, handleUploadError, createAsset);
router.put('/:id', uploadAssetImages, handleUploadError, updateAsset);
router.delete('/:id', deleteAsset);

module.exports = router;
