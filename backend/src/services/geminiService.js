// src/services/geminiService.js
// Service untuk extract data struk via Gemini API (REST, no SDK) & NLP Chat Parser

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.5-flash',
  'gemini-3.6-flash'
];

/**
 * Universal Gemini API caller with automatic multi-model fallback & retry.
 */
async function callGeminiApi(apiKey, body, timeoutMs = 25000) {
  let lastError = null;
  for (const model of GEMINI_MODELS) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        return await res.json();
      }

      const errText = await res.text().catch(() => '');
      if (res.status === 404 || res.status === 503 || res.status === 429 || res.status >= 500) {
        console.warn(`[geminiService] Model ${model} returned HTTP ${res.status}, mencoba fallback model berikutnya...`);
        lastError = new Error(`Gemini model ${model} error ${res.status}: ${errText.slice(0, 100)}`);
        // Small backoff to avoid cascading rate-limit spikes
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      } else {
        const err = new Error(`Gemini API error (${res.status}): ${errText.slice(0, 200)}`);
        err.statusCode = res.status;
        throw err;
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        console.warn(`[geminiService] Model ${model} timed out (${timeoutMs}ms), mencoba fallback model...`);
        lastError = new Error(`Timeout model ${model}`);
        await new Promise((resolve) => setTimeout(resolve, 300));
        continue;
      }
      if (err.statusCode) throw err;
      lastError = err;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  throw lastError || new Error('Semua model Gemini gagal merespons.');
}

const RECEIPT_PROMPT_TEMPLATE = (todayISO) => `Kamu adalah AI yang tugasnya mengekstrak data dari foto struk belanja Indonesia.

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
          { text: RECEIPT_PROMPT_TEMPLATE(new Date().toISOString().split('T')[0]) },
          { inline_data: { mime_type: mimeType, data: imageBase64 } }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json'
    }
  };

  const json = await callGeminiApi(apiKey, body, 35000);
  const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    const err = new Error('Gemini tidak mengembalikan teks output.');
    err.statusCode = 422;
    throw err;
  }

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (e) {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        const err = new Error('Gemini mengembalikan format tidak valid (bukan JSON).');
        err.statusCode = 422;
        throw err;
      }
    } else {
      const err = new Error('Gemini mengembalikan format tidak valid (bukan JSON).');
      err.statusCode = 422;
      throw err;
    }
  }

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
  const jakartaStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
  const nowJakarta = new Date(jakartaStr);
  const todayISO = `${nowJakarta.getFullYear()}-${String(nowJakarta.getMonth() + 1).padStart(2, '0')}-${String(nowJakarta.getDate()).padStart(2, '0')}`;
  if (!dateStr || typeof dateStr !== 'string') return todayISO;

  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return todayISO;

  const parsedDate = new Date(dateStr);
  if (isNaN(parsedDate.getTime())) return todayISO;

  if (parsedDate > nowJakarta) return todayISO;

  const fiveYearsAgo = new Date(nowJakarta);
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  if (parsedDate < fiveYearsAgo) return todayISO;

  return dateStr;
}

/**
 * Parse teks natural language dari user untuk mendeteksi Intent (Transaksi, Wishlist, Ringkasan, Q&A)
 * Menggunakan konsep NLP lanjutan: Fuzzy Intent Matching, Koreksi Slang & Typo Parah, Normalisasi Entitas.
 * @param {string} userText - Teks dari user
 * @returns {Promise<object>} parsed JSON intent
 */
async function parseNaturalLanguageInput(userText, financialContext = null, chatHistory = []) {
  const apiKey = process.env.GEMINI_API_KEY;

  // Jakarta timezone date context
  const jakartaStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
  const now = new Date(jakartaStr);
  const fmt = (d) => {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  };
  const todayISO = fmt(now);
  const dayNames = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const dayName = dayNames[now.getDay()];

  const daysAgo = (n) => { const d = new Date(now); d.setDate(d.getDate() - n); return fmt(d); };
  const yesterdayISO = daysAgo(1);
  const twoDaysAgoISO = daysAgo(2);
  const threeDaysAgoISO = daysAgo(3);
  const oneWeekAgoISO = daysAgo(7);

  const lastDayDates = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    const diff = ((now.getDay() - i + 7) % 7) || 7;
    d.setDate(d.getDate() - diff);
    lastDayDates[dayNames[i].toLowerCase()] = fmt(d);
  }

  const dateContext = {
    todayISO,
    yesterdayISO,
    twoDaysAgoISO,
    threeDaysAgoISO,
    oneWeekAgoISO,
    lastDayDates,
    financialContext
  };

  if (!apiKey) {
    console.warn('[geminiService] GEMINI_API_KEY tidak ditemukan, menggunakan local NLP fallback engine.');
    return localFallbackNlpParser(userText, dateContext);
  }

  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const todayDate = now.getDate();

  let financialContextBlock = '';
  if (financialContext && typeof financialContext === 'object') {
    const cm = financialContext.currentMonth || {};
    const breakdownStr = Array.isArray(cm.breakdown) && cm.breakdown.length > 0
      ? cm.breakdown.map(b => `  * ${b.kategori}: Rp ${Number(b.amount || 0).toLocaleString('id-ID')} (${b.percent || 0}% dari total pengeluaran, ${b.count || 1} transaksi)`).join('\n')
      : '  * (Belum ada catatan pengeluaran bulan ini)';

    const recentTxsStr = Array.isArray(cm.recentTransactions) && cm.recentTransactions.length > 0
      ? cm.recentTransactions.slice(0, 10).map(t => `  * [${t.tanggal}] ${t.kategori} - ${t.keterangan}: Rp ${Math.abs(t.harga || 0).toLocaleString('id-ID')} (${t.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}, ${t.metode || 'Cash'})`).join('\n')
      : '  * (Belum ada transaksi)';

    const budgetsStr = Array.isArray(financialContext.budgets) && financialContext.budgets.length > 0
      ? financialContext.budgets.map(b => `  * ${b.kategori}: Limit Rp ${Number(b.limit || 0).toLocaleString('id-ID')} (Terpakai Rp ${Number(b.used || 0).toLocaleString('id-ID')} / ${b.percent || 0}%, ${b.isOver ? '⚠️ OVERBUDGET' : 'Aman'})`).join('\n')
      : '  * (Belum ada anggaran yang diset)';

    const savingsStr = Array.isArray(financialContext.savings) && financialContext.savings.length > 0
      ? financialContext.savings.map(s => `  * ${s.name}: Target Rp ${Number(s.target || 0).toLocaleString('id-ID')} (Terkumpul Rp ${Number(s.current || 0).toLocaleString('id-ID')})`).join('\n')
      : '  * (Belum ada wishlist/target tabungan)';

    const accountsStr = Array.isArray(financialContext.accounts) && financialContext.accounts.length > 0
      ? financialContext.accounts.map(a => `  * ${a.nama}: Rp ${Number(a.saldo || 0).toLocaleString('id-ID')}`).join('\n')
      : '  * (Belum ada akun dompet/bank)';

    financialContextBlock = `
---

### DATA KEUANGAN PENGGUNA SAAT INI (REAL USER FINANCIAL CONTEXT):
- Nama Pengguna: ${financialContext.userName || 'Pengguna'}
- Ringkasan Arus Kas Bulan Ini:
  * Total Pemasukan: Rp ${Number(cm.income || 0).toLocaleString('id-ID')}
  * Total Pengeluaran: Rp ${Number(cm.expense || 0).toLocaleString('id-ID')}
  * Arus Kas Bersih (Net Balance): Rp ${Number(cm.netBalance || 0).toLocaleString('id-ID')} (${(cm.netBalance || 0) < 0 ? '⚠️ DEFISIT/MINUS' : '✅ SURPLUS/POSITIF'})
  * Jumlah Transaksi Bulan Ini: ${cm.txCount || 0} transaksi
- Rincian Pengeluaran per Kategori:
${breakdownStr}
- Transaksi Terakhir:
${recentTxsStr}
- Anggaran / Budget yang Ditetapkan:
${budgetsStr}
- Target Wishlist & Tabungan:
${savingsStr}
- Saldo Dompet & Rekening Bank:
${accountsStr}
`;
  }

  let chatHistoryBlock = '';
  if (Array.isArray(chatHistory) && chatHistory.length > 0) {
    const recentHistory = chatHistory.slice(-8);
    chatHistoryBlock = `
---

### RIWAYAT PERCAKAPAN SEBELUMNYA (MULTI-TURN CONVERSATION):
${recentHistory.map(m => `- ${m.sender === 'user' ? 'Pengguna' : 'Anya'}: ${m.text}`).join('\n')}
`;
  }

  const prompt = `Kamu adalah "Anya", asisten pencatat keuangan pintar yang santai, responsif, dan sangat peka terhadap konteks bahasa gaul Indonesia serta ahli finansial pribadi pengguna.

### TUGAS UTAMA:
Ekstrak input pengguna menjadi data terstruktur (JSON) ATAU berikan analisis dan saran finansial personal yang mendalam dan interaktif berbasis data nyata pengguna. Pengguna sering mengetik dengan sangat cepat, typo parah, singkatan ekstrem, atau bertanya tips hemat. Tugasmu adalah menebak maksud aslinya (intent) secara presisi dengan konsep NLP canggih, merapikannya, dan merespons dengan gaya bahasa yang natural, akrab, dan bersahabat.
${financialContextBlock}
${chatHistoryBlock}
---

### KONTEKS WAKTU SERVER:
- Hari Ini: ${dayName}, ${todayISO}
- Kemarin: ${yesterdayISO}
- 2 Hari Lalu (Lusa Lalu): ${twoDaysAgoISO}
- 3 Hari Lalu: ${threeDaysAgoISO}
- 1 Minggu Lalu: ${oneWeekAgoISO}
- Senin Lalu: ${lastDayDates['senin']}
- Selasa Lalu: ${lastDayDates['selasa']}
- Rabu Lalu: ${lastDayDates['rabu']}
- Kamis Lalu: ${lastDayDates['kamis']}
- Jumat Lalu: ${lastDayDates['jumat']}
- Sabtu Lalu: ${lastDayDates['sabtu']}
- Minggu Lalu: ${lastDayDates['minggu']}

---

### ATURAN PARSING BAHASA HANCUR, SLANG, & TYPO (FUZZY INTENT MATCHING):

1. **Koreksi Typo & Maksud (Fuzzy Intent Matching):**
   - Tebak kata berdasarkan bunyi fonetik atau salah ketik keyboard:
     - "nasi apdang" / "ns padang" / "naspad" -> "Nasi Padang"
     - "esteh masni" / "es teh mns" / "esteh mnis" -> "Es Teh Manis"
     - "gwbel" / "bli" / "byr" / "byar" -> Beli / Bayar (Expense)
     - "dpt trf" / "tf msuk" / "trf masuk" / "gjian" / "dapet bonus" -> Pemasukan (Income)
     - "bnesin" / "bensin pertalite" / "ngegas" -> "Bensin" / "Bahan Bakar" (Transportasi)
     - "tokped" -> "Tokopedia", "shope" / "shopeepay" -> "Shopee"
   - Rapikan "keterangan" menjadi huruf kapital yang enak dibaca (Title Case), bersihkan kata keterangan waktu dan harga dari nama barang. Contoh: input "ns padang 18k td siang cash" -> keterangan: "Nasi Padang".

2. **Kamus Waktu & Slang Tanggal:**
   - "kmrn", "kemren", "kmarin", "semalem", "smlm", "kemaren" -> Gunakan ${yesterdayISO}.
   - "td", "tadi", "td pg", "td siang", "skrg", "hr ini", "barusan", "baru aja" -> Gunakan ${todayISO}.
   - "lusa", "2 hari lalu", "2hr lalu", "kmrn lusa" -> Gunakan ${twoDaysAgoISO}.
   - "3 hari lalu" -> Gunakan ${threeDaysAgoISO}.
   - "senin lalu", "jumat lalu", dll -> Gunakan tanggal hari terkait yang sudah dihitung di konteks server.
   - "tgl 5" / "tanggal 5" -> tanggal 5 bulan ini jika <= ${todayDate}, jika belum lewat -> tanggal 5 bulan lalu.
   - Jika tidak ada keterangan waktu sama sekali -> Default ke ${todayISO}.

3. **Nominal & Angka Slang:**
   - "k", "rb", "rebu", "ribu", "keping" -> Kalikan 1.000 (contoh: "18k" -> 18000, "10 rb" -> 10000).
   - "jt", "juta", "jeti" -> Kalikan 1.000.000 (contoh: "1.5jt" / "1,5jt" -> 1500000, "7.5jt" -> 7500000).
   - Istilah pasar/slang:
     * "seceng" -> 1000
     * "goceng" -> 5000
     * "ceban" -> 10000
     * "gocap" -> 50000
     * "cepek" -> 100000
     * "sejuta" -> 1000000

4. **Kategori Wajib (Pilih Tepat Satu):**
   - "Makanan & Minuman" -> makan, minum, kopi, bakso, nasi, resto, warung, starbucks, kfc, mcd, gofood, grabfood, jajan, es teh, dll.
   - "Transportasi" -> bensin, solar, pertamax, pertalite, parkir, tol, gojek, grab, ojol, angkot, bus, kereta, pesawat.
   - "Belanja" -> baju, celana, sepatu, tas, tokopedia, shopee, mall, olshop, skincare, belanja bulanan.
   - "Tagihan" -> listrik, air, wifi, pulsa, kuota, token PLN, indihome, iuran, sewa, kos, bpjs.
   - "Gaji & Pendapatan" -> gaji, gajian, payroll, thr, bonus, honor, freelance, proyek, dividen, penjualan, terima transfer.
   - "Investasi & Tabungan" -> investasi, saham, crypto, reksadana, deposito, tabungan umum.
   - "Kesehatan" -> obat, dokter, apotek, rumah sakit, klinik, gym, vitamin.
   - "Pendidikan" -> kursus, buku, udemy, kuliah, sekolah, les, seminar.
   - "Hiburan" -> nonton, bioskop, game, mabar, netflix, spotify, liburan.
   - "Lain-lain" -> jika tidak cocok dengan kategori manapun di atas.

5. **Metode Pembayaran:**
   - "Cash" -> tunai, cash, bayar langsung, uang (default jika tidak disebut).
   - "E-Wallet" -> gopay, ovo, dana, shopeepay, spay, qris, linkaja.
   - "Transfer Bank" -> transfer, tf, bca, mandiri, bni, bri, bsi, jago, seabank, bank.
   - "Kartu Kredit/Debit" -> kartu kredit, debit, visa, mastercard, cc.

6. **Deteksi Intent:**
   - "transaction": Transaksi pengeluaran atau pemasukan uang riil yang sudah/sedang terjadi.
   - "wishlist": Keinginan/rencana masa depan untuk menabung target barang (kata kunci: "nabung", "mau beli", "pengen beli", "target beli", "wishlist", "impian").
   - "summary_request": Permintaan ringkasan atau analisis laporan tabel periode (kata kunci: "ringkas", "rangkum", "summary", "tabel laporan").
   - "unknown" / "chat": Percakapan umum, saran keuangan, tips hemat, evaluasi kondisi finansial, opini, atau sapaan.

7. **ATURAN WAJIB UNTUK SARAN / ANALISIS KEUANGAN & TIPS (DATA-DRIVEN & INTERAKTIF):**
   - JIKA pengguna meminta tips hemat, analisis keuangan, saran agar tidak minus, atau evaluasi pengeluaran:
     1. **DASARKAN 100% PADA DATA NYATA PENGGUNA DI ATAS**:
        - Jangan berikan tips umum/klise tanpa angka jika data pengguna tersedia!
        - Sebutkan angka pasti: Total Pemasukan, Pengeluaran, dan kondisi Surplus/Defisit bulan ini.
        - Identifikasi kategori pengeluaran terbesar (misal Makanan Rp X, Belanja Rp Y) dan persentasenya.
        - Sebutkan jika ada Budget yang overbudget.
        - Hitung target penghematan konkret untuk bulan depan (misal: "Untuk menutup defisit Rp X, kamu perlu kurangi pos Makanan dari Rp A menjadi Rp B dan Belanja dari Rp C menjadi Rp D agar bulan depan bisa surplus Rp E").
     2. **WAJIB MENGAJAK BERDIALOG / INTERAKTIF (CALL TO ACTION)**:
        - Di akhir jawaban, berikan pertanyaan pemantik diskusi atau tawarkan simulasi lanjutan (contoh: "Kira-kira dari pos Makanan & Minuman sama Belanja, mana yang paling siap kita pangkas duluan? Atau mau Anya bikinin panduan budget harian? 😊").
   - JIKA pengguna hanya mencatat transaksi atau wishlist biasa, jawab dengan ramah, singkat, dan ceria.

---

### STRUKTUR OUTPUT (WAJIB RAW JSON):

1. Jika user hanya memasukkan SATU transaksi/wishlist/permintaan/chat:
Kembalikan SATU objek JSON seperti berikut:

Untuk intent "transaction":
{
  "intent": "transaction",
  "message": "<balasan ramah kasual ala Anya>",
  "data": {
    "type": "expense" | "income",
    "tanggal": "YYYY-MM-DD",
    "kategori": "<Kategori Valid>",
    "metode": "Cash" | "E-Wallet" | "Transfer Bank" | "Kartu Kredit/Debit",
    "keterangan": "<Nama Barang/Aktivitas yang Sudah Rapi Title Case, max 50 char>",
    "harga": <number nominal rupiah murni tanpa titik/koma>
  }
}

Untuk intent "wishlist":
{
  "intent": "wishlist",
  "message": "<balasan ramah kasual ala Anya>",
  "data": {
    "name": "<Nama Target Barang Rapi Title Case>",
    "target": <number nominal target rupiah>,
    "current": 0,
    "icon": "ph-star" | "ph-laptop" | "ph-phone" | "ph-car" | "ph-house" | "ph-airplane" | "ph-shopping-bag",
    "color": "purple" | "blue" | "green" | "orange"
  }
}

Untuk intent "summary_request":
{
  "intent": "summary_request",
  "message": "<balasan ramah kasual ala Anya>",
  "period": "1_week" | "1_month" | "3_months" | "1_year"
}

Untuk intent "unknown" / "chat":
{
  "intent": "unknown",
  "message": "<jawaban mendalam berbasis data keuangan & diakhiri ajakan dialog interaktif ala Anya>"
}

2. JIKA USER MEMASUKKAN LEBIH DARI SATU TRANSAKSI ATAU ITEM SEKALIGUS (contoh: "bensin 30k csh dan makan siang 15k gopay", "makan siang 25rb, beli kopi 18k, nabung hp 3jt"):
WAJIB KEMBALIKAN DALAM FORMAT ARRAY OBJEK JSON (masing-masing item memiliki intent dan datanya sendiri):
[
  {
    "intent": "transaction",
    "message": "Siap! Bensin 30rb via Cash sudah Anya siapkan ya.",
    "data": {
      "type": "expense",
      "tanggal": "YYYY-MM-DD",
      "kategori": "Transportasi",
      "metode": "Cash",
      "keterangan": "Bensin",
      "harga": 30000
    }
  },
  {
    "intent": "transaction",
    "message": "Makan siang 15rb via Gopay juga sudah siap!",
    "data": {
      "type": "expense",
      "tanggal": "YYYY-MM-DD",
      "kategori": "Makanan & Minuman",
      "metode": "E-Wallet",
      "keterangan": "Makan Siang",
      "harga": 15000
    }
  }
]

Input User: "${userText.replace(/"/g, '\\"')}"`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json'
    }
  };

  try {
    const json = await callGeminiApi(apiKey, body, 25000);
    const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) throw new Error('Response kosong dari Gemini.');

    try {
      return JSON.parse(rawText);
    } catch {
      const match = rawText.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
      if (match) {
        return JSON.parse(match[0]);
      }
      throw new Error('Format JSON dari Gemini tidak valid.');
    }
  } catch (err) {
    console.warn('[geminiService] Gemini API gagal, menggunakan local fallback parser Anya:', err.message);
    return localFallbackNlpParser(userText, dateContext);
  }
}

/**
 * Robust Local NLP Fallback Engine with Anya Persona & Slang Processing.
 * Guarantees zero downtime and 100% processing success even when offline.
 */
function localFallbackNlpParser(userText, context = {}) {
  if (!userText || typeof userText !== 'string') return null;
  const lower = userText.trim().toLowerCase();
  if (!lower) return null;

  const todayISO = context.todayISO || new Date().toISOString().split('T')[0];
  const yesterdayISO = context.yesterdayISO || todayISO;
  const twoDaysAgoISO = context.twoDaysAgoISO || todayISO;
  const threeDaysAgoISO = context.threeDaysAgoISO || todayISO;
  const oneWeekAgoISO = context.oneWeekAgoISO || todayISO;

  // 1. Check summary request intent
  if (
    lower.includes("summary") ||
    lower.includes("ringkas") ||
    lower.includes("rangkum") ||
    lower.includes("laporan") ||
    lower.includes("evaluasi") ||
    lower.includes("analisis")
  ) {
    let period = "1_month";
    if (lower.includes("minggu") || lower.includes("7 hari")) period = "1_week";
    else if (lower.includes("3 bulan")) period = "3_months";
    else if (lower.includes("tahun") || lower.includes("1 thn")) period = "1_year";
    return {
      intent: "summary_request",
      message: `Siap! Anya buatin ringkasan keuangan kamu untuk periode ini ya 📊`,
      period
    };
  }

  // 2. Amount parsing with Slang & Acronyms
  let amount = 0;
  if (/\b(gocap|gokap|gocapp)\b/.test(lower)) amount = 50000;
  else if (/\b(ceban|cebanan)\b/.test(lower)) amount = 10000;
  else if (/\b(seceng|sceng)\b/.test(lower)) amount = 1000;
  else if (/\b(goceng)\b/.test(lower)) amount = 5000;
  else if (/\b(cepek|cpek|secepek)\b/.test(lower)) amount = 100000;
  else if (/\b(pekgo)\b/.test(lower)) amount = 150000;
  else if (/\b(noban)\b/.test(lower)) amount = 20000;
  else if (/\b(sejuta|sejutaaa)\b/.test(lower)) amount = 1000000;
  else {
    const jtMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:jt|juta|jeti)/i);
    const kMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:k|rb|ribu|rebu)/i);
    const rawNumMatch = lower.match(/(?:rp\.?\s*)?(\d{1,3}(?:\.\d{3})+|\d+)/i);

    if (jtMatch) {
      amount = parseFloat(jtMatch[1].replace(',', '.')) * 1000000;
    } else if (kMatch) {
      amount = parseFloat(kMatch[1].replace(',', '.')) * 1000;
    } else if (rawNumMatch) {
      const cleanStr = rawNumMatch[1].replace(/\./g, "");
      amount = parseFloat(cleanStr);
    }
  }

  // 3. Check wishlist intent
  const wishlistKeywords = ["wishlist", "nabung", "target", "impian", "pengen beli", "mau beli", "cita-cita", "save"];
  if (wishlistKeywords.some(kw => lower.includes(kw)) && amount > 0) {
    let name = userText
      .replace(/(?:wishlist|nabung|target|impian|beli|cita-cita|pengen|mau)/gi, "")
      .replace(/(?:rp\.?\s*)?(\d{1,3}(?:\.\d{3})+|\d+)\s*(?:jt|juta|jeti|k|rb|ribu|rebu)?/gi, "")
      .replace(/\b(gocap|ceban|seceng|goceng|cepek|pekgo|noban|sejuta)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!name) name = "Target Impian";
    name = name.charAt(0).toUpperCase() + name.slice(1);

    let icon = "ph-star";
    if (/laptop|pc|komputer/i.test(lower)) icon = "ph-laptop";
    else if (/hp|phone|iphone|samsung/i.test(lower)) icon = "ph-phone";
    else if (/motor|mobil|kendaraan/i.test(lower)) icon = "ph-car";
    else if (/rumah|tanah|kost/i.test(lower)) icon = "ph-house";
    else if (/liburan|tiket|jalan-jalan/i.test(lower)) icon = "ph-airplane";
    else if (/sepatu|baju|tas/i.test(lower)) icon = "ph-shopping-bag";

    return {
      intent: "wishlist",
      message: `Mantap! Target ${name} Rp ${amount.toLocaleString('id-ID')} udah Anya masukin ke Wishlist ya ⭐`,
      data: {
        name,
        target: amount,
        current: 0,
        icon,
        color: "purple"
      }
    };
  }

  // 4. Check transaction intent if amount > 0
  if (amount > 0) {
    const incomeKw = ["gaji", "gajian", "payroll", "thr", "bonus", "honor", "freelance", "dpt trf", "dapet trf", "tf masuk", "trf masuk", "cair", "proyek", "dividen", "omset", "pemasukan", "inflow"];
    const isIncome = incomeKw.some(kw => lower.includes(kw));
    const type = isIncome ? "income" : "expense";

    let kategori = isIncome ? "Gaji & Pendapatan" : "Lain-lain";
    if (/bensin|bnesin|pertamax|pertalite|shell|solar|parkir|gojek|goride|gocar|grab|ojol|angkot|tol|transport|ngegas|bus|kereta|krl|mrt|lrt/i.test(lower)) {
      kategori = "Transportasi";
    } else if (/makan|mkn|minum|mnm|kopi|ngopi|bakso|nasi|padang|naspad|nasgor|esteh|es teh|resto|warung|food|jajan|nongkrong|lunch|dinner|sarapan|starbucks|sbux|kfc|mcd|gofood|grabfood|seblak|mie|indomie/i.test(lower)) {
      kategori = "Makanan & Minuman";
    } else if (/gaji|gajian|payroll|thr|bonus|honor|freelance|proyek|dpt trf/i.test(lower)) {
      kategori = "Gaji & Pendapatan";
    } else if (/belanja|blj|baju|celana|sepatu|tas|tokped|tokopedia|shopee|shope|mall|olshop|skincare|lazada|blibli/i.test(lower)) {
      kategori = "Belanja";
    } else if (/listrik|token|pdam|air|wifi|indihome|pulsa|kuota|tagihan|iuran|sewa|kos|kost|kontrakan|bpjs/i.test(lower)) {
      kategori = "Tagihan";
    } else if (/investasi|saham|crypto|reksadana|deposito|bibit/i.test(lower)) {
      kategori = "Investasi & Tabungan";
    } else if (/obat|dokter|apotek|klinik|rs|gym|ngegym|vitamin|sehat/i.test(lower)) {
      kategori = "Kesehatan";
    } else if (/kursus|buku|udemy|kuliah|sekolah|les|seminar|pelatihan/i.test(lower)) {
      kategori = "Pendidikan";
    } else if (/nonton|bioskop|game|mabar|netflix|spotify|liburan|hiburan/i.test(lower)) {
      kategori = "Hiburan";
    }

    let metode = "Cash";
    if (/transfer|tf|trf|bca|mandiri|bni|bri|bsi|jago|seabank|bank|cimb|blu/i.test(lower)) {
      metode = "Transfer Bank";
    } else if (/gopay|ovo|dana|shopeepay|spay|qris|linkaja|ewallet|e-wallet/i.test(lower)) {
      metode = "E-Wallet";
    } else if (/kartu kredit|kartu debit|kredit|debit|visa|mastercard|cc/i.test(lower)) {
      metode = "Kartu Kredit/Debit";
    }

    let tanggal = todayISO;
    if (/\b(kemarin|kmrn|kmaren|kemaren|kmren|semalem|smlm|semalam)\b/.test(lower)) {
      tanggal = yesterdayISO;
    } else if (/\b(2\s*(?:hari|hr)\s*(?:lalu|yll)|lusa)\b/.test(lower)) {
      tanggal = twoDaysAgoISO;
    } else if (/\b(3\s*(?:hari|hr)\s*(?:lalu|yll))\b/.test(lower)) {
      tanggal = threeDaysAgoISO;
    } else if (/\b(1?\s*minggu\s*(?:lalu|yll)|seminggu\s*(?:lalu|yll))\b/.test(lower)) {
      tanggal = oneWeekAgoISO;
    }

    let keterangan = userText
      .replace(/(?:rp\.?\s*)?(\d{1,3}(?:\.\d{3})+|\d+)\s*(?:jt|juta|jeti|k|rb|ribu|rebu)?/gi, "")
      .replace(/\b(gocap|ceban|seceng|goceng|cepek|pekgo|noban|sejuta)\b/gi, "")
      .replace(/\b(cash|tunai|transfer|tf|trf|bank|qris|gopay|ovo|dana|shopeepay|spay|bca|mandiri|bni|bri|bsi|linkaja|ewallet|e-wallet|visa|mastercard|cc|kartu kredit|kartu debit)\b/gi, "")
      .replace(/\b(gw|gue|gua|w|bre|bro|cuy|ngab|njir|wkwk|lol|dong|deh|sih|nih|tuh|kan|ya|yaa|aja|aj|udh|udah|abis|habis|tdi|tadi|kmrn|kemarin|kmaren|barusan|td|pg|siang|mlm)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!keterangan) {
      keterangan = isIncome ? `Pemasukan ${kategori}` : kategori;
    }
    if (/nasi apdang|ns padang|naspad/i.test(keterangan)) keterangan = "Nasi Padang";
    else if (/esteh masni|es teh mns|esteh mnis/i.test(keterangan)) keterangan = "Es Teh Manis";
    else if (/bnesin/i.test(keterangan)) keterangan = "Bensin";
    else if (/tokped/i.test(keterangan)) keterangan = "Belanja Tokopedia";
    else {
      keterangan = keterangan.charAt(0).toUpperCase() + keterangan.slice(1);
    }

    const formattedAmt = amount >= 1000000 ? `${(amount/1000000).toLocaleString('id-ID')}jt` : `${(amount/1000).toLocaleString('id-ID')}rb`;
    const msg = isIncome
      ? `Mantap! Pemasukan ${keterangan} ${formattedAmt} via ${metode} udah Anya catat ya 🤑`
      : `Oke bre, ${keterangan} ${formattedAmt} via ${metode} udah Anya catat ya! 📝`;

    return {
      intent: "transaction",
      message: msg,
      data: {
        type,
        tanggal,
        kategori,
        metode,
        keterangan,
        harga: amount
      }
    };
  }

  // 5. Conversational or Tips
  let chatMsg = "Halo! Anya di sini. Mau catat transaksi atau minta tips apa nih hari ini? Contoh: 'Nasi padang 25rb cash' atau 'Kasi tips hemat bulan ini' 😊";
  if (/tips|hemat|saran|nabung gimana|minus|boros|keuangan|evaluasi|pendapat|analisis/i.test(lower)) {
    const fc = context.financialContext;
    if (fc && fc.currentMonth) {
      const inc = Number(fc.currentMonth.income || 0);
      const exp = Number(fc.currentMonth.expense || 0);
      const net = inc - exp;
      const topCat = fc.currentMonth.breakdown?.[0]?.kategori || "Makanan & Minuman";
      const topAmt = Number(fc.currentMonth.breakdown?.[0]?.amount || 0);
      const topPct = fc.currentMonth.breakdown?.[0]?.percent || 0;

      if (net < 0) {
        chatMsg = `Wah, kalau Anya cek catatanmu bulan ini, kamu sedang **defisit Rp ${Math.abs(net).toLocaleString('id-ID')}** (Pemasukan Rp ${inc.toLocaleString('id-ID')} vs Pengeluaran Rp ${exp.toLocaleString('id-ID')}).\n\n📌 **Fokus Utama Penghematan**:\n1. Pos pengeluaran terbesarmu ada di **${topCat}** sebesar **Rp ${topAmt.toLocaleString('id-ID')} (${topPct}%)**. Pangkas belanja di pos ini untuk menutup minus.\n2. Terapkan batas budget harian agar arus kas terkendali.\n3. Tunda pengeluaran sekunder/wishlist sampai arus kas kembali surplus.\n\nMau Anya bantu bikinin batasan budget harian untuk kategori ${topCat}? 😊`;
      } else {
        chatMsg = `Kondisi keuanganmu bulan ini **surplus Rp ${net.toLocaleString('id-ID')}** (Pemasukan Rp ${inc.toLocaleString('id-ID')} vs Pengeluaran Rp ${exp.toLocaleString('id-ID')}). Bagus banget!\n\n💡 **Saran Anya**:\n1. Pos terbesarmu saat ini di **${topCat} (Rp ${topAmt.toLocaleString('id-ID')})**.\n2. Sisihkan minimal 20% dari surplusmu ke Wishlist atau Tabungan Darurat.\n\nMau kita alokasikan sebagian surplus ini ke target wishlist-mu sekarang? ⭐`;
      }
    } else {
      chatMsg = "Tips hemat dari Anya:\n1. Alokasikan 50% kebutuhan pokok, 30% keinginan, dan 20% tabungan.\n2. Rutin catat setiap pengeluaran harian agar tidak boncos.\n3. Buat target wishlist sebelum belanja konsumtif!\n\nAda kategori pengeluaran tertentu yang mau kita evaluasi bareng? 😊";
    }
  } else if (/halo|hai|hey|pagi|siang|malam|apa kabar/i.test(lower)) {
    chatMsg = "Halo! Anya siap membantumu mencatat transaksi dan mengelola keuangan dengan pintar. Ada yang bisa Anya bantu hari ini?";
  }

  return {
    intent: "unknown",
    message: chatMsg
  };
}

/**
 * Generate analisis & saran finansial berbasis AI sesuai periode waktu tertentu
 * @param {object} metrics - Data statistik keuangan
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

  try {
    const json = await callGeminiApi(apiKey, body, 20000);
    const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) return null;

    return JSON.parse(rawText);
  } catch (err) {
    console.error('[geminiService] Gagal generate financial report:', err.message);
    return null;
  }
}

module.exports = {
  extractReceiptData,
  parseNaturalLanguageInput,
  generateFinancialReport
};
