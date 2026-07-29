const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const { limit2FASend, limit2FAVerify } = require('../middlewares/rateLimiter');

router.post('/session', authController.createSession);
router.delete('/session', authController.clearSession);
router.post('/reset-password', authController.resetPassword);

// 2FA Routes
router.post('/2fa/check', limit2FASend, authController.loginWith2FACheck);
router.get('/2fa/verify', limit2FAVerify, authController.verify2FAMagicLink);
router.post('/2fa/toggle', authMiddleware, authController.toggle2FA);

module.exports = router;
