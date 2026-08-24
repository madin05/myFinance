// backend/src/middlewares/preAuthMiddleware.js
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../services/twoFactorService');

/**
 * Middleware untuk memverifikasi Pre-Auth JWT pada flow 2FA.
 * Memastikan request memiliki token pre-auth yang valid dan bertipe 2FA_PENDING.
 */
module.exports = function preAuthMiddleware(req, res, next) {
  try {
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.body && req.body.preAuthToken) {
      token = req.body.preAuthToken;
    } else if (req.query && req.query.preAuthToken) {
      token = req.query.preAuthToken;
    }

    if (!token) {
      return res.status(401).json({
        error: 'Pre-auth token 2FA tidak ditemukan. Silakan login kembali.'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if ((decoded.stage !== '2FA_PENDING' && decoded.stage !== 'ENABLE_2FA_PENDING') || !decoded.userId) {
      return res.status(401).json({
        error: 'Tahap autentikasi 2FA tidak valid.'
      });
    }

    req.preAuth = decoded;
    next();
  } catch (err) {
    console.warn('[PreAuthMiddleware] Token invalid or expired:', err.message);
    return res.status(401).json({
      error: 'Sesi 2FA telah kadaluarsa (melebihi 5 menit). Silakan login ulang.'
    });
  }
};
