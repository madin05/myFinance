// src/routes/receiptRoutes.js
const express = require('express');
const router = express.Router();
const receiptController = require('../controllers/receiptController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// POST /api/receipts/scan
router.post('/scan', receiptController.scanReceipt);

module.exports = router;
