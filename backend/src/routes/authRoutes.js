const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const preAuthMiddleware = require('../middlewares/preAuthMiddleware');
const { limit2FASend, limit2FAVerify, limitOtpSend, limitOtpVerify } = require('../middlewares/rateLimiter');

router.post('/session', authController.createSession);
router.delete('/session', authController.clearSession);
router.post('/reset-password', authController.resetPassword);

// 2FA Routes
router.post('/2fa/check', limit2FASend, authController.loginWith2FACheck);
router.post('/login-2fa/verify', preAuthMiddleware, limit2FAVerify, authController.verify2FAOtp);
router.post('/login-2fa/resend', preAuthMiddleware, limit2FASend, authController.resend2FAOtp);
router.post('/2fa/enable-request', authMiddleware, limit2FASend, authController.requestEnable2FA);
router.post('/2fa/enable-confirm', preAuthMiddleware, limit2FAVerify, authController.confirmEnable2FA);
router.get('/2fa/verify', limit2FAVerify, authController.verify2FAMagicLink);
router.post('/2fa/toggle', authMiddleware, authController.toggle2FA);

// OTP Verification Routes
router.post('/otp/send', authMiddleware, limitOtpSend, authController.sendRegistrationOtp);
router.post('/otp/verify', authMiddleware, limitOtpVerify, authController.verifyRegistrationOtp);

module.exports = router;

