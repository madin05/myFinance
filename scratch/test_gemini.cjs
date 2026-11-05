const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const { parseNaturalLanguageInput } = require(path.join(__dirname, '../backend/src/services/geminiService'));

async function test() {
  console.log('Testing parseNaturalLanguageInput...');
  try {
    const res = await parseNaturalLanguageInput('makan siang 25rb cash');
    console.log('Result:', JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('Catch error:', err);
  }
}

test();
