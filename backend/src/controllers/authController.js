const admin = require('../services/firebase');

exports.createSession = async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: 'ID Token wajib dikirim bre!' });
  }

  // Set waktu kadaluarsa cookie (7 hari sesuai diagram)
  const expiresIn = 60 * 60 * 24 * 7 * 1000; // 7 hari dalam milidetik

  try {
    // Generate session cookie menggunakan Firebase Admin SDK
    const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });

    // Konfigurasi cookie (HttpOnly, Secure, SameSite)
    const cookieOptions = {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // true di production, false di localhost
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' di prod (cross-site), 'lax' di localhost
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
 * Handler kirim email reset password via backend Nodemailer + Firebase Admin SDK
 */
exports.resetPassword = async (req, res) => {
  const { email } = req.body;
  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'Email atau username wajib diisi!' });
  }

  try {
    const prisma = require('../services/db');
    let targetEmail = email.trim();

    // Jika input bukan format email (tidak ada '@'), coba cari berdasarkan username/nama di DB
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

    const admin = require('../services/firebase');
    // Pre-check ketersediaan user di Firebase Auth (super cepat ~50ms)
    try {
      await admin.auth().getUserByEmail(targetEmail);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        return res.status(400).json({ error: 'Email tidak terdaftar di sistem.' });
      }
      throw err;
    }

    // ⚡ Kirim respon HTTP 200 INSTAN ke UI (tanpa menunggu loading SMTP!)
    res.json({ success: true, message: `Tautan reset password berhasil dikirim ke ${targetEmail}!`, targetEmail });

    // 🚀 Jalankan proses SMTP Nodemailer di background secara non-blocking
    const { sendPasswordResetEmail } = require('../services/emailService');
    sendPasswordResetEmail(targetEmail).catch(err => {
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
