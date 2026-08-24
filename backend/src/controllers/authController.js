const admin = require('../services/firebase');
const prisma = require('../services/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendPasswordResetEmail, send2FAMagicLinkEmail, sendOtpVerificationEmail, send2FAOtpEmail } = require('../services/emailService');
const { generate2FAToken, verify2FAToken, JWT_SECRET, getDeviceIp, getUserAgent } = require('../services/twoFactorService');
const { generateOtp, verifyOtp } = require('../services/otpService');

function maskEmail(email) {
  if (!email || !email.includes('@')) return '***@***.com';
  const [name, domain] = email.split('@');
  if (name.length <= 2) return `${name.charAt(0)}*@${domain}`;
  return `${name.substring(0, 2)}***@${domain}`;
}

exports.createSession = async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: 'ID Token wajib dikirim bre!' });
  }

  const expiresIn = 60 * 60 * 24 * 7 * 1000; // 7 hari

  try {
    const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });

    const cookieOptions = {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/'
    };

    res.cookie('session', sessionCookie, cookieOptions);
    res.json({ status: 'success', message: 'Sesi berhasil dibuat bre!' });
  } catch (error) {
    console.error('Session Creation Error:', error.message);
    res.status(401).json({ error: 'Verifikasi ID Token gagal atau expired!' });
  }
};

exports.clearSession = (req, res) => {
  res.clearCookie('session', { path: '/' });
  res.json({ status: 'success', message: 'Sesi berhasil dihapus bre!' });
};

/**
 * Handler kirim email reset password via backend
 */
exports.resetPassword = async (req, res) => {
  const { email } = req.body;
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email atau username wajib diisi!' });
  }

  try {
    let targetEmail = email.trim();

    if (!targetEmail.includes('@')) {
      const dbUser = await prisma.user.findFirst({
        where: { name: { equals: targetEmail, mode: 'insensitive' } }
      });
      if (dbUser && dbUser.email) {
        targetEmail = dbUser.email;
      } else {
        return res.status(400).json({ error: `Username "${targetEmail}" tidak ditemukan.` });
      }
    }

    try {
      await admin.auth().getUserByEmail(targetEmail);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        return res.status(400).json({ error: 'Email tidak terdaftar di sistem.' });
      }
      throw err;
    }

    const reqOrigin = req.headers.origin || req.headers.referer;

    res.json({ success: true, message: `Tautan reset password berhasil dikirim ke ${targetEmail}!`, targetEmail });

    sendPasswordResetEmail(targetEmail, reqOrigin).catch(err => {
      console.error('Background Email Dispatch Error:', err.message);
    });
  } catch (error) {
    console.error('Password Reset Error:', error.message);
    let errorMsg = error.message;
    if (error.code === 'auth/user-not-found' || error.message.includes('user record')) {
      errorMsg = 'Email tidak terdaftar di sistem.';
    } else if (error.code === 'auth/invalid-email') {
      errorMsg = 'Format email tidak valid.';
    }
    res.status(400).json({ error: errorMsg });
  }
};

/**
 * Endpoint Login & 2FA Check.
 * Verifikasi kredensial. Jika 2FA aktif -> kirim OTP 6-digit & kembalikan preAuthToken JWT.
 */
exports.loginWith2FACheck = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email dan password wajib diisi.' });
    }

    const targetEmail = email.trim().toLowerCase();
    const user = await prisma.user.findFirst({
      where: { email: { equals: targetEmail, mode: 'insensitive' } }
    });

    if (!user) {
      return res.status(400).json({ error: 'Email atau password salah.' });
    }

    if (user.password) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Email atau password salah.' });
      }
    }

    const is2FAActive = Boolean(user.is2FAEnabled || user.twoFactorEmailEnabled);

    // Jika 2FA TIDAK AKTIF -> Loloskan login biasa
    if (!is2FAActive) {
      return res.json({
        require2FA: false,
        is2FAEnabled: false,
        message: 'Password valid. Silakan lanjutkan login.'
      });
    }

    // Jika 2FA AKTIF -> Generate OTP 6-digit & Pre-Auth Token
    const { otpCode, expiresAt } = await generateOtp(user.id, 'LOGIN_2FA');
    const deviceIp = getDeviceIp(req);
    const userAgent = getUserAgent(req);

    // Kirim email OTP di background (non-blocking)
    send2FAOtpEmail(user.email, otpCode).catch(err => {
      console.error('Background 2FA OTP Send Error:', err.message);
    });

    // Issue pre-auth JWT (TTL: 5m)
    const preAuthToken = jwt.sign(
      { userId: user.id, stage: '2FA_PENDING', type: 'LOGIN_2FA' },
      JWT_SECRET,
      { expiresIn: '5m' }
    );

    return res.json({
      require2FA: true,
      is2FAEnabled: true,
      preAuthToken,
      emailMasked: maskEmail(user.email),
      expiresAt,
      message: `Kode OTP 2FA telah dikirim ke email ${maskEmail(user.email)}.`
    });
  } catch (error) {
    console.error('2FA Login Check Error:', error);
    res.status(500).json({ error: error.message || 'Gagal memproses verifikasi 2FA.' });
  }
};

/**
 * Handler Verifikasi Kode OTP 2FA Login
 */
exports.verify2FAOtp = async (req, res) => {
  try {
    const userId = req.preAuth?.userId;
    const { otp } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Sesi 2FA tidak valid.' });
    }

    if (!otp) {
      return res.status(400).json({ error: 'Kode OTP wajib diisi.' });
    }

    // Verifikasi OTP (tipe LOGIN_2FA)
    const { user } = await verifyOtp(userId, otp, 'LOGIN_2FA');

    // Terbitkan Custom Token Firebase untuk login penuh
    let customToken = '';
    if (user.firebaseUid) {
      customToken = await admin.auth().createCustomToken(user.firebaseUid);
    }

    res.json({
      success: true,
      message: 'Verifikasi 2FA berhasil!',
      customToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Verify 2FA OTP Error:', error.message);
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ error: error.message || 'Gagal verifikasi OTP 2FA.' });
  }
};

/**
 * Handler Kirim Ulang Kode OTP 2FA Login
 */
exports.resend2FAOtp = async (req, res) => {
  try {
    const userId = req.preAuth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Sesi 2FA tidak valid.' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }

    const { otpCode, expiresAt } = await generateOtp(user.id, 'LOGIN_2FA');
    const deviceIp = getDeviceIp(req);
    const userAgent = getUserAgent(req);

    send2FAOtpEmail(user.email, otpCode).catch(err => {
      console.error('Background Resend 2FA OTP Error:', err.message);
    });

    res.json({
      success: true,
      expiresAt,
      message: `Kode OTP 2FA baru telah dikirim ke email ${maskEmail(user.email)}.`
    });
  } catch (error) {
    console.error('Resend 2FA OTP Error:', error.message);
    res.status(500).json({ error: 'Gagal mengirim ulang kode OTP 2FA.' });
  }
};

/**
 * Strict 2FA Token Verification Endpoint (GET /api/v1/auth/2fa/verify?token=RAW_TOKEN)
 */
exports.verify2FAMagicLink = async (req, res) => {
  try {
    const token = req.query.token || req.body?.token;
    if (!token) {
      return res.status(400).json({ error: 'Token 2FA wajib disertakan.' });
    }

    const { user, tokenType } = await verify2FAToken(token, req);

    // Buat Firebase Custom Token untuk login penuh
    let customToken = '';
    if (user.firebaseUid) {
      customToken = await admin.auth().createCustomToken(user.firebaseUid);
    }

    let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const reqOrigin = req.headers.origin || req.headers.referer;
    if ((!frontendUrl || frontendUrl.includes('localhost')) && reqOrigin) {
      try {
        frontendUrl = new URL(reqOrigin).origin;
      } catch (e) {}
    }

    if (tokenType === 'DISABLE') {
      const { getDeviceIp } = require('../services/twoFactorService');
      const { send2FADisabledSecurityEmail } = require('../services/emailService');
      const ipAddress = getDeviceIp(req);
      const userAgent = req.headers['user-agent'];

      send2FADisabledSecurityEmail(user.email, ipAddress, userAgent, new Date()).catch(err => {
        console.error('Background 2FA Deactivation Security Email Error:', err.message);
      });
    }

    // Jika dipanggil langsung dari klik link browser (Navigation Request)
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      let mode = '2faSuccess';
      if (tokenType === 'SETUP') mode = '2faSetupSuccess';
      if (tokenType === 'DISABLE') mode = '2faDisabledSuccess';
      return res.redirect(`${frontendUrl}/?mode=${mode}&customToken=${encodeURIComponent(customToken)}`);
    }

    res.json({
      status: 'success',
      tokenType,
      message: tokenType === 'SETUP'
        ? 'Aktivasi 2FA berhasil dikonfirmasi!'
        : tokenType === 'DISABLE'
        ? 'Penonaktifan 2FA berhasil dikonfirmasi!'
        : 'Verifikasi 2FA berhasil!',
      customToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        is2FAEnabled: user.is2FAEnabled
      }
    });
  } catch (error) {
    console.error('Verify 2FA Error:', error.message);
    const statusCode = error.statusCode || 400;

    let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      return res.redirect(`${frontendUrl}/?mode=2faError&message=${encodeURIComponent(error.message)}`);
    }

    res.status(statusCode).json({ error: error.message });
  }
};

/**
 * Request Activation of 2FA: Generates ENABLE_2FA OTP & preAuthToken.
 * User must verify OTP before 2FA status is changed to enabled in DB.
 */
exports.requestEnable2FA = async (req, res) => {
  try {
    const firebaseUid = req.user?.uid;
    const { withRetry } = require('../services/db');

    if (!firebaseUid) {
      return res.status(401).json({ error: 'Otentikasi diperlukan.' });
    }

    const user = await withRetry(() => prisma.user.findUnique({
      where: { firebaseUid }
    }));

    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }

    if (user.is2FAEnabled && user.twoFactorEmailEnabled) {
      return res.status(400).json({ error: 'Autentikasi 2FA sudah aktif untuk akun ini.' });
    }

    // Generate OTP ENABLE_2FA & Pre-Auth JWT
    const { otpCode, expiresAt } = await generateOtp(user.id, 'ENABLE_2FA');
    const { JWT_SECRET } = require('../services/twoFactorService');

    const preAuthToken = jwt.sign(
      { userId: user.id, email: user.email, stage: 'ENABLE_2FA_PENDING' },
      JWT_SECRET,
      { expiresIn: '5m' }
    );

    send2FAOtpEmail(user.email, otpCode).catch(err => {
      console.error('Background Enable 2FA OTP Send Error:', err.message);
    });

    res.json({
      success: true,
      status: 'OTP_SENT',
      preAuthToken,
      expiresAt,
      message: `Kami telah mengirimkan 6-digit kode verifikasi ke email ${maskEmail(user.email)} untuk memastikan email Anda aktif.`
    });
  } catch (error) {
    console.error('Request Enable 2FA Server Error:', error);
    res.status(500).json({ error: 'Gagal meminta pengaktifan 2FA.' });
  }
};

/**
 * Confirm Activation of 2FA: Validates ENABLE_2FA OTP & sets is2FAEnabled=true in DB.
 */
exports.confirmEnable2FA = async (req, res) => {
  try {
    const userId = req.preAuth?.userId;
    const { otp } = req.body;
    const { withRetry } = require('../services/db');

    if (!userId) {
      return res.status(401).json({ error: 'Sesi 2FA tidak valid.' });
    }

    if (!otp) {
      return res.status(400).json({ error: 'Kode OTP 6-digit wajib diisi.' });
    }

    // Verifikasi OTP bertipe ENABLE_2FA
    await verifyOtp(userId, otp, 'ENABLE_2FA');

    // Update status 2FA di database secara resmi
    const user = await withRetry(() => prisma.user.update({
      where: { id: userId },
      data: { is2FAEnabled: true, twoFactorEmailEnabled: true }
    }));

    res.json({
      success: true,
      status: 'ENABLED',
      is2FAEnabled: true,
      message: 'Autentikasi 2-Langkah (2FA OTP) berhasil diaktifkan!',
      user: {
        id: user.id,
        email: user.email,
        is2FAEnabled: true
      }
    });
  } catch (error) {
    console.error('Confirm Enable 2FA Error:', error.message);
    const statusCode = error.statusCode || 400;
    res.status(statusCode).json({ error: error.message || 'Gagal mengonfirmasi aktivasi 2FA.' });
  }
};

/**
 * Toggle / Disable 2FA Handler (Konfirmasi Password untuk Menonaktifkan)
 */
exports.toggle2FA = async (req, res) => {
  try {
    const { enabled, password } = req.body;
    const firebaseUid = req.user?.uid;
    const { withRetry } = require('../services/db');

    if (!firebaseUid) {
      return res.status(401).json({ error: 'Otentikasi diperlukan.' });
    }

    const user = await withRetry(() => prisma.user.findUnique({
      where: { firebaseUid }
    }));

    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }

    if (enabled) {
      return res.status(400).json({ error: 'Gunakan endpoint /2fa/enable-request untuk meminta aktivasi 2FA.' });
    }

    // Menonaktifkan 2FA: Verifikasi Password (jika password provider)
    const provider = req.user?.firebase?.sign_in_provider || 'password';
    const isPasswordProvider = provider === 'password';

    if (isPasswordProvider && !password && user.password) {
      return res.status(400).json({ error: 'Password saat ini diperlukan untuk menonaktifkan 2FA.' });
    }

    if (user.password && password) {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Password yang Anda masukkan salah.' });
      }
    }

    await withRetry(() => prisma.user.update({
      where: { id: user.id },
      data: { is2FAEnabled: false, twoFactorEmailEnabled: false }
    }));

    return res.json({
      status: 'DISABLED',
      is2FAEnabled: false,
      message: 'Autentikasi 2-Langkah (2FA OTP) berhasil dinonaktifkan.'
    });
  } catch (error) {
    console.error('Toggle 2FA Server Error:', error);
    const isValidationError = error.statusCode && error.statusCode < 500;
    const clientMessage = isValidationError
      ? error.message
      : 'Gagal mengubah status 2FA karena kendala koneksi server database. Silakan coba beberapa saat lagi.';
    res.status(error.statusCode || 500).json({ error: clientMessage });
  }
};

/**
 * Generate & kirim OTP 6-digit ke email user.
 * Dipanggil setelah register atau untuk resend OTP.
 */
exports.sendRegistrationOtp = async (req, res) => {
  try {
    const firebaseUid = req.user?.uid;
    const email = req.user?.email;

    if (!firebaseUid || !email) {
      return res.status(400).json({ error: 'Data autentikasi tidak lengkap.' });
    }

    const { withRetry } = require('../services/db');
    const user = await withRetry(() => prisma.user.findUnique({
      where: { firebaseUid }
    }));

    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan di database.' });
    }

    // Generate OTP
    const { otpCode, expiresAt } = await generateOtp(user.id);

    // Kirim respon HTTP 200 instan (non-blocking pattern)
    res.json({
      success: true,
      message: 'Kode OTP berhasil dikirim ke email!',
      expiresAt
    });

    // Kirim email OTP di background
    sendOtpVerificationEmail(email, otpCode).catch(err => {
      console.error('Background OTP Email Send Error:', err.message);
    });
  } catch (error) {
    console.error('Send Registration OTP Error:', error.message);
    res.status(500).json({ error: 'Gagal mengirim kode OTP. Silakan coba lagi.' });
  }
};

/**
 * Verifikasi kode OTP yang di-input user.
 * Jika valid: set emailVerified di Firebase + return success.
 */
exports.verifyRegistrationOtp = async (req, res) => {
  try {
    const firebaseUid = req.user?.uid;
    const { otp } = req.body;

    if (!firebaseUid) {
      return res.status(401).json({ error: 'Otentikasi diperlukan.' });
    }

    if (!otp) {
      return res.status(400).json({ error: 'Kode OTP wajib diisi.' });
    }

    const { withRetry } = require('../services/db');
    const user = await withRetry(() => prisma.user.findUnique({
      where: { firebaseUid }
    }));

    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }

    // Verifikasi OTP (ini juga set Firebase emailVerified = true)
    const result = await verifyOtp(user.id, otp);

    res.json({
      success: true,
      message: result.message,
      emailVerified: true
    });
  } catch (error) {
    console.error('Verify Registration OTP Error:', error.message);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({ error: error.message || 'Gagal verifikasi OTP.' });
  }
};
