// src/services/geminiService.js
// Service untuk extract data struk via Gemini API (REST, no SDK)

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const PROMPT_TEMPLATE = (todayISO) => `Kamu adalah AI yang tugasnya mengekstrak data dari foto struk belanja Indonesia.

KONTEKS PENTING:
- Tanggal hari ini: ${todayISO}
- Format tanggal di Indonesia: DD-MM-YY atau DD-MM-YYYY (TANGGAL DULU, BUKAN TAHUN)
- Contoh: "18-05-26" di struk Indonesia = 18 Mei 2026 (DD-MM-YY), BUKAN 26 Mei 2018

Analisa gambar struk berikut dan kembalikan HANYA JSON valid (tanpa markdown / penjelasan apapun) dengan struktur:

{
  "tanggal": "YYYY-MM-DD",
  "merchant": "nama toko/merchant",
  "total": <number, tanpa pemisah ribuan, tanpa simbol mata uang>,
  "kategori_saran": "Makanan & Minuman" | "Transportasi" | "Belanja" | "Tagihan" | "Lainnya",
  "metode_pembayaran": "Cash" | "E-Wallet" | "Bank Transfer" | "Kartu Kredit" | "",
  "ringkasan_item": "ringkasan singkat item utama (max 60 karakter)",
  "is_receipt": true | false
}

Aturan:
- Jika gambar BUKAN struk belanja, set "is_receipt": false dan field lain string kosong / 0.
- "tanggal" wajib format YYYY-MM-DD. Asumsi format struk Indonesia adalah DD-MM-YY.
- Tanggal struk TIDAK BOLEH lebih dari ${todayISO}. Kalau hasil parsing > tanggal hari ini, kemungkinan format-nya salah, coba interpretasi ulang.
- Kalau struk gak ada tanggal jelas, pakai ${todayISO}.
- "total" ambil dari nominal "TOTAL" / "GRAND TOTAL" / "TOTAL BELANJA" akhir, dalam Rupiah. JANGAN ambil "Harga Jual" atau "Subtotal".
- "kategori_saran" pilih SALAH SATU dari opsi di atas, sesuai jenis merchant.
- "metode_pembayaran" deteksi dari teks di struk:
  * "TUNAI" / "CASH" / "PEMBAYARAN TUNAI" → "Cash"
  * "QRIS" / "GOPAY" / "OVO" / "DANA" / "SHOPEEPAY" / "LINKAJA" / e-wallet lain → "E-Wallet"
  * "DEBIT" / "BCA" / "MANDIRI" / "BNI" / "BRI" / nama bank lain → "Bank Transfer"
  * "KREDIT" / "VISA" / "MASTERCARD" / "JCB" → "Kartu Kredit"
  * Kalau tidak ada keterangan metode, kosongin: ""
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
          { text: PROMPT_TEMPLATE(new Date().toISOString().split('T')[0]) },
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
    let errMessage;
    let statusCode;

    if (response.status === 429) {
      statusCode = 429;
      errMessage = 'Quota Gemini API habis atau rate limited. Free tier: 15 req/menit, 1500 req/hari. Tunggu 1 menit atau cek dashboard di https://aistudio.google.com';
    } else if (response.status === 403) {
      statusCode = 403;
      errMessage = 'API key tidak valid atau Gemini API belum di-enable di project. Cek https://aistudio.google.com/apikey';
    } else if (response.status === 400) {
      statusCode = 400;
      errMessage = `Gemini menolak request. Mungkin gambar terlalu besar / format tidak didukung. Detail: ${errText.slice(0, 150)}`;
    } else if (response.status >= 500) {
      statusCode = 502;
      errMessage = `Gemini API server error (${response.status}). Coba lagi nanti.`;
    } else {
      statusCode = response.status;
      errMessage = `Gemini API error (${response.status}): ${errText.slice(0, 200)}`;
    }

    const err = new Error(errMessage);
    err.statusCode = statusCode;
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

  const ALLOWED_METODE = ['Cash', 'E-Wallet', 'Bank Transfer', 'Kartu Kredit'];
  const metode = ALLOWED_METODE.includes(parsed.metode_pembayaran)
    ? parsed.metode_pembayaran
    : '';

  return {
    is_receipt: !!parsed.is_receipt,
    tanggal: validateDate(parsed.tanggal),
    merchant: parsed.merchant || '',
    total: Number(parsed.total) || 0,
    kategori_saran: parsed.kategori_saran || 'Lainnya',
    metode_pembayaran: metode,
    ringkasan_item: parsed.ringkasan_item || ''
  };
}

/**
 * Validasi tanggal: kalau kosong / future / format salah, fallback ke hari ini.
 */
function validateDate(dateStr) {
  const todayISO = new Date().toISOString().split('T')[0];
  if (!dateStr || typeof dateStr !== 'string') return todayISO;

  // Cek format YYYY-MM-DD
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return todayISO;

  const parsedDate = new Date(dateStr);
  if (isNaN(parsedDate.getTime())) return todayISO;

  // Tanggal tidak boleh > hari ini
  if (parsedDate > new Date()) return todayISO;

  // Tanggal tidak boleh terlalu jauh ke masa lalu (>5 tahun = curiga AI salah parse)
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  if (parsedDate < fiveYearsAgo) return todayISO;

  return dateStr;
}

module.exports = { extractReceiptData };
