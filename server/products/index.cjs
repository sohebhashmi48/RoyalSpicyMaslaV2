const express = require('express');
const router = express.Router();

// Import routes
const categoriesRoutes = require('./categoriesRoutes.cjs');
const productsRoutes = require('./productsRoutes.cjs');

// Mount routes
router.use('/categories', categoriesRoutes);
router.use('/', productsRoutes);

module.exports = router;
