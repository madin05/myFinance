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
