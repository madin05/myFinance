const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/sync', authMiddleware, userController.syncUser);
router.post('/send-verification', authMiddleware, userController.sendVerification);
router.post('/update-password', authMiddleware, userController.updatePassword);
router.post('/delete-request', authMiddleware, userController.requestDeleteOtp);
router.post('/delete-confirm', authMiddleware, userController.confirmDeleteAccount);
router.delete('/', authMiddleware, userController.deleteAccount);

module.exports = router;
