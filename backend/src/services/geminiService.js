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

module.exports = { 
  extractReceiptData,
  parseNaturalLanguageInput,
  generateFinancialReport
};

/**
 * Parse teks natural language dari user untuk mendeteksi Intent (Transaksi vs Wishlist)
 * @param {string} userText - Teks dari user (misal: "Nabung laptop gaming 15jt" atau "Bensin 50rb cash")
 * @returns {Promise<object>} parsed JSON intent
 */
async function parseNaturalLanguageInput(userText) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    const err = new Error('GEMINI_API_KEY belum di-set di environment variable.');
    err.statusCode = 500;
    throw err;
  }

  const now = new Date();
  const todayISO = now.toISOString().split('T')[0];
  const dayName = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][now.getDay()];

  const prompt = `Kamu adalah AI Asisten Keuangan MyFinance Indonesia yang SANGAT jago memahami bahasa Indonesia santai, gaul, typo, dan slang.

KONTEKS:
- Hari ini: ${dayName}, ${todayISO}
- Tujuanmu: Menerjemahkan teks bebas user menjadi data terstruktur yang LENGKAP.
- User bisa mengetik asal-asalan, singkatan, typo, bahasa gaul → kamu HARUS tetap paham.

CONTOH INPUT SANTAI & CARA KAMU MEMAHAMI:
- "kmaren beli bakso 15rb" → Transaksi, kemarin, Makanan & Minuman, Rp15.000, Cash
- "tdi pgi bensin pertalite 52k" → Transaksi, hari ini, Transportasi, Rp52.000, Cash
- "senin lalu gajian 5jt transfer bca" → Transaksi income, Senin lalu, Gaji & Pendapatan, Rp5.000.000, Transfer Bank
- "3 hari lalu bayar wifi 350rb" → Transaksi, 3 hari lalu, Tagihan & Tagihan, Rp350.000, Cash
- "tgl 5 beli baju di tokped 200rb" → Transaksi, tanggal 5 bulan ini, Belanja, Rp200.000, E-Wallet
- "mau nabung laptop gaming 15jt" → Wishlist
- "ringkasin keuangan 3 bulan" → Summary request

ATURAN TANGGAL (SANGAT PENTING):
- "hari ini" / "tadi" / "barusan" / "tdi" → ${todayISO}
- "kemarin" / "kmaren" / "kmrn" / "yesterday" → hitung tanggal kemarin
- "2 hari lalu" / "3 hari yang lalu" → hitung mundur dari hari ini
- "senin lalu" / "jumat kemarin" → hitung tanggal hari itu di minggu lalu
- "minggu lalu" (tanpa sebut hari) → 7 hari lalu
- "tgl 5" / "tanggal 10" → tanggal tersebut di bulan ini (jika sudah lewat = bulan ini, jika belum = bulan lalu)
- "awal bulan" → tanggal 1 bulan ini
- Jika TIDAK ada petunjuk waktu sama sekali → ${todayISO}
- Format output tanggal WAJIB: YYYY-MM-DD

ATURAN KATEGORI (pilih TEPAT SATU):
- "Makanan & Minuman" → makan, minum, kopi, bakso, nasi, resto, warung, starbucks, kfc, mcd, goFood
- "Transportasi" → bensin, solar, pertamax, pertalite, parkir, tol, gojek, grab, angkot, bus, kereta, pesawat
- "Belanja" → baju, sepatu, tas, tokopedia, shopee, lazada, mall, olshop, skincare
- "Tagihan & Tagihan" → listrik, air, wifi, pulsa, kuota, token PLN, indihome, iuran, sewa, kos
- "Gaji & Pendapatan" → gaji, gajian, payroll, thr, bonus, honor, freelance, proyek, dividen, jual
- "Investasi & Tabungan" → investasi, saham, crypto, reksadana, nabung (tanpa target barang), deposito
- "Kesehatan" → obat, dokter, apotek, rumah sakit, rs, klinik, gym, vitamin
- "Pendidikan" → kursus, buku, udemy, kuliah, sekolah, les, pelatihan, seminar
- "Lain-lain" → yang tidak masuk kategori di atas

ATURAN METODE PEMBAYARAN:
- "Cash" → tunai, cash, bayar langsung, uang, duit (atau jika tidak disebutkan)
- "E-Wallet" → gopay, ovo, dana, shopeepay, spay, qris, linkaja, ewallet
- "Transfer Bank" → transfer, bank, bca, mandiri, bni, bri, bsi, cimb, blu, sea bank, jago
- "Kartu Kredit/Debit" → kartu kredit, kartu debit, visa, mastercard, cc

ATURAN TIPE:
- "expense" (pengeluaran) → default, kecuali jelas-jelas income
- "income" (pemasukan) → gaji, gajian, bonus, thr, terima, dapat uang, jual, profit, omset, honor, freelance

Kembalikan HANYA JSON valid (tanpa markdown wrapper) dengan struktur:

Untuk intent "transaction":
{
  "intent": "transaction",
  "data": {
    "type": "expense" | "income",
    "tanggal": "YYYY-MM-DD",
    "kategori": "<salah satu kategori di atas>",
    "metode": "Cash" | "E-Wallet" | "Transfer Bank" | "Kartu Kredit/Debit",
    "keterangan": "<deskripsi bersih dan rapi, capitalize, max 50 karakter>",
    "harga": <number nominal rupiah tanpa pemisah>
  }
}

Untuk intent "wishlist":
{
  "intent": "wishlist",
  "data": {
    "name": "<nama barang/target, rapi & capitalize>",
    "target": <number nominal rupiah>,
    "current": 0,
    "icon": "ph-star" | "ph-laptop" | "ph-phone" | "ph-car" | "ph-house" | "ph-airplane" | "ph-shopping-bag",
    "color": "purple" | "blue" | "green" | "orange"
  }
}

Untuk intent "summary_request":
{
  "intent": "summary_request",
  "period": "1_week" | "1_month" | "3_months" | "1_year"
}

Untuk intent "unknown":
{
  "intent": "unknown",
  "message": "<pesan ramah dalam bahasa Indonesia kasual yang membantu user tahu cara pakai, contoh: 'Coba ketik kayak gini: Makan siang 25rb cash 😊'>"
}

Input User: "${userText.replace(/"/g, '\\"')}"`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json'
    }
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Gemini API Error status ${response.status}`);
    }

    const json = await response.json();
    const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Kosong dari Gemini.');

    return JSON.parse(rawText);
  } catch (err) {
    console.warn('[GeminiService] Fallback ke parsing manual untuk input:', userText, err.message);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Generate analisis & saran finansial berbasis AI sesuai periode waktu tertentu
 * @param {object} metrics - Data statistik keuangan (income, expense, netBalance, topCategory, periodLabel)
 * @returns {Promise<object>}
 */
async function generateFinancialReport(metrics) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const prompt = `Kamu adalah Penasihat Keuangan Profesional untuk aplikasi MyFinance.
Analisis data agregat keuangan pengguna untuk periode: **${metrics.periodLabel}**.

Data Keuangan User:
- Periode: ${metrics.periodLabel}
- Total Pemasukan: Rp ${Number(metrics.income).toLocaleString('id-ID')}
- Total Pengeluaran: Rp ${Number(metrics.expense).toLocaleString('id-ID')}
- Net Surplus/Defisit: Rp ${Number(metrics.netBalance).toLocaleString('id-ID')}
- Kategori Pengeluaran Terbesar: ${metrics.topCategory || 'Belum Ada'} (${Number(metrics.topAmount || 0).toLocaleString('id-ID')})
- Jumlah Transaksi: ${metrics.txCount || 0} transaksi

Tugasmu:
Kembalikan HANYA JSON valid (tanpa markdown wrapper) dengan struktur:
{
  "status": "surplus" | "defisit" | "seimbang",
  "healthRating": <number 1 - 10>,
  "headline": "Ringkasan tajam & memotivasi dalam 1 kalimat (max 15 kata)",
  "insights": [
    "Poin analisis 1 terkait pengeluaran terbesar & dampaknya",
    "Poin analisis 2 terkait perbandingan pemasukan vs pengeluaran",
    "Saran konkret & bisa langsung dieksekusi user (contoh: alokasi ke Wishlist / rem pengeluaran kategori X)"
  ]
}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      responseMimeType: 'application/json'
    }
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    if (!response.ok) return null;
    const json = await response.json();
    const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;

    return JSON.parse(rawText);
  } catch (err) {
    console.error('[GeminiService] Gagal generate report:', err.message);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

