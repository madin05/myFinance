const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/sync', authMiddleware, userController.syncUser);
router.post('/update-password', authMiddleware, userController.updatePassword);
router.delete('/', authMiddleware, userController.deleteAccount);

module.exports = router;
