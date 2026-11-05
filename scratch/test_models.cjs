// scratch/test_models.cjs
const fs = require('fs');
const dotenv = require('dotenv');
const env = dotenv.parse(fs.readFileSync('backend/.env'));
const apiKey = env.GEMINI_API_KEY;

const modelsToTest = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.6-flash'
];

async function testModel(modelName) {
  const start = Date.now();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  const body = {
    contents: [{
      parts: [{
        text: 'Balas dalam JSON: {"status":"ok","model":"' + modelName + '"}'
      }]
    }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json'
    }
  };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const duration = Date.now() - start;
    if (res.ok) {
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      console.log(`✅ [${modelName}] Success in ${duration}ms. Output: ${text}`);
      return { model: modelName, success: true, duration };
    } else {
      const err = await res.text();
      console.log(`❌ [${modelName}] HTTP ${res.status}: ${err.slice(0, 100)}`);
      return { model: modelName, success: false };
    }
  } catch (err) {
    console.log(`❌ [${modelName}] Exception: ${err.message}`);
    return { model: modelName, success: false };
  }
}

async function run() {
  for (const m of modelsToTest) {
    await testModel(m);
  }
}

run();
