// scratch/test_offline_mode.cjs
// Test offline simulation: force GEMINI_API_KEY = "" to trigger local fallback parser
process.env.GEMINI_API_KEY = "";

const { parseNaturalLanguageInput } = require('../backend/src/services/geminiService');

const offlineCases = [
  "ns padang 18k td siang cash",
  "esteh masni 5rb pake spay barusan",
  "bnesin pertalite gocap kmrn",
  "dpt trf gajian 7.5jt bca",
  "beli sepatu di tokped 250k transfer bni",
  "bayar token listrik 100rb dana semalem",
  "nabung beli laptop gaming 18jt",
  "ringkas pengeluaran 1 bulan ini dong",
  "halo anya apa kabar?",
  "kasih tips hemat dong"
];

async function runOffline() {
  console.log("Testing 100% Offline Local NLP Engine Fallback...");
  let passed = 0;
  for (const text of offlineCases) {
    const res = await parseNaturalLanguageInput(text);
    if (res && res.intent) {
      console.log(`✅ [Offline OK] "${text}" -> Intent: ${res.intent}, Message: "${res.message}"`);
      if (res.data) console.log(`   Data:`, JSON.stringify(res.data));
      passed++;
    } else {
      console.log(`❌ [Offline FAIL] "${text}" returned null`);
    }
  }
  console.log(`Offline Results: ${passed}/${offlineCases.length} Passed (${Math.round((passed/offlineCases.length)*100)}%)`);
}

runOffline();
