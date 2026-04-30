const admin = require('firebase-admin');
const path = require('path');

// Cek apakah file kunci rahasia ada
const serviceAccountPath = path.join(__dirname, '../../firebase-service-account.json');

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath)
  });
  console.log('✅ Firebase Admin Initialized');
} catch (error) {
  console.error('❌ Firebase Admin Error:', error.message);
  console.log('💡 Pastikan file firebase-service-account.json sudah ada di folder backend!');
}

module.exports = admin;
