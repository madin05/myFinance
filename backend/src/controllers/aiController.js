// backend/src/controllers/aiController.js
const { parseNaturalLanguageInput, generateFinancialReport } = require('../services/geminiService');

exports.parseInput = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Field "text" wajib diisi.' });
    }

    const result = await parseNaturalLanguageInput(text);
    if (!result) {
      return res.json({ intent: 'fallback', message: 'Model Gemini offline atau gagal parse, menggunakan local parser.' });
    }

    return res.json(result);
  } catch (err) {
    console.error('Error parseInput AI Controller:', err);
    return res.status(err.statusCode || 500).json({ error: err.message || 'Gagal memproses input AI.' });
  }
};

exports.analyzePeriod = async (req, res) => {
  try {
    const { metrics } = req.body;
    if (!metrics || typeof metrics !== 'object') {
      return res.status(400).json({ error: 'Data "metrics" wajib diisi.' });
    }

    const report = await generateFinancialReport(metrics);
    return res.json({ report });
  } catch (err) {
    console.error('Error analyzePeriod AI Controller:', err);
    return res.status(500).json({ error: err.message || 'Gagal membuat laporan analisis AI.' });
  }
};
