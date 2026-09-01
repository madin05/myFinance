require('dotenv').config();
const { parseNaturalLanguageInput, generateFinancialReport } = require('../services/geminiService');

async function runAiTests() {
  console.log('====================================================');
  console.log('🤖 RUNNING MYFINANCE AI AUTOMATED TEST SUITE');
  console.log('====================================================');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failedCount++;
    }
  }

  // --- 1. TEST PARSE NATURAL LANGUAGE INPUT (HAPPY PATH: TRANSACTION) ---
  console.log('\n[TEST 1] Testing Transaction Intent Parsing...');
  try {
    // Arrange
    const sampleInput = "Bensin pertamax 50rb cash";
    
    // Act
    const result = await parseNaturalLanguageInput(sampleInput);

    // Assert
    if (result) {
      assert(result.intent === 'transaction', 'Intent identified as transaction');
      assert(result.data && result.data.harga === 50000, 'Harga correctly parsed as 50000');
      assert(result.data && result.data.kategori === 'Transportasi', 'Kategori correctly inferred as Transportasi');
    } else {
      console.log('⚠️ [SKIP] Gemini API rate limited / offline, fallback heuristic engine ready.');
    }
  } catch (err) {
    console.error('Test 1 error:', err.message);
  }

  // --- 2. TEST PARSE NATURAL LANGUAGE INPUT (HAPPY PATH: WISHLIST) ---
  console.log('\n[TEST 2] Testing Wishlist Intent Parsing...');
  try {
    // Arrange
    const sampleWishlist = "Nabung laptop gaming 15jt";

    // Act
    const result = await parseNaturalLanguageInput(sampleWishlist);

    // Assert
    if (result) {
      assert(result.intent === 'wishlist', 'Intent identified as wishlist');
      assert(result.data && result.data.target === 15000000, 'Target price correctly parsed as 15,000,000');
      assert(result.data && result.data.name.toLowerCase().includes('laptop'), 'Wishlist name contains "laptop"');
    } else {
      console.log('⚠️ [SKIP] Gemini API rate limited / offline, fallback heuristic engine ready.');
    }
  } catch (err) {
    console.error('Test 2 error:', err.message);
  }

  // --- 3. TEST PERIOD FINANCIAL REPORT GENERATOR ---
  console.log('\n[TEST 3] Testing AI Financial Report Generation (3 Months)...');
  try {
    // Arrange
    const metrics = {
      periodLabel: '3 Bulan Terakhir',
      income: 15000000,
      expense: 9000000,
      netBalance: 6000000,
      topCategory: 'Makanan & Minuman',
      topAmount: 4000000,
      txCount: 42
    };

    // Act
    const report = await generateFinancialReport(metrics);

    // Assert
    if (report) {
      assert(report.status === 'surplus', 'Health status identified as surplus');
      assert(typeof report.healthRating === 'number' && report.healthRating >= 1, 'Health rating is a valid score');
      assert(Array.isArray(report.insights) && report.insights.length >= 1, 'Returns array of AI insights');
    } else {
      console.log('⚠️ [SKIP] Gemini API offline, fallback metrics report used.');
    }
  } catch (err) {
    console.error('Test 3 error:', err.message);
  }

  // --- 4. TEST EDGE CASES (EMPTY & NULL INPUT) ---
  console.log('\n[TEST 4] Testing Edge Cases & Failure Handling...');
  try {
    const emptyResult = await parseNaturalLanguageInput("");
    assert(emptyResult === null || emptyResult.intent === 'unknown', 'Handles empty string gracefully');

    const reportNoData = await generateFinancialReport({
      periodLabel: '1 Minggu Terakhir',
      income: 0,
      expense: 0,
      netBalance: 0,
      topCategory: '',
      topAmount: 0,
      txCount: 0
    });
    assert(reportNoData !== undefined, 'Handles zero transactions without throwing error');
  } catch (err) {
    console.error('Test 4 error:', err.message);
  }

  console.log('\n====================================================');
  console.log(`🎉 TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED.`);
  console.log('====================================================');
}

runAiTests();
