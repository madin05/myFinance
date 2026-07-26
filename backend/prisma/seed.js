/**
 * myFinance — Database Seed Script for Local Development
 * Run: node prisma/seed.js [firebaseUid]
 * 
 * If no firebaseUid is provided, it will automatically seed ALL registered users in local DB.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];

function randomDateInLastMonths(monthsBack) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  return new Date(start.getTime() + Math.random() * (now.getTime() - start.getTime()));
}

function periodOf(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const ACCOUNTS_SEED = [
  { name: 'Bank BCA',    type: 'Bank',     balance: 15_450_000, logo: '/assets/banks/bca.svg',    orderIndex: 0 },
  { name: 'Bank Mandiri',type: 'Bank',     balance: 8_200_000,  logo: '/assets/banks/mandiri.svg',orderIndex: 1 },
  { name: 'GoPay',       type: 'E-Wallet', balance: 750_000,    logo: '/assets/banks/gopay.svg',  orderIndex: 2 },
  { name: 'DANA',        type: 'E-Wallet', balance: 450_000,    logo: '/assets/banks/dana.svg',   orderIndex: 3 },
  { name: 'Dompet Tunai',type: 'Cash',     balance: 350_000,    logo: '/assets/banks/cash.svg',   orderIndex: 4 },
];

const INCOME_ITEMS = [
  { description: 'Gaji Bulanan Utama',    category: 'Pendapatan', method: 'Transfer Bank', account: 'Bank BCA',     amount: () => rand(7_000_000, 12_000_000) },
  { description: 'Project Freelance UI', category: 'Pendapatan', method: 'Transfer Bank', account: 'Bank Mandiri', amount: () => rand(1_500_000, 4_000_000) },
  { description: 'Bonus Kinerja Q2',     category: 'Pendapatan', method: 'Transfer Bank', account: 'Bank BCA',     amount: () => rand(2_000_000, 5_000_000) },
  { description: 'Dividen Saham BBCA',   category: 'Pendapatan', method: 'Transfer Bank', account: 'Bank BCA',     amount: () => rand(300_000, 1_200_000) },
  { description: 'Penjualan Gadget Bekas',category: 'Pendapatan', method: 'Dana',          account: 'DANA',         amount: () => rand(250_000, 850_000) },
  { description: 'Cashback Promo GoPay', category: 'Pendapatan', method: 'GoPay',         account: 'GoPay',        amount: () => rand(15_000, 75_000) },
];

const EXPENSE_ITEMS = [
  { description: 'Makan Siang Resto',     category: 'Makanan',     method: 'Cash',          account: 'Dompet Tunai', amount: () => rand(25_000, 75_000) },
  { description: 'Kopi Kekinian Daily',  category: 'Makanan',     method: 'GoPay',         account: 'GoPay',        amount: () => rand(28_000, 60_000) },
  { description: 'Belanja Bulanan Supermarket', category: 'Makanan', method: 'GoPay',     account: 'GoPay',        amount: () => rand(250_000, 650_000) },
  { description: 'Makan Malam Seafood',  category: 'Makanan',     method: 'Cash',          account: 'Dompet Tunai', amount: () => rand(120_000, 350_000) },
  { description: 'GrabFood Delivery',    category: 'Makanan',     method: 'OVO',           account: 'GoPay',        amount: () => rand(40_000, 110_000) },
  { description: 'Token Listrik PLN',    category: 'Tagihan',     method: 'Transfer Bank', account: 'Bank BCA',     amount: () => rand(150_000, 450_000) },
  { description: 'Tagihan WiFi Indihome', category: 'Tagihan',    method: 'Transfer Bank', account: 'Bank BCA',     amount: () => rand(320_000, 480_000) },
  { description: 'Langganan Netflix 4K', category: 'Tagihan',     method: 'Kartu Kredit',  account: 'Bank BCA',     amount: () => rand(186_000, 186_000) },
  { description: 'Spotify Family Plan',  category: 'Hiburan',     method: 'Dana',          account: 'DANA',         amount: () => rand(54_900, 86_900) },
  { description: 'GrabCar ke Kantor',    category: 'Transportasi', method: 'GoPay',        account: 'GoPay',        amount: () => rand(25_000, 85_000) },
  { description: 'Isi Bensin Pertamax',  category: 'Transportasi', method: 'Cash',         account: 'Dompet Tunai', amount: () => rand(50_000, 150_000) },
  { description: 'Parkir Mall & Gedung', category: 'Transportasi', method: 'Cash',         account: 'Dompet Tunai', amount: () => rand(10_000, 30_000) },
  { description: 'Baju & Sepatu Baru',   category: 'Belanja',     method: 'Kartu Kredit',  account: 'Bank BCA',     amount: () => rand(250_000, 1_200_000) },
  { description: 'Skincare & Bodycare',  category: 'Belanja',     method: 'Dana',          account: 'DANA',         amount: () => rand(150_000, 600_000) },
  { description: 'Buku O\'Reilly Programming', category: 'Pendidikan', method: 'Transfer Bank', account: 'Bank Mandiri', amount: () => rand(120_000, 350_000) },
  { description: 'Langganan Course Udemy',category: 'Pendidikan', method: 'Transfer Bank', account: 'Bank Mandiri', amount: () => rand(150_000, 500_000) },
  { description: 'Keanggotaan Gym',      category: 'Kesehatan',   method: 'Transfer Bank', account: 'Bank BCA',     amount: () => rand(250_000, 500_000) },
  { description: 'Vitamin C & Multivitamin', category: 'Kesehatan', method: 'Dana',        account: 'DANA',         amount: () => rand(75_000, 250_000) },
  { description: 'Beli Game Steam Sale', category: 'Hiburan',     method: 'Dana',          account: 'DANA',         amount: () => rand(60_000, 450_000) },
  { description: 'Tiket Nonton XXI IMAX', category: 'Hiburan',    method: 'GoPay',         account: 'GoPay',        amount: () => rand(75_000, 180_000) },
];

const BUDGETS_SEED = [
  { category: 'Makanan',      amount: 2_500_000 },
  { category: 'Transportasi', amount: 1_000_000 },
  { category: 'Hiburan',      amount: 800_000 },
  { category: 'Belanja',      amount: 1_200_000 },
  { category: 'Tagihan',      amount: 1_000_000 },
  { category: 'Kesehatan',    amount: 500_000 },
];

const SAVINGS_SEED = [
  { name: 'Dana Darurat 6 Bulan', targetAmount: 36_000_000, currentAmount: 14_500_000, icon: '🛡️', color: '#3B82F6', orderIndex: 0 },
  { name: 'Liburan ke Jepang',    targetAmount: 25_000_000, currentAmount: 8_200_000,  icon: '✈️', color: '#F97316', orderIndex: 1 },
  { name: 'MacBook Pro M4 Max',   targetAmount: 32_000_000, currentAmount: 19_000_000, icon: '💻', color: '#8B5CF6', orderIndex: 2 },
  { name: 'DP Rumah Idaman',      targetAmount: 120_000_000, currentAmount: 38_000_000, icon: '🏠', color: '#10B981', orderIndex: 3 },
  { name: 'Motor Vespa Sprint',   targetAmount: 55_000_000, currentAmount: 24_000_000, icon: '🛵', color: '#EF4444', orderIndex: 4 },
];

async function seedUser(user) {
  console.log(`\n🌱 Seeding user: ${user.name} (${user.email}) - UID: ${user.firebaseUid}`);

  // Clear existing records to prevent clutter
  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  await prisma.saving.deleteMany({ where: { userId: user.id } });
  await prisma.budget.deleteMany({ where: { userId: user.id } });
  await prisma.account.deleteMany({ where: { userId: user.id } });
  console.log('   🗑️  Cleared existing user data');

  // Seed Accounts
  const accountData = ACCOUNTS_SEED.map(a => ({ ...a, userId: user.id }));
  await prisma.account.createMany({ data: accountData });
  console.log(`   🏦 Seeded ${accountData.length} accounts (BCA, Mandiri, GoPay, DANA, Cash)`);

  // Seed Transactions (60 entries over last 6 months)
  const txData = [];
  for (let m = 0; m < 6; m++) {
    const salaryDate = new Date();
    salaryDate.setMonth(salaryDate.getMonth() - m);
    salaryDate.setDate(rand(1, 3));
    txData.push({
      userId: user.id,
      date: salaryDate,
      category: 'Pendapatan',
      method: 'Transfer Bank',
      account: 'Bank BCA',
      description: 'Gaji Bulanan Utama',
      amount: rand(8_000_000, 12_000_000),
      type: 'income'
    });

    const incomeCount = rand(2, 4);
    for (let i = 0; i < incomeCount; i++) {
      const item = pick(INCOME_ITEMS.slice(1));
      txData.push({
        userId: user.id,
        date: randomDateInLastMonths(m + 1),
        category: item.category,
        method: item.method,
        account: item.account,
        description: item.description,
        amount: item.amount(),
        type: 'income'
      });
    }

    const expenseCount = rand(8, 12);
    for (let i = 0; i < expenseCount; i++) {
      const item = pick(EXPENSE_ITEMS);
      txData.push({
        userId: user.id,
        date: randomDateInLastMonths(m + 1),
        category: item.category,
        method: item.method,
        account: item.account,
        description: item.description,
        amount: item.amount(),
        type: 'expense'
      });
    }
  }
  await prisma.transaction.createMany({ data: txData });
  console.log(`   💸 Seeded ${txData.length} transactions across 6 months`);

  // Seed Budgets (3 months)
  const budgetData = [];
  for (let m = 0; m < 3; m++) {
    const d = new Date();
    d.setMonth(d.getMonth() - m);
    const period = periodOf(d);
    for (const b of BUDGETS_SEED) {
      budgetData.push({
        userId: user.id,
        category: b.category,
        amount: b.amount,
        period: period
      });
    }
  }
  await prisma.budget.createMany({ data: budgetData });
  console.log(`   📊 Seeded ${budgetData.length} budgets`);

  // Seed Savings
  const savingsData = SAVINGS_SEED.map(s => ({ ...s, userId: user.id }));
  await prisma.saving.createMany({ data: savingsData });
  console.log(`   🎯 Seeded ${savingsData.length} wishlist target tabungan`);

  console.log(`   ✅ Selesai seeding untuk ${user.name}`);
}

async function main() {
  const targetUid = process.argv[2];

  let users = [];
  if (targetUid) {
    const user = await prisma.user.findUnique({ where: { firebaseUid: targetUid } });
    if (user) users.push(user);
    else {
      console.error(`❌ User dengan firebaseUid "${targetUid}" tidak ditemukan di database.`);
      process.exit(1);
    }
  } else {
    users = await prisma.user.findMany();
  }

  if (users.length === 0) {
    console.log('⚠️  Belum ada user terdaftar di database local.');
    console.log('   Silakan daftar / login terlebih dahulu di web, lalu jalankan script seed ini kembali.');
    process.exit(0);
  }

  console.log(`\n==============================================`);
  console.log(`🌱 MYFINANCE LOCAL DATA DUMP SEEDER (${users.length} User)`);
  console.log(`==============================================`);

  for (const u of users) {
    await seedUser(u);
  }

  console.log('\n==============================================');
  console.log('🚀 DUMP DATA LOCAL BERHASIL DISIMPAN!');
  console.log('   Silakan refresh web aplikasi untuk melihat data dump.');
  console.log('==============================================\n');
}

main()
  .catch(e => { console.error('❌ Error Seeding:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
