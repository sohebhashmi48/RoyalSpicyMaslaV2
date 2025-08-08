const express = require('express');
const router = express.Router();
const path = require('path');
const {
  getExpenses,
  getTodayExpenses,
  getExpenseStats,
  getExpenseCategories,
  createExpense,
  updateExpense,
  deleteExpense,
  testExpenses,
  exportExpenses
} = require('./expenseController.cjs');
const { uploadReceiptImage, handleUploadError } = require('./receiptUpload.cjs');

// Routes for expenses
router.get('/test', testExpenses);
router.get('/export', exportExpenses);
router.get('/', getExpenses);
router.get('/today', getTodayExpenses);
router.get('/stats', getExpenseStats);
router.get('/categories', getExpenseCategories);
router.post('/', uploadReceiptImage, handleUploadError, createExpense);
router.put('/:id', uploadReceiptImage, handleUploadError, updateExpense);
router.delete('/:id', deleteExpense);

// Serve receipt images
router.get('/receipts/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, 'receipts', filename);
  
  res.sendFile(imagePath, (err) => {
    if (err) {
      res.status(404).json({
        success: false,
        message: 'Receipt image not found'
      });
    }
  });
});

module.exports = router;
