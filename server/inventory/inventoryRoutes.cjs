const express = require('express');
const {
  getInventorySummary,
  getInventoryHistory,
  addInventoryEntry,
  updateInventoryEntry,
  deleteInventoryEntry,
  rebuildInventorySummary,
  getProductBatches,
  getAverageCostPrices,
  mergeBatches,
  cleanupMergedBatches
} = require('./inventoryController.cjs');

const router = express.Router();

// Routes for inventory
router.get('/summary', getInventorySummary);
router.get('/history', getInventoryHistory);
router.get('/average-costs', getAverageCostPrices);
router.get('/product/:product_id/batches', getProductBatches);
router.post('/', addInventoryEntry);
router.put('/:id', updateInventoryEntry);
router.delete('/:id', deleteInventoryEntry);
router.post('/rebuild-summary', rebuildInventorySummary);
router.post('/merge-batches', mergeBatches);
router.post('/cleanup-merged', cleanupMergedBatches);

module.exports = router;
