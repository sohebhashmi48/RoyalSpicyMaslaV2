const express = require('express');
const path = require('path');
const router = express.Router();
const {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct
} = require('./productsController.cjs');
const { uploadProductImages, imagesDir } = require('./imageUpload.cjs');

// Routes for products
router.get('/', getProducts);
router.post('/', uploadProductImages, createProduct);
router.put('/:id', uploadProductImages, updateProduct);
router.delete('/:id', deleteProduct);

// Serve product images
router.get('/images/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(imagesDir, filename);

  // Check if file exists and serve it
  res.sendFile(imagePath, (err) => {
    if (err) {
      res.status(404).json({ message: 'Image not found' });
    }
  });
});

module.exports = router;
