// scratch/test_complete_nlp.cjs
const fs = require('fs');
const dotenv = require('dotenv');
const env = dotenv.parse(fs.readFileSync('backend/.env'));
process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;

const { parseNaturalLanguageInput } = require('../backend/src/services/geminiService');

const testCases = [
  {
    input: "ns padang 18k td siang cash",
    expectedIntent: "transaction",
    expectedType: "expense",
    expectedKategori: "Makanan & Minuman",
    minAmount: 18000
  },
  {
    input: "esteh masni 5rb pake spay barusan",
    expectedIntent: "transaction",
    expectedType: "expense",
    expectedKategori: "Makanan & Minuman",
    minAmount: 5000
  },
  {
    input: "bnesin pertalite gocap kmrn",
    expectedIntent: "transaction",
    expectedType: "expense",
    expectedKategori: "Transportasi",
    minAmount: 50000
  },
  {
    input: "dpt trf gajian 7.5jt bca",
    expectedIntent: "transaction",
    expectedType: "income",
    expectedKategori: "Gaji & Pendapatan",
    minAmount: 7500000
  },
  {
    input: "beli sepatu di tokped 250k transfer bni",
    expectedIntent: "transaction",
    expectedType: "expense",
    expectedKategori: "Belanja",
    minAmount: 250000
  },
  {
    input: "bayar token listrik 100rb dana semalem",
    expectedIntent: "transaction",
    expectedType: "expense",
    expectedKategori: "Tagihan",
    minAmount: 100000
  },
  {
    input: "nabung beli laptop gaming 18jt",
    expectedIntent: "wishlist",
    minAmount: 18000000
  },
  {
    input: "ringkas pengeluaran 1 bulan ini dong",
    expectedIntent: "summary_request"
  },
  {
    input: "halo anya apa kabar?",
    expectedIntent: "unknown"
  },
  {
    input: "kasih tips hemat dong",
    expectedIntent: "unknown"
  }
];

async function runTests() {
  console.log("🚀 Starting Comprehensive NLP Test Suite (" + testCases.length + " cases)...\n");
  let passed = 0;
  let failed = 0;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    console.log(`[Test ${i+1}/${testCases.length}] Input: "${tc.input}"`);
    const start = Date.now();
    try {
      const res = await parseNaturalLanguageInput(tc.input);
      const duration = Date.now() - start;

      if (!res) {
        console.log(`  ❌ FAILED: returned null (${duration}ms)`);
        failed++;
        continue;
      }

      let testPass = true;
      const reasons = [];

      if (res.intent !== tc.expectedIntent) {
        testPass = false;
        reasons.push(`Intent mismatch: got "${res.intent}", expected "${tc.expectedIntent}"`);
      }

      if (tc.expectedIntent === "transaction" && res.data) {
        if (tc.expectedType && res.data.type !== tc.expectedType) {
          testPass = false;
          reasons.push(`Type mismatch: got "${res.data.type}", expected "${tc.expectedType}"`);
        }
        if (tc.expectedKategori && res.data.kategori !== tc.expectedKategori) {
          testPass = false;
          reasons.push(`Kategori mismatch: got "${res.data.kategori}", expected "${tc.expectedKategori}"`);
        }
        if (tc.minAmount && res.data.harga !== tc.minAmount) {
          testPass = false;
          reasons.push(`Amount mismatch: got ${res.data.harga}, expected ${tc.minAmount}`);
        }
      }

      if (tc.expectedIntent === "wishlist" && res.data) {
        if (tc.minAmount && res.data.target !== tc.minAmount) {
          testPass = false;
          reasons.push(`Wishlist target mismatch: got ${res.data.target}, expected ${tc.minAmount}`);
        }
      }

      if (testPass) {
        console.log(`  ✅ PASSED (${duration}ms): Intent=${res.intent}, Message="${res.message || ''}"`);
        if (res.data) console.log(`     Data:`, JSON.stringify(res.data));
        passed++;
      } else {
        console.log(`  ❌ FAILED (${duration}ms):`, reasons.join(', '));
        console.log(`     Full output:`, JSON.stringify(res));
        failed++;
      }
    } catch (e) {
      console.log(`  ❌ EXCEPTION:`, e.message);
      failed++;
    }
    console.log("");
    await new Promise(r => setTimeout(r, 600));
  }

  console.log("==========================================");
  console.log(`RESULTS: ${passed}/${testCases.length} Passed (${Math.round((passed/testCases.length)*100)}%), ${failed} Failed.`);
  console.log("==========================================");

  if (passed === testCases.length) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
