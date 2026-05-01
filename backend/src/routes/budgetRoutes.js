const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', budgetController.getBudgets);
router.post('/', budgetController.upsertBudget);
router.delete('/:id', budgetController.deleteBudget);

module.exports = router;
