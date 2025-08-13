const express = require('express');
const router = express.Router();
const {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  getOrderStats
} = require('./ordersController.cjs');

const {
  getProductCosts,
  getProductCost,
  syncRetailPrices
} = require('./productCostController.cjs');

// Routes for orders
router.get('/', getOrders);
router.get('/stats', getOrderStats);
router.get('/:id', getOrderById);
router.post('/', createOrder);
router.put('/:id/status', updateOrderStatus);

// Allocation routes
const {
  saveAllocations,
  getAllocations,
  deductInventoryForDelivery
} = require('./orderInventoryController.cjs');

router.get('/:id/allocations', getAllocations);
router.post('/:id/allocations', saveAllocations);
router.post('/:id/deliver-with-deduction', deductInventoryForDelivery);

// Routes for product costs
router.get('/costs/products', getProductCosts);
router.get('/costs/products/:productId', getProductCost);
router.post('/costs/sync-prices', syncRetailPrices);

module.exports = router;
