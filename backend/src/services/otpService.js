// backend/src/services/otpService.js
const crypto = require('crypto');
const prisma = require('./db');
const admin = require('./firebase');

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = 5;
const MAX_ATTEMPTS = 5;

/**
 * Hash OTP code menggunakan SHA-256.
 * @param {string} rawOtp - 6-digit OTP plaintext
 * @returns {string} Hex-encoded SHA-256 hash
 */
function hashOtp(rawOtp) {
  return crypto.createHash('sha256').update(String(rawOtp)).digest('hex');
}

/**
 * Generate 6-digit kriptografis OTP, simpan hash ke DB, return raw code.
 * Melakukan housekeeping sebelum generate (hapus OTP lama/expired/used).
 *
 * @param {number} userId - Prisma User ID
 * @returns {Promise<{otpCode: string, expiresAt: Date}>}
 */
async function generateOtp(userId, type = 'LOGIN_2FA') {
  // Housekeeping: hapus semua OTP lama untuk user & type ini (expired / used)
  await prisma.otpVerification.deleteMany({
    where: {
      userId,
      type,
      OR: [
        { isUsed: true },
        { expiresAt: { lt: new Date() } }
      ]
    }
  });

  // Invalidate OTP pending yang masih aktif untuk type ini
  await prisma.otpVerification.deleteMany({
    where: { userId, type }
  });

  // Generate 6-digit angka random kriptografis
  const otpCode = String(crypto.randomInt(100000, 999999));
  const otpHash = hashOtp(otpCode);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.otpVerification.create({
    data: {
      userId,
      otpHash,
      type,
      expiresAt,
      attempts: 0,
      isUsed: false
    }
  });

  return { otpCode, expiresAt };
}

/**
 * Verifikasi OTP yang di-input user berdasarkan type.
 * Cek: existence → isUsed → expired → attempts limit → hash match.
 * Jika valid: set isUsed=true, update Firebase emailVerified (jika tipe REGISTRATION).
 *
 * @param {number} userId - Prisma User ID
 * @param {string} rawOtp - 6-digit OTP plaintext dari frontend
 * @param {string} type - OtpType enum ("LOGIN_2FA", "REGISTRATION", dll)
 * @returns {Promise<{success: boolean, message: string, user: object}>}
 * @throws {Error} Dengan statusCode untuk HTTP response
 */
async function verifyOtp(userId, rawOtp, type = 'LOGIN_2FA') {
  // Sanitasi input: hanya angka, tepat 6 digit
  const sanitized = String(rawOtp).replace(/\D/g, '');
  if (sanitized.length !== OTP_LENGTH) {
    const error = new Error('Kode OTP harus terdiri dari 6 digit angka.');
    error.statusCode = 400;
    throw error;
  }

  // Cari OTP terbaru yang belum digunakan untuk user & type ini
  const record = await prisma.otpVerification.findFirst({
    where: { userId, type, isUsed: false },
    orderBy: { createdAt: 'desc' },
    include: { user: true }
  });

  // Check 1: Record existence
  if (!record) {
    const error = new Error('Kode OTP tidak ditemukan atau sudah tidak berlaku.');
    error.statusCode = 400;
    throw error;
  }

  // Check 2: Expiration
  if (new Date() > new Date(record.expiresAt)) {
    const error = new Error('Kode OTP sudah kedaluwarsa. Silakan minta kode baru.');
    error.statusCode = 410;
    throw error;
  }

  // Check 3: Max attempts
  if (record.attempts >= MAX_ATTEMPTS) {
    const error = new Error('Terlalu banyak percobaan salah. Silakan minta kode OTP baru.');
    error.statusCode = 429;
    throw error;
  }

  // Check 4: Hash match
  const inputHash = hashOtp(sanitized);
  if (inputHash !== record.otpHash) {
    // Increment attempts
    await prisma.otpVerification.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } }
    });

    const remaining = MAX_ATTEMPTS - (record.attempts + 1);
    const error = new Error(
      remaining > 0
        ? `Kode OTP salah. ${remaining} percobaan tersisa.`
        : 'Kode OTP salah. Terlalu banyak percobaan, silakan minta kode baru.'
    );
    error.statusCode = 400;
    throw error;
  }

  // ✅ OTP Valid — Mark as used
  await prisma.otpVerification.update({
    where: { id: record.id },
    data: { isUsed: true }
  });

  // Set emailVerified = true di Firebase Auth jika registrasi
  if (type === 'REGISTRATION' && record.user?.firebaseUid) {
    try {
      await admin.auth().updateUser(record.user.firebaseUid, {
        emailVerified: true
      });
    } catch (firebaseErr) {
      console.error('Firebase updateUser emailVerified error:', firebaseErr.message);
    }
  }

  // Cleanup: hapus OTP bekas/lama tipe ini
  await prisma.otpVerification.deleteMany({
    where: { userId, type }
  });

  return {
    success: true,
    message: 'Verifikasi Kode OTP berhasil!',
    user: record.user
  };
}

module.exports = {
  generateOtp,
  verifyOtp,
  hashOtp,
  OTP_LENGTH,
  OTP_TTL_MINUTES,
  MAX_ATTEMPTS
};
