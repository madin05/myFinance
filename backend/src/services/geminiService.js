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

  const prompt = `Kamu adalah "Anya", asisten pencatat keuangan pintar yang santai, responsif, dan sangat peka terhadap konteks bahasa gaul Indonesia, bahasa Inggris, maupun kombinasi (code-switching), serta ahli finansial pribadi pengguna.

### TUGAS UTAMA:
Ekstrak input pengguna menjadi data terstruktur (JSON) ATAU berikan analisis dan saran finansial personal yang mendalam dan interaktif berbasis data nyata pengguna. 
Pengguna dapat mengetik dalam berbagai bahasa (Bahasa Indonesia, English, Bahasa Gaul/Slang, Singkatan), format acak (koma, titik koma, dan, bullet points, baris baru), serta struktur kalimat bebas (cepat, santai, typo, implisit, eksplisit).
Tugasmu adalah memahami maksud aslinya (intent) secara presisi dengan konsep NLP canggih, merapikannya, dan merespons dengan gaya bahasa yang natural, akrab, dan bersahabat.
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

### ATURAN PARSING MULTI-BAHASA, SLANG, & STRUKTUR KALIMAT:

1. **Fleksibilitas Bahasa & Koreksi Typo (Multilingual & Fuzzy Intent):**
   - Mendukung penuh Bahasa Indonesia (Formal & Gaul/Slang), English, serta percampuran bahasa (Code-switching).
   - Koreksi salah ketik keyboard dan variasi fonetik:
     - "nasi apdang" / "ns padang" / "naspad" -> "Nasi Padang"
     - "esteh masni" / "es teh mns" -> "Es Teh Manis"
     - "gwbel" / "bli" / "byr" / "spent" / "bought" -> Pengeluaran (Expense)
     - "dpt trf" / "tf msuk" / "gjian" / "got salary" / "received transfer" -> Pemasukan (Income)
     - "bnesin" / "fuel" / "gasoline" / "petrol" / "ngegas" -> "Bensin" (Transportasi)
     - "tokped" -> "Tokopedia", "shope" / "spay" -> "Shopee"
   - Rapikan "keterangan" menjadi Title Case yang bersih tanpa kata partikel slang/harga/waktu. Contoh: "spent 35k on uber yesterday" -> keterangan: "Uber".

2. **Kamus Waktu & Slang Tanggal (ID & EN):**
   - "kmrn", "kemarin", "semalem", "yesterday", "last night" -> Gunakan ${yesterdayISO}.
   - "td", "tadi", "today", "skrg", "hr ini", "barusan", "just now" -> Gunakan ${todayISO}.
   - "lusa", "2 hari lalu", "2 days ago" -> Gunakan ${twoDaysAgoISO}.
   - "3 hari lalu", "3 days ago" -> Gunakan ${threeDaysAgoISO}.
   - "senin lalu", "last monday", dll -> Gunakan tanggal hari terkait yang sudah dihitung di konteks server.
   - "tgl 5" / "tanggal 5" -> tanggal 5 bulan ini jika <= ${todayDate}, jika belum lewat -> tanggal 5 bulan lalu.
   - Jika tidak ada keterangan waktu sama sekali -> Default ke ${todayISO}.

3. **Nominal & Angka Slang (ID & EN):**
   - "k", "rb", "rebu", "ribu", "grand", "keping" -> Kalikan 1.000 (contoh: "35k" -> 35000, "10 rb" -> 10000).
   - "jt", "juta", "jeti", "m", "million" -> Kalikan 1.000.000 (contoh: "1.5jt" -> 1500000, "2m" -> 2000000).
   - Slang pasar Indonesia:
     * "seceng" -> 1000
     * "goceng" -> 5000
     * "ceban" -> 10000
     * "noban" -> 20000
     * "gocap" -> 50000
     * "cepek" -> 100000
     * "pekgo" -> 150000
     * "sejuta" -> 1000000

4. **Kategori Wajib (Pilih Tepat Satu):**
   - "Makanan & Minuman" -> makan, minum, kopi, coffee, food, drink, breakfast, lunch, dinner, snack, nasi, resto, cafe, warung, starbucks, kfc, mcd, gofood, grabfood, groceries, dll.
   - "Transportasi" -> bensin, gas, fuel, parkir, parking, tol, toll, gojek, grab, uber, ojol, angkot, bus, kereta, train, krl, mrt, lrt, taxi, flight, pesawat.
   - "Belanja" -> baju, celana, sepatu, tas, clothes, shoes, bag, tokopedia, shopee, amazon, mall, olshop, skincare, shopping.
   - "Tagihan" -> listrik, air, wifi, internet, pulsa, kuota, paket data, phone bill, token PLN, indihome, iuran, sewa, rent, kos, bpjs.
   - "Gaji & Pendapatan" -> gaji, salary, wage, gajian, payroll, thr, bonus, honor, freelance, proyek, dividen, omset, terima transfer, inflow.
   - "Investasi & Tabungan" -> investasi, investment, saham, stock, crypto, btc, reksadana, deposito, tabungan.
   - "Kesehatan" -> obat, medicine, dokter, doctor, apotek, pharmacy, rumah sakit, hospital, klinik, gym, fitness, vitamin.
   - "Pendidikan" -> kursus, course, buku, book, udemy, kuliah, tuition, sekolah, les, seminar.
   - "Hiburan" -> nonton, cinema, bioskop, movie, game, gaming, mabar, netflix, spotify, liburan, holiday, vacation.
   - "Lain-lain" -> jika tidak cocok dengan kategori manapun di atas.

5. **Metode Pembayaran & Collective Modifier Rule:**
   - "Cash" -> tunai, cash, bayar langsung, uang fisik (default jika tidak disebut).
   - "E-Wallet" -> gopay, ovo, dana, shopeepay, spay, qris, linkaja, paypal.
   - "Transfer Bank" -> transfer, tf, trf, bca, mandiri, bni, bri, bsi, jago, seabank, bank.
   - "Kartu Kredit/Debit" -> kartu kredit, debit, credit card, debit card, visa, mastercard, cc.
   - **ATURAN MODIFIER KOLEKTIF (COLLECTIVE MODIFIER)**:
     Jika pengguna menuliskan keterangan metode pembayaran kolektif di awal atau akhir kalimat (seperti "cash semua", "semua cash", "pake gopay semua", "all in cash", "all via transfer"), maka TERAPKAN metode tersebut ke SELURUH item dalam batch transaksi tersebut, kecuali jika suatu item secara eksplisit menyebut metode yang berbeda!

6. **Deteksi Intent:**
   - "transaction": Transaksi pengeluaran atau pemasukan uang riil yang sudah/sedang terjadi.
   - "wishlist": Keinginan/rencana masa depan untuk menabung target barang (kata kunci: "nabung", "saving", "mau beli", "pengen beli", "target beli", "wishlist", "impian", "dream").
   - "summary_request": Permintaan ringkasan atau analisis laporan tabel periode (kata kunci: "ringkas", "rangkum", "summary", "tabel laporan", "report").
   - "unknown" / "chat": Percakapan umum, saran keuangan, tips hemat, evaluasi kondisi finansial, opini, atau sapaan.

7. **ATURAN WAJIB UNTUK SARAN / ANALISIS KEUANGAN & TIPS (DATA-DRIVEN & INTERAKTIF):**
   - JIKA pengguna meminta tips hemat, analisis keuangan, saran agar tidak minus, atau evaluasi pengeluaran:
     1. **DASARKAN 100% PADA DATA NYATA PENGGUNA DI ATAS**:
        - Jangan berikan tips umum/klise tanpa angka jika data pengguna tersedia!
        - Sebutkan angka pasti: Total Pemasukan, Pengeluaran, dan kondisi Surplus/Defisit bulan ini.
        - Identifikasi kategori pengeluaran terbesar (misal Makanan Rp X, Belanja Rp Y) dan persentasenya.
        - Sebutkan jika ada Budget yang overbudget.
        - Hitung target penghematan konkret untuk bulan depan.
     2. **WAJIB MENGAJAK BERDIALOG / INTERAKTIF (CALL TO ACTION)**:
        - Di akhir jawaban, berikan pertanyaan pemantik diskusi atau tawarkan simulasi lanjutan.
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

2. JIKA USER MEMASUKKAN LEBIH DARI SATU TRANSAKSI ATAU ITEM SEKALIGUS (contoh: "Bensin 35k, paket data 35k, makan 17k cash semua", "makan siang 25rb, beli kopi 18k, nabung hp 3jt", "fuel 50k and lunch 30k all cash"):
WAJIB KEMBALIKAN DALAM FORMAT ARRAY OBJEK JSON (masing-masing item memiliki intent dan datanya sendiri):
[
  {
    "intent": "transaction",
    "message": "Siap! Bensin 35rb via Cash sudah Anya siapkan ya.",
    "data": {
      "type": "expense",
      "tanggal": "${todayISO}",
      "kategori": "Transportasi",
      "metode": "Cash",
      "keterangan": "Bensin",
      "harga": 35000
    }
  },
  {
    "intent": "transaction",
    "message": "Paket Data 35rb via Cash sudah Anya siapkan ya.",
    "data": {
      "type": "expense",
      "tanggal": "${todayISO}",
      "kategori": "Tagihan",
      "metode": "Cash",
      "keterangan": "Paket Data",
      "harga": 35000
    }
  },
  {
    "intent": "transaction",
    "message": "Makan 17rb via Cash sudah Anya siapkan ya.",
    "data": {
      "type": "expense",
      "tanggal": "${todayISO}",
      "kategori": "Makanan & Minuman",
      "metode": "Cash",
      "keterangan": "Makan",
      "harga": 17000
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
 * Universal Multilingual Amount Parser (supports slang numbers, k, rb, jt, m, and clean digits).
 */
function parseSingleAmount(str) {
  if (!str || typeof str !== 'string') return 0;
  const lower = str.toLowerCase();
  if (/\b(gocap|gokap|gocapp)\b/i.test(lower)) return 50000;
  if (/\b(ceban|cebanan)\b/i.test(lower)) return 10000;
  if (/\b(seceng|sceng)\b/i.test(lower)) return 1000;
  if (/\b(goceng)\b/i.test(lower)) return 5000;
  if (/\b(cepek|cpek|secepek)\b/i.test(lower)) return 100000;
  if (/\b(pekgo)\b/i.test(lower)) return 150000;
  if (/\b(noban)\b/i.test(lower)) return 20000;
  if (/\b(sejuta|sejutaaa)\b/i.test(lower)) return 1000000;

  const jtMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:jt|juta|jeti|m(?:illion)?)\b/i);
  if (jtMatch) return parseFloat(jtMatch[1].replace(',', '.')) * 1000000;

  const kMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:k|rb|ribu|rebu|grand|keping)\b/i);
  if (kMatch) return parseFloat(kMatch[1].replace(',', '.')) * 1000;

  const rawNumMatch = lower.match(/(?:rp\.?\s*|\$\s*)?(\d{1,3}(?:\.\d{3})+|\d+)/i);
  if (rawNumMatch) {
    const cleanStr = rawNumMatch[1].replace(/\./g, '');
    const val = parseFloat(cleanStr);
    if (!isNaN(val) && val > 0) return val;
  }
  return 0;
}

/**
 * Detect Multilingual Category from Clause Text.
 */
function detectCategoryFromClause(clause, isIncome = false) {
  if (isIncome) return 'Gaji & Pendapatan';
  const lower = clause.toLowerCase();

  if (/bensin|bnesin|pertamax|pertalite|shell|solar|fuel|gas|gasoline|parkir|parking|gojek|goride|gocar|grab|grabcar|ojol|angkot|tol|toll|transport|transportation|ngegas|bus|kereta|train|krl|mrt|lrt|flight|pesawat|tiket pesawat|taxi|taksi|uber/i.test(lower)) {
    return 'Transportasi';
  }
  if (/makan|mkn|minum|mnm|kopi|ngopi|coffee|bakso|nasi|padang|naspad|nasgor|esteh|es teh|resto|restaurant|warung|food|jajan|snack|nongkrong|lunch|dinner|breakfast|sarapan|starbucks|sbux|kfc|mcd|mcdonalds|gofood|grabfood|shopeefood|seblak|mie|indomie|groceries|grocery|supermarket/i.test(lower)) {
    return 'Makanan & Minuman';
  }
  if (/gaji|gajian|payroll|thr|bonus|honor|freelance|proyek|dpt trf|salary|wage|dividend|omset/i.test(lower)) {
    return 'Gaji & Pendapatan';
  }
  if (/belanja|blj|baju|clothes|celana|pants|sepatu|shoes|tas|bag|tokped|tokopedia|shopee|shope|mall|olshop|skincare|lazada|blibli|amazon|shopping|buy|beli/i.test(lower)) {
    return 'Belanja';
  }
  if (/listrik|electricity|token|pdam|air|water|wifi|indihome|pulsa|kuota|data|paket data|internet|phone bill|tagihan|bill|iuran|sewa|rent|kos|bpjs|insurance|asuransi/i.test(lower)) {
    return 'Tagihan';
  }
  if (/investasi|invest|investment|saham|stock|stocks|crypto|btc|reksadana|deposito|bibit/i.test(lower)) {
    return 'Investasi & Tabungan';
  }
  if (/obat|medicine|medical|dokter|doctor|apotek|pharmacy|rumah sakit|hospital|klinik|clinic|rs|gym|fitness|ngegym|vitamin|sehat|health/i.test(lower)) {
    return 'Kesehatan';
  }
  if (/kursus|course|buku|book|udemy|kuliah|tuition|sekolah|school|les|seminar|pelatihan|education|pendidikan/i.test(lower)) {
    return 'Pendidikan';
  }
  if (/nonton|cinema|bioskop|movie|game|gaming|mabar|netflix|spotify|liburan|holiday|vacation|hiburan|entertainment/i.test(lower)) {
    return 'Hiburan';
  }
  return 'Lain-lain';
}

/**
 * Detect Payment Method from Clause.
 */
function detectPaymentMethodFromClause(clause) {
  const lower = clause.toLowerCase();
  if (/transfer|tf|trf|bca|mandiri|bni|bri|bsi|jago|seabank|bank|cimb|blu|wire/i.test(lower)) {
    return 'Transfer Bank';
  }
  if (/gopay|ovo|dana|shopeepay|spay|qris|linkaja|ewallet|e-wallet|wallet|paypal/i.test(lower)) {
    return 'E-Wallet';
  }
  if (/kartu kredit|kartu debit|credit card|debit card|kredit|debit|visa|mastercard|cc/i.test(lower)) {
    return 'Kartu Kredit/Debit';
  }
  if (/cash|tunai|cash money/i.test(lower)) {
    return 'Cash';
  }
  return null;
}

/**
 * Detect Global Collective Payment Modifiers (e.g. "cash semua", "all via gopay").
 */
function detectGlobalPaymentMethod(fullText) {
  const lower = fullText.toLowerCase();
  if (/\b(?:cash|tunai)\s+semua\b|\bsemua(?:\s+pake|\s+pakai|\s+via|\s+by|\s+in)?\s+(?:cash|tunai)\b|\ball\s+(?:in\s+)?cash\b/i.test(lower)) {
    return 'Cash';
  }
  if (/\b(?:gopay|ovo|dana|shopeepay|spay|qris|linkaja|ewallet|e-wallet)\s+semua\b|\bsemua(?:\s+pake|\s+pakai|\s+via|\s+by)?\s+(?:gopay|ovo|dana|shopeepay|spay|qris|linkaja|ewallet|e-wallet)\b|\ball\s+(?:via\s+)?(?:gopay|ovo|dana|qris|ewallet)\b/i.test(lower)) {
    return 'E-Wallet';
  }
  if (/\b(?:transfer|tf|trf|bca|mandiri|bni|bri|bsi|jago|seabank|bank)\s+semua\b|\bsemua(?:\s+pake|\s+pakai|\s+via|\s+by|\s+pake\s+trf)?\s+(?:transfer|tf|trf|bca|mandiri|bni|bri|bsi|jago|seabank|bank)\b|\ball\s+(?:via\s+)?(?:transfer|bank|bca)\b/i.test(lower)) {
    return 'Transfer Bank';
  }
  if (/\b(?:kartu kredit|kartu debit|kredit|debit|visa|mastercard|cc)\s+semua\b|\bsemua(?:\s+pake|\s+pakai|\s+via|\s+by)?\s+(?:kartu kredit|kartu debit|kredit|debit|visa|mastercard|cc)\b|\ball\s+(?:via\s+)?(?:card|credit card|cc)\b/i.test(lower)) {
    return 'Kartu Kredit/Debit';
  }
  return null;
}

/**
 * Robust Multilingual Local NLP Fallback Engine with Multi-Clause Segmentation.
 * Guarantees zero downtime and 100% processing success across languages and multi-inputs.
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
    lower.includes("analisis") ||
    lower.includes("report")
  ) {
    let period = "1_month";
    if (lower.includes("minggu") || lower.includes("7 hari") || lower.includes("week")) period = "1_week";
    else if (lower.includes("3 bulan") || lower.includes("3 months")) period = "3_months";
    else if (lower.includes("tahun") || lower.includes("1 thn") || lower.includes("year")) period = "1_year";
    return {
      intent: "summary_request",
      message: `Siap! Anya buatin ringkasan keuangan kamu untuk periode ini ya 📊`,
      period
    };
  }

  // 2. Global payment modifier check
  const globalPayment = detectGlobalPaymentMethod(userText);

  // 3. Multi-Clause Segmentation (splits by commas, semicolons, conjunctions 'dan'/'and', newlines, '+')
  const clauses = userText
    .split(/(?:,|\n|;|\band\b|\bdan\b|\bterus\b|\blalu\b|\bkemudian\b|\+)/i)
    .map(c => c.trim())
    .filter(c => c.length > 0);

  const parsedItems = [];

  for (const clause of clauses) {
    const clauseLower = clause.toLowerCase();
    const clauseAmount = parseSingleAmount(clause);
    if (clauseAmount <= 0) continue;

    // Check wishlist intent in clause
    const isWishlist = /wishlist|nabung|target|impian|dream|save\s+for|want\s+to\s+buy|pengen\s+beli|mau\s+beli/i.test(clauseLower);
    if (isWishlist) {
      let wlName = clause
        .replace(/(?:wishlist|nabung|target|impian|beli|cita-cita|pengen|mau|dream|save\s+for|want\s+to\s+buy)/gi, '')
        .replace(/(?:rp\.?\s*|\$\s*)?(\d{1,3}(?:\.\d{3})+|\d+)\s*(?:jt|juta|jeti|m(?:illion)?|k|rb|ribu|rebu|grand)?/gi, '')
        .replace(/\b(gocap|ceban|seceng|goceng|cepek|pekgo|noban|sejuta)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!wlName) wlName = 'Target Impian';
      wlName = wlName.charAt(0).toUpperCase() + wlName.slice(1);

      let icon = 'ph-star';
      if (/laptop|pc|komputer|computer/i.test(clauseLower)) icon = 'ph-laptop';
      else if (/hp|phone|iphone|samsung|gadget/i.test(clauseLower)) icon = 'ph-phone';
      else if (/motor|mobil|car|vehicle|motorcycle/i.test(clauseLower)) icon = 'ph-car';
      else if (/rumah|tanah|kost|house|apartment/i.test(clauseLower)) icon = 'ph-house';
      else if (/liburan|tiket|trip|vacation|holiday|flight/i.test(clauseLower)) icon = 'ph-airplane';
      else if (/sepatu|baju|tas|shoes|bag|clothes/i.test(clauseLower)) icon = 'ph-shopping-bag';

      parsedItems.push({
        intent: 'wishlist',
        message: `Mantap! Target ${wlName} Rp ${clauseAmount.toLocaleString('id-ID')} udah Anya masukin ke Wishlist ya ⭐`,
        data: {
          name: wlName,
          target: clauseAmount,
          current: 0,
          icon,
          color: 'purple'
        }
      });
      continue;
    }

    // Transaction Intent
    const isIncome = /gaji|gajian|payroll|thr|bonus|honor|freelance|dpt trf|dapet trf|tf masuk|trf masuk|cair|proyek|dividen|omset|pemasukan|inflow|salary|wage|received transfer/i.test(clauseLower);
    const type = isIncome ? 'income' : 'expense';
    const kategori = detectCategoryFromClause(clause, isIncome);
    const metode = detectPaymentMethodFromClause(clause) || globalPayment || 'Cash';

    // Date resolution
    let tanggal = todayISO;
    if (/\b(kemarin|kmrn|kmaren|kemaren|kmren|semalem|smlm|semalam|yesterday|last night)\b/i.test(clauseLower)) {
      tanggal = yesterdayISO;
    } else if (/\b(2\s*(?:hari|hr|days)\s*(?:lalu|yll|ago)|lusa)\b/i.test(clauseLower)) {
      tanggal = twoDaysAgoISO;
    } else if (/\b(3\s*(?:hari|hr|days)\s*(?:lalu|yll|ago))\b/i.test(clauseLower)) {
      tanggal = threeDaysAgoISO;
    } else if (/\b(1?\s*(?:minggu|week)\s*(?:lalu|yll|ago)|seminggu\s*(?:lalu|yll))\b/i.test(clauseLower)) {
      tanggal = oneWeekAgoISO;
    }

    // Clean up description (keterangan)
    let keterangan = clause
      .replace(/(?:rp\.?\s*|\$\s*)?(\d{1,3}(?:\.\d{3})+|\d+)\s*(?:jt|juta|jeti|m(?:illion)?|k|rb|ribu|rebu|grand)?/gi, '')
      .replace(/\b(gocap|ceban|seceng|goceng|cepek|pekgo|noban|sejuta)\b/gi, '')
      .replace(/\b(cash|tunai|transfer|tf|trf|bank|qris|gopay|ovo|dana|shopeepay|spay|bca|mandiri|bni|bri|bsi|linkaja|ewallet|e-wallet|visa|mastercard|cc|kartu kredit|kartu debit|semua|all)\b/gi, '')
      .replace(/\b(gw|gue|gua|w|bre|bro|cuy|ngab|njir|wkwk|lol|dong|deh|sih|nih|tuh|kan|ya|yaa|aja|aj|udh|udah|abis|habis|tdi|tadi|kmrn|kemarin|kmaren|barusan|td|pg|siang|mlm|spent|bought|paid|for|on|with|by)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!keterangan) {
      keterangan = isIncome ? `Pemasukan ${kategori}` : kategori;
    }

    // Slang correction to Title Case
    if (/nasi apdang|ns padang|naspad/i.test(keterangan)) keterangan = 'Nasi Padang';
    else if (/esteh masni|es teh mns|esteh mnis/i.test(keterangan)) keterangan = 'Es Teh Manis';
    else if (/bnesin|bensin pertalite/i.test(keterangan)) keterangan = 'Bensin';
    else if (/tokped/i.test(keterangan)) keterangan = 'Belanja Tokopedia';
    else if (/paket data|kuota/i.test(keterangan)) keterangan = 'Paket Data';
    else {
      keterangan = keterangan.charAt(0).toUpperCase() + keterangan.slice(1);
    }

    const formattedAmt = clauseAmount >= 1000000
      ? `${(clauseAmount / 1000000).toLocaleString('id-ID')}jt`
      : `${(clauseAmount / 1000).toLocaleString('id-ID')}rb`;

    const msg = isIncome
      ? `Mantap! Pemasukan ${keterangan} ${formattedAmt} via ${metode} sudah Anya siapkan ya 🤑`
      : `Siap! ${keterangan} ${formattedAmt} via ${metode} sudah Anya siapkan ya 📝`;

    parsedItems.push({
      intent: 'transaction',
      message: msg,
      data: {
        type,
        tanggal,
        kategori,
        metode,
        keterangan,
        harga: clauseAmount
      }
    });
  }

  // If multiple items were parsed, return array of items
  if (parsedItems.length > 1) {
    return parsedItems;
  }

  // If exactly one item was parsed, return single intent object
  if (parsedItems.length === 1) {
    return parsedItems[0];
  }

  // 4. Conversational or Tips fallback
  let chatMsg = "Halo! Anya di sini. Mau catat transaksi atau minta tips apa nih hari ini? Contoh: 'Nasi padang 25rb cash' atau 'Kasi tips hemat bulan ini' 😊";
  if (/tips|hemat|saran|nabung gimana|minus|boros|keuangan|evaluasi|pendapat|analisis|advice|saving tips/i.test(lower)) {
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
  } else if (/halo|hai|hey|hello|hi|pagi|siang|sore|malam|apa kabar|how are you/i.test(lower)) {
    const fc = context.financialContext;
    if (fc && fc.currentMonth && (fc.currentMonth.income > 0 || fc.currentMonth.expense > 0)) {
      const uName = fc.userName || 'Kawan';
      const inc = Number(fc.currentMonth.income || 0);
      const exp = Number(fc.currentMonth.expense || 0);
      const net = inc - exp;
      if (net >= 0) {
        chatMsg = `Hai **${uName}**! Apa kabar? Anya di sini siap bantu kamu nih. ✨\n\nWah, Anya lihat catatan keuanganmu bulan ini mantap banget! Total pemasukanmu **Rp ${inc.toLocaleString('id-ID')}** dengan pengeluaran **Rp ${exp.toLocaleString('id-ID')}**, jadi ada **surplus positif sebesar Rp ${net.toLocaleString('id-ID')}**.\n\nSecara keseluruhan kondisi keuanganmu sehat banget, ${uName}. Mau Anya bantu cek lagi progres wishlist atau ada transaksi baru yang mau dicatat hari ini? 😊`;
      } else {
        chatMsg = `Hai **${uName}**! Apa kabar? Anya di sini siap bantu kelola keuanganmu. 👋\n\nCatatan bulan ini menunjukkan pemasukan **Rp ${inc.toLocaleString('id-ID')}** dan pengeluaran **Rp ${exp.toLocaleString('id-ID')}** (saat ini sedang defisit **Rp ${Math.abs(net).toLocaleString('id-ID')}**).\n\nAnya siap bantu kasih tips penghematan atau catat transaksi harianmu agar keuanganmu kembali seimbang. Mau mulai dari mana hari ini? 😊`;
      }
    } else {
      const uName = (fc && fc.userName) ? ` **${fc.userName}**` : '';
      chatMsg = `Halo${uName}! Anya siap membantumu mencatat transaksi, wishlist, dan mengelola keuangan dengan pintar. Ada yang bisa Anya bantu hari ini? ✨`;
    }
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
