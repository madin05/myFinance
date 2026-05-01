const admin = require('firebase-admin');
const path = require('path');

// Gunakan file lokal jika ada, kalau di server (Vercel) gunakan Env Variable
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const rawCreds = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
    const creds = rawCreds.startsWith('{') ? rawCreds : Buffer.from(rawCreds, 'base64').toString();
    serviceAccount = JSON.parse(creds);
    console.log('📦 Firebase service account loaded from Env Variable');
  } catch (e) {
    console.error('❌ Error parsing FIREBASE_SERVICE_ACCOUNT:', e.message);
  }
} else {
  try {
    const serviceAccountPath = path.join(__dirname, '../../firebase-service-account.json');
    serviceAccount = require(serviceAccountPath);
    console.log('📄 Firebase service account loaded from local file');
  } catch (e) {
    console.warn('⚠️ File firebase-service-account.json tidak ditemukan, pastikan Env Variable terisi!');
  }
}

try {
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin Initialized');
  } else {
    throw new Error('No service account configuration found');
  }
} catch (error) {
  console.error('❌ Firebase Admin Error:', error.message);
}

module.exports = admin;
