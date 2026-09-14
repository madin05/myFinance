// scratch/test_multiturn.cjs
const fs = require('fs');
const dotenv = require('dotenv');
const env = dotenv.parse(fs.readFileSync('backend/.env'));
process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;

const { parseNaturalLanguageInput } = require('../backend/src/services/geminiService');

async function testMultiInput() {
  console.log("=== Testing Multiple Items Input ===");
  const userMulti = "bensin 30k csh dan makan siang 15k gopay";
  console.log("User Input:", userMulti);
  
  const res = await parseNaturalLanguageInput(userMulti, null, []);
  console.log("\n--- AI Response ---");
  console.log(JSON.stringify(res, null, 2));
}

testMultiInput();
