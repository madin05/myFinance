// src/controllers/receiptController.js
const { extractReceiptData } = require('../services/geminiService');

// Limit ukuran image base64 (sekitar 4MB raw → ~5.5MB base64)
const MAX_BASE64_SIZE = 5.5 * 1024 * 1024;

const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

exports.scanReceipt = async (req, res) => {
  try {
    const { image, mimeType } = req.body || {};

    if (!image || typeof image !== 'string') {
      return res.status(400).json({
        error: 'Body harus berisi field "image" (base64 string).'
      });
    }

    if (image.length > MAX_BASE64_SIZE) {
      return res.status(413).json({
        error: 'Ukuran gambar terlalu besar. Maksimal ~4MB. Coba compress dulu.'
      });
    }

    const cleanMime = (mimeType || 'image/jpeg').toLowerCase();
    if (!ALLOWED_MIME.includes(cleanMime)) {
      return res.status(400).json({
        error: `Format gambar tidak didukung. Pakai ${ALLOWED_MIME.join(', ')}.`
      });
    }

    // Strip "data:image/...;base64," kalau ada
    const base64Clean = image.replace(/^data:image\/\w+;base64,/, '');

    const result = await extractReceiptData(base64Clean, cleanMime);

    if (!result.is_receipt) {
      return res.status(422).json({
        error: 'Gambar yang diupload bukan struk belanja. Coba foto struk yang jelas.',
        result
      });
    }

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error('[scanReceipt] Error:', err.message);
    const status = err.statusCode || 500;
    return res.status(status).json({
      error: err.message || 'Gagal memproses struk.'
    });
  }
};
