// scratch/test_multiturn.cjs
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
      { kategori: "Belanja", amount: 2000000, count: 4, percent: 24 }
    ],
    recentTransactions: [
      { tanggal: "2026-09-14", kategori: "Makanan & Minuman", keterangan: "Nasi Padang", harga: -25000, metode: "Cash" },
      { tanggal: "2026-09-13", kategori: "Belanja", keterangan: "Sepatu Tokopedia", harga: -450000, metode: "Transfer Bank" }
    ]
  },
  budgets: [
    { kategori: "Makanan & Minuman", limit: 3000000, used: 4500000, percent: 150, isOver: true },
    { kategori: "Belanja", limit: 1500000, used: 2000000, percent: 133, isOver: true }
  ],
  savings: [
    { name: "Laptop Gaming", target: 18000000, current: 3000000 }
  ]
};

const chatHistory = [
  { sender: "user", text: "kasi gw tips hemat unutk bulan depan berdasrkan hasil perhitungan gw bulan ini agar hasil bulan depan tidak minus" },
  { sender: "assistant", text: "Saat ini kamu lagi defisit Rp700.000 (Pemasukan Rp7,5jt vs Pengeluaran Rp8,2jt). Masalah utamanya ada di pos Makanan & Minuman (Rp4,5jt) dan Belanja (Rp2jt). Kira-kira dari pos Makanan atau Belanja nih yang paling siap kita pangkas dulu?" }
];

async function testMultiTurn() {
  console.log("=== Testing Multi-Turn Follow-Up Interaction ===");
  const userFollowUp = "pangkas belanja aja dulu bre, biar gak kalap di olshop";
  console.log("User Follow-up Input:", userFollowUp);
  
  const res = await parseNaturalLanguageInput(userFollowUp, mockFinancialContext, chatHistory);
  console.log("\n--- AI Response ---");
  console.log("Intent:", res?.intent);
  console.log("Message:\n" + res?.message);
}

testMultiTurn();
