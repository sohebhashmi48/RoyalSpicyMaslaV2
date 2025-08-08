const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure the images directory exists
const imagesDir = path.join(__dirname, 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Configure multer for file storage
const storage = multer.diskStorage({
  destination: function (_, __, cb) {
    cb(null, imagesDir);
  },
  filename: function (_, file, cb) {
    // We'll set the filename later after we have the product ID
    // For now, use a temporary name
    const extension = path.extname(file.originalname);
    const tempName = `temp-${Date.now()}-${Math.round(Math.random() * 1E9)}${extension}`;
    cb(null, tempName);
  }
});

// File filter to only allow images
const fileFilter = (_, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10 // Maximum 10 files
  }
});

// Middleware for multiple image uploads
const uploadProductImages = upload.array('productImages', 10);

// Helper function to delete uploaded files in case of error
const deleteUploadedFiles = (files) => {
  if (files && files.length > 0) {
    files.forEach(file => {
      const filePath = path.join(imagesDir, file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  }
};

// Helper function to rename uploaded files with product ID
const renameFilesWithProductId = (files, productId) => {
  const renamedFiles = [];

  files.forEach((file, index) => {
    const extension = path.extname(file.originalname);
    const newFilename = `product-${productId}-${index + 1}${extension}`;
    const oldPath = path.join(imagesDir, file.filename);
    const newPath = path.join(imagesDir, newFilename);

    try {
      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
        renamedFiles.push(newFilename);
      }
    } catch (error) {
      console.error('Error renaming file:', error);
      // Keep original filename if rename fails
      renamedFiles.push(file.filename);
    }
  });

  return renamedFiles;
};

// Helper function to get image URL
const getImageUrl = (filename) => {
  return `/api/products/images/${filename}`;
};

module.exports = {
  uploadProductImages,
  deleteUploadedFiles,
  renameFilesWithProductId,
  getImageUrl,
  imagesDir
};
