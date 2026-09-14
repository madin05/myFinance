// scratch/test_financial_insights.cjs
const fs = require('fs');
const dotenv = require('dotenv');
const env = dotenv.parse(fs.readFileSync('backend/.env'));
process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;

const { parseNaturalLanguageInput } = require('../backend/src/services/geminiService');

const mockFinancialContext = {
  userName: "Arif",
  currentMonth: {
    income: 7500000,
    expense: 8200000,
    netBalance: -700000,
    txCount: 22,
    breakdown: [
      { kategori: "Makanan & Minuman", amount: 4500000, count: 15, percent: 55 },
      { kategori: "Belanja", amount: 2000000, count: 4, percent: 24 },
      { kategori: "Transportasi", amount: 900000, count: 8, percent: 11 },
      { kategori: "Tagihan", amount: 800000, count: 2, percent: 10 }
    ],
    recentTransactions: [
      { tanggal: "2026-09-14", kategori: "Makanan & Minuman", keterangan: "Nasi Padang", harga: -25000, metode: "Cash" },
      { tanggal: "2026-09-13", kategori: "Belanja", keterangan: "Sepatu Tokopedia", harga: -450000, metode: "Transfer Bank" },
      { tanggal: "2026-09-12", kategori: "Makanan & Minuman", keterangan: "Dinner Cafe", harga: -180000, metode: "QRIS" },
      { tanggal: "2026-09-01", kategori: "Gaji & Pendapatan", keterangan: "Gaji Bulanan", harga: 7500000, metode: "Transfer Bank" }
    ]
  },
  budgets: [
    { kategori: "Makanan & Minuman", limit: 3000000, used: 4500000, percent: 150, isOver: true },
    { kategori: "Belanja", limit: 1500000, used: 2000000, percent: 133, isOver: true }
  ],
  savings: [
    { name: "Laptop Gaming", target: 18000000, current: 3000000 }
  ],
  accounts: [
    { nama: "BCA", saldo: 2500000 },
    { nama: "Cash", saldo: 200000 }
  ]
};

async function testInsights() {
  console.log("=== Testing Data-Driven Personalized Financial Insights ===");
  const userPrompt = "kasi gw tips hemat unutk bulan depan berdasrkan hasil perhitungan gw bulan ini agar hasil bulan depan tidak minus";
  console.log("User Input:", userPrompt);
  
  const res = await parseNaturalLanguageInput(userPrompt, mockFinancialContext);
  console.log("\n--- AI Response ---");
  console.log("Intent:", res?.intent);
  console.log("Message:\n" + res?.message);
}

testInsights();
