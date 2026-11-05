const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('Fetching available models for key...');
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    console.log('Status:', res.status, res.statusText);
    const data = await res.json();
    if (data.models) {
      console.log('Available models:');
      data.models
        .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
        .forEach(m => console.log(' -', m.name, `(${m.displayName})`));
    } else {
      console.log('Data:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

listModels();
