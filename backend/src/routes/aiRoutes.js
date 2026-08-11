// backend/src/routes/aiRoutes.js
const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// POST /api/ai/parse
router.post('/parse', aiController.parseInput);

// POST /api/ai/analyze
router.post('/analyze', aiController.analyzePeriod);

module.exports = router;
