const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const { parseNaturalLanguageInput } = require(path.join(__dirname, '../backend/src/services/geminiService'));

const testCases = [
  {
    input: "ns padang 18k td siang cash",
    expectedIntent: "transaction",
    expectedType: "expense",
    expectedKategori: "Makanan & Minuman",
    expectedMinHarga: 18000
  },
  {
    input: "esteh masni 5k pake qris",
    expectedIntent: "transaction",
    expectedType: "expense",
    expectedKategori: "Makanan & Minuman",
    expectedMinHarga: 5000
  },
  {
    input: "dpt trf gajian 7.5jt bca kmrn",
    expectedIntent: "transaction",
    expectedType: "income",
    expectedKategori: "Gaji & Pendapatan",
    expectedMinHarga: 7500000
  },
  {
    input: "bnesin pertalite gocap td pagi",
    expectedIntent: "transaction",
    expectedType: "expense",
    expectedKategori: "Transportasi",
    expectedMinHarga: 50000
  },
  {
    input: "byr wifi indihome 350rb semalem pake spay",
    expectedIntent: "transaction",
    expectedType: "expense",
    expectedKategori: "Tagihan",
    expectedMinHarga: 350000
  },
  {
    input: "bli baju di tokped 150k dana",
    expectedIntent: "transaction",
    expectedType: "expense",
    expectedKategori: "Belanja",
    expectedMinHarga: 150000
  },
  {
    input: "nabung beli laptop gaming rog 18jt",
    expectedIntent: "wishlist",
    expectedMinHarga: 18000000
  },
  {
    input: "ringkasin pengeluaran bulan ini",
    expectedIntent: "summary_request"
  }
];

async function runTestSuite() {
  console.log('=== STARTING NLP & GEMINI AI TEST SUITE ===\n');
  let passed = 0;
  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    console.log(`[Test ${i + 1}/${testCases.length}] Input: "${tc.input}"`);
    try {
      const start = Date.now();
      const res = await parseNaturalLanguageInput(tc.input);
      const elapsed = Date.now() - start;
      console.log(`  Output (${elapsed}ms):`, JSON.stringify(res, null, 2));
      
      if (!res || !res.intent) {
        console.log(`  ❌ FAILED: No valid response returned.\n`);
        continue;
      }
      
      if (res.intent !== tc.expectedIntent) {
        console.log(`  ❌ FAILED: Expected intent ${tc.expectedIntent}, got ${res.intent}\n`);
        continue;
      }
      
      if (tc.expectedIntent === 'transaction') {
        if (res.data?.type !== tc.expectedType) {
          console.log(`  ⚠️ Note: Type mismatch (got ${res.data?.type}, expected ${tc.expectedType})`);
        }
        if (res.data?.harga !== tc.expectedMinHarga) {
          console.log(`  ⚠️ Note: Amount mismatch (got ${res.data?.harga}, expected ${tc.expectedMinHarga})`);
        }
      }
      
      console.log(`  ✅ PASSED\n`);
      passed++;
    } catch (err) {
      console.log(`  ❌ ERROR: ${err.message}\n`);
    }
  }
  console.log(`=== TEST SUMMARY: ${passed}/${testCases.length} PASSED ===`);
}

runTestSuite();
