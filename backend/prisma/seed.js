/**
 * myFinance — Database Seed Script for Local Development
 * 
 * Usage:
 *   node prisma/seed.js                    -> Seeds all registered users (or creates demo user if empty)
 *   node prisma/seed.js [firebaseUid|email] -> Seeds a specific user by UID or email
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];

function periodOf(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── 1. ACCOUNTS (SALDO AKUN) ────────────────────────────────────────────────
const ACCOUNTS_SEED = [
  { name: 'Bank BCA',     type: 'Bank',     balance: 14_850_000, logo: '/assets/banks/bca.png',     orderIndex: 0 },
  { name: 'Bank Mandiri', type: 'Bank',     balance: 8_400_000,  logo: '/assets/banks/mandiri.png', orderIndex: 1 },
  { name: 'Bank Jago',    type: 'Bank',     balance: 3_250_000,  logo: '/assets/banks/jago.png',    orderIndex: 2 },
  { name: 'GoPay',        type: 'E-Wallet', balance: 750_000,    logo: '/assets/banks/gopay.svg',   orderIndex: 3 },
  { name: 'DANA',         type: 'E-Wallet', balance: 420_000,    logo: '/assets/banks/dana.png',    orderIndex: 4 },
  { name: 'Dompet Tunai', type: 'Cash',     balance: 380_000,    logo: '',                          orderIndex: 5 },
];

// ─── 2. INCOME TEMPLATES ─────────────────────────────────────────────────────
const INCOME_TEMPLATES = [
  { description: 'Gaji Bulanan Utama',      category: 'Gaji & Pendapatan',    method: 'Bank Transfer', account: 'Bank BCA',     amount: () => rand(11_000_000, 14_500_000) },
  { description: 'Project Freelance Web UI',category: 'Gaji & Pendapatan',    method: 'Bank Transfer', account: 'Bank Mandiri', amount: () => rand(2_500_000, 5_500_000) },
  { description: 'Bonus Kinerja Tim',       category: 'Gaji & Pendapatan',    method: 'Bank Transfer', account: 'Bank BCA',     amount: () => rand(2_000_000, 4_500_000) },
  { description: 'Dividen Saham BBCA',     category: 'Investasi & Tabungan', method: 'Bank Transfer', account: 'Bank BCA',     amount: () => rand(450_000, 1_250_000) },
  { description: 'Imbal Hasil Reksadana',  category: 'Investasi & Tabungan', method: 'Bank Transfer', account: 'Bank Jago',    amount: () => rand(200_000, 650_000) },
  { description: 'Cashback Promo GoPay',    category: 'Lain-lain',            method: 'E-Wallet',      account: 'GoPay',        amount: () => rand(20_000, 60_000) },
  { description: 'Penjualan Aksesoris Bekas', category: 'Lain-lain',          method: 'E-Wallet',      account: 'DANA',         amount: () => rand(150_000, 450_000) },
];

// ─── 3. EXPENSE TEMPLATES ────────────────────────────────────────────────────
const EXPENSE_TEMPLATES = [
  // Makanan & Minuman
  { description: 'Makan Siang Resto',             category: 'Makanan & Minuman', method: 'Cash',          account: 'Dompet Tunai', amount: () => rand(35_000, 85_000) },
  { description: 'Kopi Kekinian & Toast',         category: 'Makanan & Minuman', method: 'E-Wallet',      account: 'GoPay',        amount: () => rand(28_000, 60_000) },
  { description: 'Belanja Bulanan Supermarket',    category: 'Makanan & Minuman', method: 'Bank Transfer', account: 'Bank BCA',     amount: () => rand(350_000, 950_000) },
  { description: 'GrabFood Delivery Makan Malam', category: 'Makanan & Minuman', method: 'E-Wallet',      account: 'GoPay',        amount: () => rand(45_000, 120_000) },
  { description: 'Makan Malam Seafood & Family',  category: 'Makanan & Minuman', method: 'E-Wallet',      account: 'DANA',         amount: () => rand(120_000, 320_000) },

  // Transportasi
  { description: 'Isi Bensin Pertamax',           category: 'Transportasi',      method: 'Cash',          account: 'Dompet Tunai', amount: () => rand(50_000, 150_000) },
  { description: 'GrabCar Transportasi Kantor',   category: 'Transportasi',      method: 'E-Wallet',      account: 'GoPay',        amount: () => rand(25_000, 85_000) },
  { description: 'Top Up E-Toll & Parkir Gedung', category: 'Transportasi',      method: 'Bank Transfer', account: 'Bank Mandiri', amount: () => rand(50_000, 120_000) },
  { description: 'Servis Rutin & Ganti Oli',      category: 'Transportasi',      method: 'Cash',          account: 'Dompet Tunai', amount: () => rand(150_000, 280_000) },

  // Tagihan
  { description: 'Token Listrik PLN Rumah',       category: 'Tagihan',           method: 'Bank Transfer', account: 'Bank BCA',     amount: () => rand(250_000, 500_000) },
  { description: 'Tagihan WiFi Fiber Optik',      category: 'Tagihan',           method: 'Bank Transfer', account: 'Bank Mandiri', amount: () => rand(350_000, 480_000) },
  { description: 'Langganan Netflix 4K UHD',      category: 'Tagihan',           method: 'Kartu Kredit',  account: 'Bank BCA',     amount: () => 186_000 },
  { description: 'Langganan Spotify Family Plan', category: 'Tagihan',           method: 'E-Wallet',      account: 'DANA',         amount: () => 86_900 },
  { description: 'Iuran BPJS Kesehatan',          category: 'Tagihan',           method: 'Bank Transfer', account: 'Bank BCA',     amount: () => 150_000 },
  { description: 'Paket Data Internet 50GB',      category: 'Tagihan',           method: 'E-Wallet',      account: 'GoPay',        amount: () => rand(100_000, 160_000) },

  // Belanja
  { description: 'Beli Pakaian & Kemeja Kerja',   category: 'Belanja',           method: 'Bank Transfer', account: 'Bank BCA',     amount: () => rand(250_000, 750_000) },
  { description: 'Peralatan Kerja & Setup Meja',  category: 'Belanja',           method: 'Bank Transfer', account: 'Bank Mandiri', amount: () => rand(150_000, 550_000) },
  { description: 'Skincare & Personal Care',      category: 'Belanja',           method: 'E-Wallet',      account: 'DANA',         amount: () => rand(120_000, 380_000) },

  // Hiburan
  { description: 'Tiket Bioskop XXI IMAX & Snack',category: 'Hiburan',           method: 'E-Wallet',      account: 'GoPay',        amount: () => rand(95_000, 190_000) },
  { description: 'Beli Game Steam Sale',          category: 'Hiburan',           method: 'E-Wallet',      account: 'DANA',         amount: () => rand(120_000, 450_000) },
  { description: 'Wisata Akhir Pekan & Kuliner',  category: 'Hiburan',           method: 'Cash',          account: 'Dompet Tunai', amount: () => rand(180_000, 420_000) },

  // Kesehatan
  { description: 'Vitamin C & Multivitamin',      category: 'Kesehatan',         method: 'E-Wallet',      account: 'DANA',         amount: () => rand(75_000, 190_000) },
  { description: 'Membership Bulanan Gym Fitness',category: 'Kesehatan',         method: 'Bank Transfer', account: 'Bank BCA',     amount: () => rand(300_000, 450_000) },
  { description: 'Konsultasi Dokter & Apotek',    category: 'Kesehatan',         method: 'E-Wallet',      account: 'GoPay',        amount: () => rand(85_000, 200_000) },

  // Pendidikan
  { description: 'Langganan Kursus Udemy Pro',    category: 'Pendidikan',        method: 'Bank Transfer', account: 'Bank Mandiri', amount: () => rand(150_000, 400_000) },
  { description: 'Beli Buku Pemrograman & Bisnis',category: 'Pendidikan',        method: 'Bank Transfer', account: 'Bank BCA',     amount: () => rand(120_000, 260_000) },

  // Investasi & Tabungan
  { description: 'Top Up Reksadana Pendapatan Tetap', category: 'Investasi & Tabungan', method: 'Bank Transfer', account: 'Bank Jago', amount: () => rand(500_000, 1_500_000) },
  { description: 'Beli Emas Digital',             category: 'Investasi & Tabungan', method: 'E-Wallet',      account: 'DANA',         amount: () => rand(250_000, 600_000) },

  // Lain-lain
  { description: 'Infaq & Sedekah Rutin',         category: 'Lain-lain',         method: 'Cash',          account: 'Dompet Tunai', amount: () => rand(30_000, 100_000) },
  { description: 'Laundry Kiloan Express',        category: 'Lain-lain',         method: 'Cash',          account: 'Dompet Tunai', amount: () => rand(40_000, 80_000) },
];

// ─── 4. TRANSFERS ───────────────────────────────────────────────────────────
const TRANSFER_TEMPLATES = [
  { from: 'Bank BCA', to: 'GoPay',        desc: 'Top up GoPay jajan mingguan', amount: () => rand(300_000, 600_000) },
  { from: 'Bank BCA', to: 'DANA',         desc: 'Top up DANA belanja',         amount: () => rand(250_000, 500_000) },
  { from: 'Bank Mandiri', to: 'Bank Jago', desc: 'Pindah alokasi tabungan',     amount: () => rand(500_000, 1_200_000) },
  { from: 'Bank BCA', to: 'Dompet Tunai', desc: 'Tarik tunai ATM',             amount: () => rand(300_000, 500_000) },
];

// ─── 5. BUDGETS (ANGGARAN BULANAN) ──────────────────────────────────────────
const BUDGETS_SEED = [
  { category: 'Makanan & Minuman',    amount: 2_600_000 },
  { category: 'Transportasi',         amount: 950_000 },
  { category: 'Tagihan',              amount: 1_250_000 },
  { category: 'Belanja',              amount: 1_200_000 },
  { category: 'Hiburan',              amount: 650_000 },
  { category: 'Kesehatan',            amount: 500_000 },
  { category: 'Pendidikan',           amount: 450_000 },
  { category: 'Investasi & Tabungan', amount: 1_800_000 },
  { category: 'Lain-lain',            amount: 350_000 },
];

// ─── 6. SAVINGS (WISHLIST TABUNGAN) ─────────────────────────────────────────
const SAVINGS_SEED = [
  {
    name: 'Dana Darurat 6 Bulan',
    targetAmount: 36_000_000,
    currentAmount: 22_500_000,
    icon: 'ph-shield-check',
    color: 'bg-primary',
    orderIndex: 0,
    isDone: false,
  },
  {
    name: 'MacBook Pro M4 Max',
    targetAmount: 32_000_000,
    currentAmount: 24_000_000,
    icon: 'ph-laptop',
    color: 'bg-purple',
    orderIndex: 1,
    isDone: false,
  },
  {
    name: 'Liburan ke Jepang (Musim Gugur)',
    targetAmount: 25_000_000,
    currentAmount: 11_500_000,
    icon: 'ph-airplane-tilt',
    color: 'bg-orange',
    orderIndex: 2,
    isDone: false,
  },
  {
    name: 'DP Rumah Impian',
    targetAmount: 100_000_000,
    currentAmount: 35_000_000,
    icon: 'ph-house',
    color: 'bg-green',
    orderIndex: 3,
    isDone: false,
  },
  {
    name: 'Upgrade Motor Vespa Sprint',
    targetAmount: 55_000_000,
    currentAmount: 18_000_000,
    icon: 'ph-car',
    color: 'bg-red',
    orderIndex: 4,
    isDone: false,
  },
  // Completed items for History Drawer feature
  {
    name: 'Smartwatch Garmin Venu',
    targetAmount: 6_500_000,
    currentAmount: 6_500_000,
    icon: 'ph-heart',
    color: 'bg-green',
    orderIndex: 5,
    isDone: true,
  },
  {
    name: 'Kursus Sertifikasi Cloud Architect',
    targetAmount: 3_200_000,
    currentAmount: 3_200_000,
    icon: 'ph-laptop',
    color: 'bg-primary',
    orderIndex: 6,
    isDone: true,
  },
];

async function seedUser(user) {
  console.log(`\n======================================================`);
  console.log(`🌱 Seeding User: ${user.name} (${user.email})`);
  console.log(`   UID: ${user.firebaseUid} | DB ID: ${user.id}`);
  console.log(`======================================================`);

  // 1. Clear existing user data (to eliminate old dumps/discrepancies)
  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  await prisma.saving.deleteMany({ where: { userId: user.id } });
  await prisma.budget.deleteMany({ where: { userId: user.id } });
  await prisma.account.deleteMany({ where: { userId: user.id } });
  console.log('   🗑️  Data lama user berhasil dibersihkan.');

  // 2. Seed Accounts
  const accountData = ACCOUNTS_SEED.map(a => ({ ...a, userId: user.id }));
  await prisma.account.createMany({ data: accountData });
  console.log(`   🏦 Berhasil menambahkan ${accountData.length} akun saldo (BCA, Mandiri, Jago, GoPay, DANA, Dompet Tunai)`);

  // 3. Seed Transactions (over the last 6 months, including current month up to today)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  const txData = [];

  for (let m = 0; m < 6; m++) {
    const targetDate = new Date(currentYear, currentMonth - m, 1);
    const y = targetDate.getFullYear();
    const mo = targetDate.getMonth();
    const daysInMonth = new Date(y, mo + 1, 0).getDate();
    const maxDay = m === 0 ? currentDay : daysInMonth;

    // A. Main Salary
    const salaryDay = m === 0 ? Math.min(1, maxDay) : 1;
    txData.push({
      userId: user.id,
      date: new Date(y, mo, salaryDay, 9, 0, 0),
      category: 'Gaji & Pendapatan',
      method: 'Bank Transfer',
      account: 'Bank BCA',
      description: 'Gaji Bulanan Utama',
      amount: rand(11_500_000, 14_000_000),
      type: 'income',
    });

    // B. Additional Incomes
    const incCount = rand(1, 3);
    for (let i = 0; i < incCount; i++) {
      const item = pick(INCOME_TEMPLATES.slice(1));
      const day = rand(2, maxDay);
      txData.push({
        userId: user.id,
        date: new Date(y, mo, day, rand(8, 19), rand(0, 59), 0),
        category: item.category,
        method: item.method,
        account: item.account,
        description: item.description,
        amount: item.amount(),
        type: 'income',
      });
    }

    // C. Expenses
    const expCount = m === 0 ? Math.max(8, Math.floor((currentDay / daysInMonth) * 16)) : rand(12, 18);
    for (let i = 0; i < expCount; i++) {
      const item = pick(EXPENSE_TEMPLATES);
      const day = rand(1, maxDay);
      txData.push({
        userId: user.id,
        date: new Date(y, mo, day, rand(7, 22), rand(0, 59), 0),
        category: item.category,
        method: item.method,
        account: item.account,
        description: item.description,
        amount: item.amount(),
        type: 'expense',
      });
    }

    // D. Transfers
    const transferCount = rand(1, 2);
    for (let t = 0; t < transferCount; t++) {
      const tr = pick(TRANSFER_TEMPLATES);
      const day = rand(1, maxDay);
      txData.push({
        userId: user.id,
        date: new Date(y, mo, day, rand(9, 21), rand(0, 59), 0),
        category: 'Transfer',
        method: `Transfer (${tr.from} → ${tr.to})`,
        account: tr.from,
        description: tr.desc,
        amount: tr.amount(),
        type: 'transfer',
      });
    }
  }

  txData.sort((a, b) => b.date - a.date);
  await prisma.transaction.createMany({ data: txData });
  console.log(`   💸 Berhasil menambahkan ${txData.length} riwayat transaksi (Income, Expense, Transfer 6 bulan)`);

  // 4. Seed Budgets
  const budgetData = [];
  for (let m = 0; m < 6; m++) {
    const d = new Date(currentYear, currentMonth - m, 1);
    const period = periodOf(d);
    for (const b of BUDGETS_SEED) {
      budgetData.push({
        userId: user.id,
        category: b.category,
        amount: b.amount,
        period: period,
      });
    }
  }
  await prisma.budget.createMany({ data: budgetData });
  console.log(`   📊 Berhasil menambahkan ${budgetData.length} target anggaran (${periodOf(new Date(currentYear, currentMonth - 5, 1))} s/d ${periodOf(now)})`);

  // 5. Seed Savings / Wishlist
  const savingsData = SAVINGS_SEED.map(s => ({ ...s, userId: user.id }));
  await prisma.saving.createMany({ data: savingsData });
  console.log(`   🎯 Berhasil menambahkan ${savingsData.length} target wishlist (Aktif & Selesai untuk history)`);

  console.log(`   ✅ Selesai seeding data dump untuk user: ${user.name}`);
}

async function main() {
  const targetParam = process.argv[2]?.trim();

  let users = [];
  if (targetParam) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { firebaseUid: targetParam },
          { email: { equals: targetParam, mode: 'insensitive' } },
        ]
      }
    });

    if (user) {
      users.push(user);
    } else {
      console.error(`❌ User dengan UID/Email "${targetParam}" tidak ditemukan di database.`);
      process.exit(1);
    }
  } else {
    users = await prisma.user.findMany();
  }

  if (users.length === 0) {
    console.log('⚠️  Belum ada user terdaftar. Membuat user default untuk local development...');
    const defaultUser = await prisma.user.create({
      data: {
        firebaseUid: 'local-dev-user-001',
        name: 'Muhammad Arif Syahrudin',
        email: 'arifsyah1018@gmail.com',
        currency: 'IDR',
        financialStartDay: 1,
        balanceOffset: 0,
      }
    });
    users.push(defaultUser);
    console.log(`✅ Berhasil membuat user default: ${defaultUser.name} (${defaultUser.email})`);
  }

  console.log(`\n======================================================`);
  console.log(`🚀 MYFINANCE DATA DUMP LOADER (${users.length} User Terpilih)`);
  console.log(`======================================================`);

  for (const u of users) {
    await seedUser(u);
  }

  console.log('\n======================================================');
  console.log('🎉 SELURUH DATA DUMP LOKAL BERHASIL DISINKRONISASI!');
  console.log('   Semua fitur (Dashboard, Transaksi, Anggaran, Tabungan,');
  console.log('   Laporan & AI) kini memiliki data dump yang selaras.');
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error Seeding Data Dump:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
