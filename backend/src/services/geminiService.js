// src/services/geminiService.js
// Service untuk extract data struk via Gemini API (REST, no SDK)

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const PROMPT = `Kamu adalah AI yang tugasnya mengekstrak data dari foto struk belanja Indonesia.
Analisa gambar struk berikut dan kembalikan HANYA JSON valid (tanpa markdown / penjelasan apapun) dengan struktur:

{
  "tanggal": "YYYY-MM-DD",
  "merchant": "nama toko/merchant",
  "total": <number, tanpa pemisah ribuan, tanpa simbol mata uang>,
  "kategori_saran": "Makanan & Minuman" | "Transportasi" | "Belanja" | "Tagihan" | "Lainnya",
  "ringkasan_item": "ringkasan singkat item utama (max 60 karakter)",
  "is_receipt": true | false
}

Aturan:
- Jika gambar BUKAN struk belanja, set "is_receipt": false dan field lain string kosong / 0.
- "tanggal" wajib format YYYY-MM-DD. Kalau struk gak ada tanggal jelas, pakai tanggal hari ini.
- "total" ambil dari nominal "TOTAL" / "GRAND TOTAL" akhir, dalam Rupiah.
- "kategori_saran" pilih SALAH SATU dari opsi di atas, sesuai jenis merchant.
- "ringkasan_item" contoh: "Belanja groceries (5 item)" atau "Nasi goreng + es teh".
- Jangan tambah field lain. Jangan wrap di markdown code block.`;

/**
 * Extract data struk dari base64 image via Gemini.
 * @param {string} imageBase64 - base64 string (tanpa data:image prefix)
 * @param {string} mimeType - contoh "image/jpeg"
 * @returns {Promise<object>} parsed JSON
 */
async function extractReceiptData(imageBase64, mimeType = 'image/jpeg') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = new Error('GEMINI_API_KEY belum di-set di environment variable.');
    err.statusCode = 500;
    throw err;
  }

  const body = {
    contents: [
      {
        parts: [
          { text: PROMPT },
          { inline_data: { mime_type: mimeType, data: imageBase64 } }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json'
    }
  };

  // Timeout 20 detik biar gak hang lama-lama
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20_000);

  let response;
  try {
    response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      const e = new Error('Timeout: Gemini API tidak respons dalam 20 detik.');
      e.statusCode = 504;
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    const err = new Error(`Gemini API error (${response.status}): ${errText.slice(0, 200)}`);
    err.statusCode = response.status >= 500 ? 502 : 400;
    throw err;
  }

  const json = await response.json();
  const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    const err = new Error('Gemini tidak return text. Mungkin gambar diblok safety filter.');
    err.statusCode = 422;
    throw err;
  }

  // Parse JSON dari output Gemini
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (e) {
    // Fallback: coba ekstrak JSON dari teks (kalau Gemini bandel taroh markdown)
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        const err = new Error('Gemini return format tidak valid (bukan JSON).');
        err.statusCode = 422;
        throw err;
      }
    } else {
      const err = new Error('Gemini return format tidak valid (bukan JSON).');
      err.statusCode = 422;
      throw err;
    }
  }

  // Validasi minimal
  if (typeof parsed !== 'object' || parsed === null) {
    const err = new Error('Hasil Gemini bukan objek JSON.');
    err.statusCode = 422;
    throw err;
  }

  return {
    is_receipt: !!parsed.is_receipt,
    tanggal: parsed.tanggal || '',
    merchant: parsed.merchant || '',
    total: Number(parsed.total) || 0,
    kategori_saran: parsed.kategori_saran || 'Lainnya',
    ringkasan_item: parsed.ringkasan_item || ''
  };
}

module.exports = { extractReceiptData };
