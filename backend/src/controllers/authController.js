const admin = require('../services/firebase');
const prisma = require('../services/db');
const bcrypt = require('bcrypt');
const { sendPasswordResetEmail, send2FAMagicLinkEmail } = require('../services/emailService');
const { generate2FAToken, verify2FAToken } = require('../services/twoFactorService');

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
 * Verifikasi kredensial. Jika 2FA aktif -> kirim Magic Link & kembalikan status AWAITING_2FA.
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

    // Jika 2FA TIDAK AKTIF -> Loloskan login biasa
    if (!user.is2FAEnabled) {
      return res.json({
        is2FAEnabled: false,
        message: 'Password valid. Silakan lanjutkan login.'
      });
    }

    // Jika 2FA AKTIF -> Buat token & kirim Magic Link via Email
    const reqOrigin = req.headers.origin || req.headers.referer;
    const { rawToken, preAuthToken } = await generate2FAToken(user.id, req, 'LOGIN');

    // Kirim email di background (non-blocking)
    send2FAMagicLinkEmail(user.email, rawToken, 'LOGIN', reqOrigin).catch(err => {
      console.error('Background 2FA Magic Link Send Error:', err.message);
    });

    return res.json({
      status: 'AWAITING_2FA',
      is2FAEnabled: true,
      preAuthToken,
      message: `Magic Link 2FA telah dikirim ke email ${user.email}. Silakan periksa kotak masuk/spam Anda.`
    });
  } catch (error) {
    console.error('2FA Login Check Error:', error);
    res.status(500).json({ error: error.message || 'Gagal memproses verifikasi 2FA.' });
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

    // Jika dipanggil langsung dari klik link browser (Navigation Request)
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      const mode = tokenType === 'SETUP' ? '2faSetupSuccess' : '2faSuccess';
      return res.redirect(`${frontendUrl}/?mode=${mode}&customToken=${encodeURIComponent(customToken)}`);
    }

    res.json({
      status: 'success',
      tokenType,
      message: tokenType === 'SETUP' ? 'Aktivasi 2FA berhasil dikonfirmasi!' : 'Verifikasi 2FA berhasil!',
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
 * Toggle / Setup 2FA Handler (Safe Setup Verification Flow)
 */
exports.toggle2FA = async (req, res) => {
  try {
    const { enabled } = req.body;
    const firebaseUid = req.user?.uid;

    if (!firebaseUid) {
      return res.status(401).json({ error: 'Otentikasi diperlukan.' });
    }

    const user = await prisma.user.findUnique({
      where: { firebaseUid }
    });

    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }

    // Jika ingin MENONAKTIFKAN 2FA -> Verifikasi Password + Clean-up Sesi + Kirim Alert Email Security
    if (!enabled) {
      const provider = req.user?.firebase?.sign_in_provider || 'password';
      const isPasswordProvider = provider === 'password';
      const { password } = req.body;

      if (isPasswordProvider && !password) {
        return res.status(400).json({ error: 'Password saat ini diperlukan untuk menonaktifkan 2FA.' });
      }

      if (user.password && password) {
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(400).json({ error: 'Password yang Anda masukkan salah.' });
        }
      }

      // 1. Invalidate & clean up all active TwoFactorToken records for this user in DB
      await prisma.twoFactorToken.deleteMany({
        where: { userId: user.id }
      });

      // 2. Set is2FAEnabled = false
      await prisma.user.update({
        where: { id: user.id },
        data: { is2FAEnabled: false }
      });

      // 3. Immediately trigger security alert email via emailService
      const { getDeviceIp } = require('../services/twoFactorService');
      const { send2FADisabledSecurityEmail } = require('../services/emailService');
      const ipAddress = getDeviceIp(req);
      const userAgent = req.headers['user-agent'];

      send2FADisabledSecurityEmail(user.email, ipAddress, userAgent, new Date()).catch(err => {
        console.error('Background 2FA Deactivation Security Email Error:', err.message);
      });

      return res.json({
        status: 'DISABLED',
        is2FAEnabled: false,
        message: 'Autentikasi 2-Langkah (2FA) berhasil dinonaktifkan.'
      });
    }

    // Jika ingin MENGAKTIFKAN 2FA -> Kirim email verifikasi setup (Safe Setup Flow)
    const reqOrigin = req.headers.origin || req.headers.referer;
    const { rawToken } = await generate2FAToken(user.id, req, 'SETUP');

    send2FAMagicLinkEmail(user.email, rawToken, 'SETUP', reqOrigin).catch(err => {
      console.error('Background 2FA Setup Email Error:', err.message);
    });

    res.json({
      status: 'SETUP_LINK_SENT',
      is2FAEnabled: false,
      message: `Tautan verifikasi aktivasi 2FA telah dikirim ke ${user.email}. Silakan buka email dan klik link untuk menyelesaikan pengaktifan.`
    });
  } catch (error) {
    console.error('Toggle 2FA Error:', error.message);
    res.status(500).json({ error: error.message || 'Gagal mengubah status 2FA.' });
  }
};
