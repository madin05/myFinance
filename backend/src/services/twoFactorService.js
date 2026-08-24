// backend/src/services/twoFactorService.js
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || 'myfinance_secret_key_2fa_2026';

/**
 * Proxy-aware IP extraction from incoming HTTP request.
 */
function getDeviceIp(req) {
  if (!req) return '127.0.0.1';
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded && typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || req.ip || '127.0.0.1';
}

/**
 * Extract clean User-Agent string.
 */
function getUserAgent(req) {
  if (!req) return 'Unknown Device';
  return req.headers['user-agent'] || 'Unknown Device';
}

/**
 * Normalize IP address to compare safely (e.g. IPv6 loopback vs IPv4).
 */
function normalizeIp(ip) {
  if (!ip) return '';
  let clean = ip.trim();
  if (clean.startsWith('::ffff:')) clean = clean.replace('::ffff:', '');
  if (clean === '::1') clean = '127.0.0.1';
  return clean;
}

/**
 * Generate a 2FA Magic Link Token with Housekeeping.
 */
async function generate2FAToken(userId, req, type = 'LOGIN') {
  const deviceIp = getDeviceIp(req);
  const userAgent = getUserAgent(req);

  // 1. Housekeeping: Clean up expired or used 2FA tokens for this user
  await prisma.twoFactorToken.deleteMany({
    where: {
      userId,
      OR: [
        { isUsed: true },
        { expiresAt: { lt: new Date() } }
      ]
    }
  });

  // 2. Generate secure 32-byte hex raw token & SHA-256 hash
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  // 3. Set 5 minutes TTL
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  // 4. Save token hash in database
  await prisma.twoFactorToken.create({
    data: {
      userId,
      tokenHash,
      type,
      deviceIp,
      userAgent,
      expiresAt,
      isUsed: false
    }
  });

  // 5. Issue short-lived pre_auth_token JWT (TTL: 5m)
  const preAuthToken = jwt.sign(
    { userId, step: '2FA_PENDING', type },
    JWT_SECRET,
    { expiresIn: '5m' }
  );

  return { rawToken, preAuthToken, expiresAt };
}

/**
 * Strict 2FA Verification Pipeline.
 */
async function verify2FAToken(rawToken, req) {
  if (!rawToken || typeof rawToken !== 'string') {
    const error = new Error('Token 2FA tidak valid.');
    error.statusCode = 400;
    throw error;
  }

  const currentIp = getDeviceIp(req);
  const currentAgent = getUserAgent(req);

  // 1. Hash incoming raw token using SHA-256
  const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');

  // 2. Look up record in database
  const record = await prisma.twoFactorToken.findFirst({
    where: { tokenHash },
    include: { user: true }
  });

  // Check 1: Record existence
  if (!record) {
    const error = new Error('Token 2FA tidak ditemukan atau sudah tidak berlaku.');
    error.statusCode = 401;
    throw error;
  }

  // Check 2: Single-Use (Replay Attack Prevention)
  if (record.isUsed) {
    const error = new Error('Token 2FA sudah pernah digunakan (Replay attack terdeteksi).');
    error.statusCode = 403;
    throw error;
  }

  // Check 3: Expiration Check
  if (new Date() > new Date(record.expiresAt)) {
    const error = new Error('Token 2FA telah kadaluarsa (melebihi 5 menit).');
    error.statusCode = 401;
    throw error;
  }

  // Check 4: Context Binding Check (IP & User-Agent)
  const isIpMatch = normalizeIp(record.deviceIp) === normalizeIp(currentIp);
  const isAgentMatch = record.userAgent === currentAgent;

  if (!isIpMatch && !isAgentMatch) {
    console.warn(`[2FA Security Mismatch] DB IP: ${record.deviceIp}, Request IP: ${currentIp}`);
    const error = new Error('Akses ditolak: Mismatch perangkat atau lokasi IP.');
    error.statusCode = 403;
    throw error;
  }

  // 3. Post-Validation Execution
  // Mark token as used atomically
  await prisma.twoFactorToken.update({
    where: { id: record.id },
    data: { isUsed: true }
  });

  // Invalidate all OTHER pending 2FA tokens for this user
  await prisma.twoFactorToken.deleteMany({
    where: {
      userId: record.userId,
      id: { not: record.id }
    }
  });

  // Handle SETUP or DISABLE token types
  if (record.type === 'SETUP') {
    await prisma.user.update({
      where: { id: record.userId },
      data: { is2FAEnabled: true, twoFactorEmailEnabled: true }
    });
  } else if (record.type === 'DISABLE') {
    await prisma.user.update({
      where: { id: record.userId },
      data: { is2FAEnabled: false, twoFactorEmailEnabled: false }
    });
  }

  return {
    user: record.user,
    tokenType: record.type
  };
}

module.exports = {
  JWT_SECRET,
  getDeviceIp,
  getUserAgent,
  generate2FAToken,
  verify2FAToken
};
