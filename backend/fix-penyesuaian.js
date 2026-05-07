// Script untuk menghapus semua transaksi "Penyesuaian" dari database
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const USER_EMAIL = 'arifsyah1018@gmail.com';

async function main() {
  const user = await prisma.user.findUnique({ where: { email: USER_EMAIL } });
  if (!user) {
    console.log('❌ User tidak ditemukan!');
    return;
  }

  // Cari semua transaksi penyesuaian
  const penyesuaian = await prisma.transaction.findMany({
    where: {
      userId: user.id,
      OR: [
        { category: 'Penyesuaian' },
        { description: { contains: 'Penyesuaian saldo' } }
      ]
    }
  });

  console.log(`\n🔍 Ditemukan ${penyesuaian.length} transaksi penyesuaian:`);
  penyesuaian.forEach(tx => {
    console.log(`  - ID: ${tx.id} | ${tx.date.toLocaleDateString('id-ID')} | ${tx.type} | Rp ${Math.abs(tx.amount).toLocaleString('id-ID')} | ${tx.description}`);
  });

  if (penyesuaian.length === 0) {
    console.log('✅ Tidak ada transaksi penyesuaian yang perlu dihapus.');
    return;
  }

  // Hapus semua
  const result = await prisma.transaction.deleteMany({
    where: {
      userId: user.id,
      category: 'Penyesuaian'
    }
  });

  console.log(`\n🗑️  Berhasil menghapus ${result.count} transaksi penyesuaian dari database.`);
  console.log('✅ Sekarang kamu bisa buat penyesuaian baru lewat Dashboard dengan tanggal yang benar!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
