const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/session', authController.createSession);
router.delete('/session', authController.clearSession);

module.exports = router;
