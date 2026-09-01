// backend/src/middlewares/rateLimiter.js
const { getDeviceIp } = require('../services/twoFactorService');

// In-memory rate limiting store
const sendAttempts = new Map();
const verifyAttempts = new Map();

/**
 * Rate Limiter for 2FA Send / Generation Endpoint: Max 3 requests / 10 mins per IP
 */
function limit2FASend(req, res, next) {
  const ip = getDeviceIp(req);
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const maxRequests = 3;

  const record = sendAttempts.get(ip) || { count: 0, resetTime: now + windowMs };
  
  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + windowMs;
  }

  record.count += 1;
  sendAttempts.set(ip, record);

  if (record.count > maxRequests) {
    const minutesLeft = Math.ceil((record.resetTime - now) / 60000);
    return res.status(429).json({
      error: `Batas percobaan 2FA terlampaui. Coba lagi dalam ${minutesLeft} menit.`
    });
  }

  next();
}

/**
 * Rate Limiter for 2FA Verification Endpoint: Max 5 attempts / 15 mins per IP
 */
function limit2FAVerify(req, res, next) {
  const ip = getDeviceIp(req);
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 5;

  const record = verifyAttempts.get(ip) || { count: 0, resetTime: now + windowMs };

  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + windowMs;
  }

  record.count += 1;
  verifyAttempts.set(ip, record);

  if (record.count > maxRequests) {
    const minutesLeft = Math.ceil((record.resetTime - now) / 60000);
    return res.status(429).json({
      error: `Terlalu banyak percobaan verifikasi 2FA. Silakan tunggu ${minutesLeft} menit.`
    });
  }

  next();
}

/**
 * Rate Limiter for OTP Send Endpoint: Max 5 requests / 10 mins per IP
 */
const otpSendAttempts = new Map();

function limitOtpSend(req, res, next) {
  const ip = getDeviceIp(req);
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const maxRequests = 5;

  const record = otpSendAttempts.get(ip) || { count: 0, resetTime: now + windowMs };

  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + windowMs;
  }

  record.count += 1;
  otpSendAttempts.set(ip, record);

  if (record.count > maxRequests) {
    const minutesLeft = Math.ceil((record.resetTime - now) / 60000);
    return res.status(429).json({
      error: `Terlalu banyak permintaan kirim OTP. Coba lagi dalam ${minutesLeft} menit.`
    });
  }

  next();
}

/**
 * Rate Limiter for OTP Verify Endpoint: Max 10 attempts / 15 mins per IP
 */
const otpVerifyAttempts = new Map();

function limitOtpVerify(req, res, next) {
  const ip = getDeviceIp(req);
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 10;

  const record = otpVerifyAttempts.get(ip) || { count: 0, resetTime: now + windowMs };

  if (now > record.resetTime) {
    record.count = 0;
    record.resetTime = now + windowMs;
  }

  record.count += 1;
  otpVerifyAttempts.set(ip, record);

  if (record.count > maxRequests) {
    const minutesLeft = Math.ceil((record.resetTime - now) / 60000);
    return res.status(429).json({
      error: `Terlalu banyak percobaan verifikasi OTP. Silakan tunggu ${minutesLeft} menit.`
    });
  }

  next();
}

module.exports = {
  limit2FASend,
  limit2FAVerify,
  limitOtpSend,
  limitOtpVerify
};
