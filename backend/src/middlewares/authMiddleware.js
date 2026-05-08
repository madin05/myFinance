const admin = require('../services/firebase');

const authMiddleware = async (req, res, next) => {
  // Ambil Firebase session cookie dari cookies
  const sessionCookie = req.cookies ? req.cookies.session : null;

  if (sessionCookie) {
    try {
      // Verifikasi Firebase session cookie
      const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie, true);
      req.user = decodedClaims;
      return next();
    } catch (error) {
      console.error('Session Cookie Auth Error:', error.message);
      return res.status(401).json({ error: 'Sesi habis atau tidak valid bre! Silakan login ulang.' });
    }
  }

  // Fallback ke Authorization Bearer header (untuk kenyamanan development & testing)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req.user = decodedToken;
      return next();
    } catch (error) {
      console.error('ID Token Auth Error:', error.message);
      return res.status(401).json({ error: 'Token palsu atau sudah expired bre!' });
    }
  }

  return res.status(401).json({ error: 'Akses ditolak bre! Sesi atau Token tidak ditemukan.' });
};

module.exports = authMiddleware;
