/**
 * myFinance — Database Seed Script
 * Run: node prisma/seed.js <firebaseUid>
 * Example: node prisma/seed.js abc123xyz
 *
 * This seeds a specific user with rich dummy data:
 * - 60 transactions (income + expense) across last 6 months
 * - 6 budgets for current month
 * - 5 wishlists (savings goals)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const FIREBASE_UID = process.argv[2];

if (!FIREBASE_UID) {
  console.error('\n❌ Usage: node prisma/seed.js <firebaseUid>\n');
  process.exit(1);
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];

/** Returns a random date within the last N months */
function randomDateInLastMonths(monthsBack) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
  return new Date(start.getTime() + Math.random() * (now.getTime() - start.getTime()));
}

/** Format period string like "2025-04" */
function periodOf(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── SEED DATA ───────────────────────────────────────────────────────────────
const INCOME_ITEMS = [
  { description: 'Gaji Bulanan',         category: 'Pendapatan',  method: 'Transfer Bank', amount: () => rand(5_000_000, 12_000_000) },
  { description: 'Freelance Design',     category: 'Pendapatan',  method: 'Transfer Bank', amount: () => rand(500_000, 3_000_000) },
  { description: 'Bonus Kinerja',        category: 'Pendapatan',  method: 'Transfer Bank', amount: () => rand(1_000_000, 5_000_000) },
  { description: 'Dividen Investasi',    category: 'Pendapatan',  method: 'Transfer Bank', amount: () => rand(200_000, 800_000) },
  { description: 'Penjualan Barang',     category: 'Pendapatan',  method: 'Dana',          amount: () => rand(100_000, 500_000) },
  { description: 'Cashback GoPay',       category: 'Pendapatan',  method: 'GoPay',         amount: () => rand(10_000, 50_000) },
];

const EXPENSE_ITEMS = [
  { description: 'Makan Siang Warteg',   category: 'Makanan',     method: 'Cash',          amount: () => rand(15_000, 35_000) },
  { description: 'Kopi Kekinian',        category: 'Makanan',     method: 'GoPay',         amount: () => rand(25_000, 65_000) },
  { description: 'Belanja Groceries',    category: 'Makanan',     method: 'GoPay',         amount: () => rand(150_000, 400_000) },
  { description: 'Makan Malam Keluarga', category: 'Makanan',     method: 'Cash',          amount: () => rand(80_000, 250_000) },
  { description: 'Grab Food',            category: 'Makanan',     method: 'OVO',           amount: () => rand(30_000, 80_000) },
  { description: 'Token Listrik',        category: 'Tagihan',     method: 'Transfer Bank', amount: () => rand(100_000, 300_000) },
  { description: 'Tagihan Internet',     category: 'Tagihan',     method: 'Transfer Bank', amount: () => rand(200_000, 400_000) },
  { description: 'Langganan Netflix',    category: 'Tagihan',     method: 'Kartu Kredit',  amount: () => rand(54_000, 185_000) },
  { description: 'Spotify Premium',      category: 'Hiburan',     method: 'Dana',          amount: () => rand(19_990, 54_990) },
  { description: 'Grab Car',             category: 'Transportasi', method: 'OVO',          amount: () => rand(15_000, 80_000) },
  { description: 'Bensin Motor',         category: 'Transportasi', method: 'Cash',         amount: () => rand(20_000, 60_000) },
  { description: 'Parkir Mall',          category: 'Transportasi', method: 'Cash',         amount: () => rand(5_000, 20_000) },
  { description: 'Baju Baru',            category: 'Belanja',     method: 'Kartu Kredit',  amount: () => rand(150_000, 800_000) },
  { description: 'Skincare Routine',     category: 'Belanja',     method: 'OVO',           amount: () => rand(100_000, 500_000) },
  { description: 'Buku Programming',     category: 'Pendidikan',  method: 'Transfer Bank', amount: () => rand(80_000, 250_000) },
  { description: 'Kursus Online',        category: 'Pendidikan',  method: 'Kartu Kredit',  amount: () => rand(150_000, 1_200_000) },
  { description: 'Gym Member',           category: 'Kesehatan',   method: 'Transfer Bank', amount: () => rand(150_000, 400_000) },
  { description: 'Vitamin & Suplemen',   category: 'Kesehatan',   method: 'Dana',          amount: () => rand(50_000, 200_000) },
  { description: 'Main Game Steam',      category: 'Hiburan',     method: 'Kartu Kredit',  amount: () => rand(30_000, 300_000) },
  { description: 'Nonton Bioskop',       category: 'Hiburan',     method: 'OVO',           amount: () => rand(45_000, 120_000) },
];

const BUDGETS_SEED = [
  { category: 'Makanan',      amount: 1_500_000 },
  { category: 'Transportasi', amount: 500_000 },
  { category: 'Hiburan',      amount: 400_000 },
  { category: 'Belanja',      amount: 800_000 },
  { category: 'Tagihan',      amount: 600_000 },
  { category: 'Kesehatan',    amount: 300_000 },
];

const SAVINGS_SEED = [
  { name: 'Dana Darurat',         targetAmount: 30_000_000, currentAmount: 8_500_000,  icon: '🛡️',  color: '#3B82F6', orderIndex: 0 },
  { name: 'Liburan ke Jepang',    targetAmount: 25_000_000, currentAmount: 4_200_000,  icon: '✈️',  color: '#F97316', orderIndex: 1 },
  { name: 'MacBook Pro M4',       targetAmount: 30_000_000, currentAmount: 12_000_000, icon: '💻',  color: '#8B5CF6', orderIndex: 2 },
  { name: 'DP Rumah',             targetAmount: 100_000_000, currentAmount: 22_000_000, icon: '🏠', color: '#10B981', orderIndex: 3 },
  { name: 'Motor Baru',           targetAmount: 25_000_000, currentAmount: 7_800_000,  icon: '🏍️', color: '#EF4444', orderIndex: 4 },
];

// ─── MAIN SEEDER ─────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🌱 Starting seed for Firebase UID: ${FIREBASE_UID}\n`);

  // 1. Find user
  const user = await prisma.user.findUnique({ where: { firebaseUid: FIREBASE_UID } });
  if (!user) {
    console.error(`❌ User with firebaseUid "${FIREBASE_UID}" not found in database.`);
    console.error('   Make sure you have logged in at least once first.\n');
    process.exit(1);
  }
  console.log(`✅ Found user: ${user.name} (id: ${user.id})`);

  // 2. Clear existing data (avoid duplicates)
  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  await prisma.saving.deleteMany({ where: { userId: user.id } });
  await prisma.budget.deleteMany({ where: { userId: user.id } });
  console.log('🗑️  Cleared existing data');

  // 3. Seed Transactions — 60 entries spread over last 6 months
  const txData = [];

  // ~8 income entries per month (last 6 months)
  for (let m = 0; m < 6; m++) {
    // Always add salary
    const salaryDate = new Date();
    salaryDate.setMonth(salaryDate.getMonth() - m);
    salaryDate.setDate(rand(1, 5)); // Gajian awal bulan
    txData.push({
      userId: user.id,
      date: salaryDate,
      category: 'Pendapatan',
      method: 'Transfer Bank',
      description: 'Gaji Bulanan',
      amount: rand(7_000_000, 12_000_000),
      type: 'income'
    });

    // 2-3 random income
    const incomeCount = rand(2, 3);
    for (let i = 0; i < incomeCount; i++) {
      const item = pick(INCOME_ITEMS.slice(1)); // Skip gaji (sudah manual)
      txData.push({
        userId: user.id,
        date: randomDateInLastMonths(m + 1),
        category: item.category,
        method: item.method,
        description: item.description,
        amount: item.amount(),
        type: 'income'
      });
    }

    // ~8 expense entries per month
    const expenseCount = rand(7, 10);
    for (let i = 0; i < expenseCount; i++) {
      const item = pick(EXPENSE_ITEMS);
      const d = randomDateInLastMonths(m + 1);
      txData.push({
        userId: user.id,
        date: d,
        category: item.category,
        method: item.method,
        description: item.description,
        amount: item.amount(),
        type: 'expense'
      });
    }
  }

  await prisma.transaction.createMany({ data: txData });
  console.log(`💸 Seeded ${txData.length} transactions`);

  // 4. Seed Budgets — for current and last 2 months
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
  console.log(`📊 Seeded ${budgetData.length} budgets (${BUDGETS_SEED.length} categories × 3 months)`);

  // 5. Seed Savings (Wishlist)
  const savingsData = SAVINGS_SEED.map(s => ({ ...s, userId: user.id }));
  await prisma.saving.createMany({ data: savingsData });
  console.log(`🎯 Seeded ${savingsData.length} savings goals`);

  console.log('\n✨ Seed complete! Refresh your app to see the data.\n');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
