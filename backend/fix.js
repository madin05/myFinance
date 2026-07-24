const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const admin = require('./src/services/firebase');

async function fix() {
  const targetEmail = 'arifsyah1018@gmail.com';
  console.log('--- MENGHAPUS ARIFSYAH1018@GMAIL.COM DARI SISTEM DEV ---');

  // 1. Hapus dari Prisma DB
  try {
    const user = await prisma.user.findFirst({ where: { email: targetEmail } });
    if (user) {
      await prisma.user.delete({ where: { id: user.id } });
      console.log('✅ Berhasil dihapus dari Prisma DB!');
    } else {
      console.log('⚠️ Tidak ditemukan di Prisma DB (Mungkin sudah dihapus manual).');
    }
  } catch (err) {
    console.error('Gagal hapus dari DB:', err.message);
  }

  // 2. Hapus dari Firebase Auth
  try {
    const fbUser = await admin.auth().getUserByEmail(targetEmail);
    if (fbUser) {
      await admin.auth().deleteUser(fbUser.uid);
      console.log('✅ Berhasil dihapus dari Firebase Auth!');
    }
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      console.log('⚠️ Tidak ditemukan di Firebase Auth (Mungkin sudah terhapus).');
    } else {
      console.error('Gagal hapus dari Firebase Auth:', err.message);
    }
  }
  
  await prisma.$disconnect();
  process.exit(0);
}

fix();
