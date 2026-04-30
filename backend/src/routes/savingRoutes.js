const express = require('express');
const router = express.Router();
const savingController = require('../controllers/savingController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', savingController.getAllSavings);
router.post('/', savingController.createSaving);
router.patch('/:id', savingController.updateSaving);
router.delete('/:id', savingController.deleteSaving);
router.post('/reorder', savingController.reorderSavings);

module.exports = router;

