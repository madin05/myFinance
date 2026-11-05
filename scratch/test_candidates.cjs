const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const candidates = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-flash-latest',
  'gemini-3.7-flash',
  'gemini-2.5-pro'
];

async function testCandidate(model) {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Halo Anya, jawab 1 kalimat JSON: {"test": "ok"}' }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });
    const time = Date.now() - start;
    if (res.ok) {
      const data = await res.json();
      console.log(`[PASS] ${model} (${time}ms):`, data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim());
      return true;
    } else {
      const err = await res.text();
      console.log(`[FAIL] ${model} (${res.status}):`, err.slice(0, 150));
      return false;
    }
  } catch (e) {
    console.log(`[ERROR] ${model}:`, e.message);
    return false;
  }
}

async function run() {
  for (const m of candidates) {
    await testCandidate(m);
  }
}

run();
