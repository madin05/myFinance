// src/components/smartAiInput.js
// Smart AI Input Component for MyFinance Dashboard
// Handles multi-intent natural language processing (Transactions & Wishlists) & financial period summaries.

import { store, formatRupiah } from "../store.js";
import { showToast } from "./notifications.js";
import { openScanReceiptModal } from "./scanReceipt.js";
import { escapeHtml } from "../utils.js";
import { API_URL, apiFetch, getAuthHeaders } from "../services/apiClient.js";

/**
 * Call backend Gemini AI to parse natural language input.
 * Returns parsed intent object or null if API is unreachable.
 */
async function callGeminiParse(text) {
  if (!store.user?.token) return null;
  try {
    const res = await apiFetch(`${API_URL}/ai/parse`, {
      method: "POST",
      headers: getAuthHeaders(store.user.token),
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.intent === 'fallback') return null;
    return json;
  } catch {
    return null;
  }
}

/**
 * Universal Multilingual Amount Parser for Frontend Local Fallback.
 */
function parseLocalSingleAmount(str) {
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
function detectLocalCategory(clause, isIncome = false) {
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
  if (/listrik|electricity|token|pdam|air|water|wifi|indihome|pulsa|kuota|data|paket data|internet|phone bill|tagihan|bill|iuran|sewa|rent|kos|kost|kontrakan|bpjs|insurance|asuransi/i.test(lower)) {
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
function detectLocalPaymentMethod(clause) {
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
function detectLocalGlobalPaymentMethod(fullText) {
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
 * Universal Multilingual Multi-Item Local Fallback Parser for Anya.
 * Handles single & multiple transactions, wishlists, and summaries offline.
 */
export function parseNaturalLanguageMultiLocal(text) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.trim().toLowerCase();
  if (!lower) return null;

  // Date parsing from slang — use Jakarta timezone
  const jakartaStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
  const nowLocal = new Date(jakartaStr);
  const fmtDate = (d) => {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  };
  const localDaysAgo = (n) => { const d = new Date(nowLocal); d.setDate(d.getDate() - n); return fmtDate(d); };
  const todayStr = fmtDate(nowLocal);

  // 1. Check summary request intent
  if (
    lower.includes("summary") ||
    lower.includes("ringkas") ||
    lower.includes("rangkum") ||
    lower.includes("keuangan") ||
    lower.includes("analisis") ||
    lower.includes("report")
  ) {
    let period = "1_month";
    if (lower.includes("minggu") || lower.includes("7 hari") || lower.includes("week")) period = "1_week";
    else if (lower.includes("3 bulan") || lower.includes("3 months")) period = "3_months";
    else if (lower.includes("tahun") || lower.includes("1 thn") || lower.includes("year")) period = "1_year";
    return {
      intent: "summary_request",
      message: "Siap! Anya buatin ringkasan analisis keuangan kamu ya 📊",
      period
    };
  }

  // 2. Detect global payment method
  const globalPayment = detectLocalGlobalPaymentMethod(text);

  // 3. Multi-Clause Segmentation
  const clauses = text
    .split(/(?:,|\n|;|\band\b|\bdan\b|\bterus\b|\blalu\b|\bkemudian\b|\+)/i)
    .map(c => c.trim())
    .filter(c => c.length > 0);

  const parsedItems = [];

  for (const clause of clauses) {
    const clauseLower = clause.toLowerCase();
    const amount = parseLocalSingleAmount(clause);
    if (amount <= 0) continue;

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
        message: `Mantap! Target "${wlName}" sudah Anya deteksi buat Wishlist ⭐`,
        data: {
          name: wlName,
          target: amount,
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
    const kategori = detectLocalCategory(clause, isIncome);
    const metode = detectLocalPaymentMethod(clause) || globalPayment || 'Cash';

    // Date resolution
    let tanggal = todayStr;
    if (/\b(kemarin|kmrn|kmaren|kemaren|kmren|semalem|smlm|semalam|yesterday|last night)\b/i.test(clauseLower)) {
      tanggal = localDaysAgo(1);
    } else if (/\b(2\s*(?:hari|hr|days)\s*(?:lalu|yll|ago)|lusa)\b/i.test(clauseLower)) {
      tanggal = localDaysAgo(2);
    } else if (/\b(3\s*(?:hari|hr|days)\s*(?:lalu|yll|ago))\b/i.test(clauseLower)) {
      tanggal = localDaysAgo(3);
    } else if (/\b(1?\s*(?:minggu|week)\s*(?:lalu|yll|ago)|seminggu\s*(?:lalu|yll))\b/i.test(clauseLower)) {
      tanggal = localDaysAgo(7);
    }

    // Clean up description
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

    const formattedAmt = amount >= 1000000
      ? `${(amount / 1000000).toLocaleString('id-ID')}jt`
      : `${(amount / 1000).toLocaleString('id-ID')}rb`;

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
        harga: amount
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

  return null;
}

/**
 * Parse natural language text into a structured transaction object (Fallback backwards-compatibility)
 */
export function parseNaturalLanguageTx(text) {
  const result = parseNaturalLanguageMultiLocal(text);
  if (Array.isArray(result)) return result[0]?.data || null;
  if (result && result.intent === 'transaction') return result.data;
  return null;
}

/**
 * Parse natural language text into a structured Wishlist object (Fallback backwards-compatibility)
 */
export function parseNaturalLanguageWishlist(text) {
  const result = parseNaturalLanguageMultiLocal(text);
  if (Array.isArray(result)) {
    const wl = result.find(r => r.intent === 'wishlist');
    return wl?.data || null;
  }
  if (result && result.intent === 'wishlist') return result.data;
  return null;
}

/**
 * Generate dynamic financial summary report based on current user data & timeframe
 */
export function generateFinancialSummary(periodKey = "1_month") {
  const txs = store.transactions || [];

  const now = new Date();
  let startDate = new Date();
  let periodLabel = "Bulan Ini";

  if (periodKey === "1_week") {
    startDate.setDate(now.getDate() - 7);
    periodLabel = "7 Hari Terakhir";
  } else if (periodKey === "3_months") {
    startDate.setMonth(now.getMonth() - 3);
    periodLabel = "3 Bulan Terakhir";
  } else if (periodKey === "1_year") {
    startDate.setFullYear(now.getFullYear() - 1);
    periodLabel = "1 Tahun Terakhir";
  } else {
    // default 1_month
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    periodLabel = "Bulan Ini";
  }

  // Filter transactions
  let periodIncome = 0;
  let periodExpense = 0;
  const expenseByCat = {};
  let count = 0;

  txs.forEach((t) => {
    const d = new Date(t.tanggal);
    if (d >= startDate && d <= now) {
      count++;
      const amt = Math.abs(t.harga || t.amount || 0);
      if (t.type === "income") {
        periodIncome += amt;
      } else {
        periodExpense += amt;
        expenseByCat[t.kategori] = (expenseByCat[t.kategori] || 0) + amt;
      }
    }
  });

  let topCat = null;
  let topAmount = 0;
  Object.entries(expenseByCat).forEach(([cat, amt]) => {
    if (amt > topAmount) {
      topAmount = amt;
      topCat = cat;
    }
  });

  const netBalance = periodIncome - periodExpense;
  const isHealthy = netBalance >= 0;

  return `
    <div style="font-size: 0.85rem; line-height: 1.5; color: var(--text-main);">
      <!-- Header with Period Selector Tabs -->
      <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.75rem; border-bottom: 1px dashed var(--border); padding-bottom: 0.6rem;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span style="font-weight: 700; color: var(--primary); display: flex; align-items: center; gap: 6px;">
            <i class="ph-bold ph-chart-pie-slice"></i> Analisis Keuangan (${periodLabel})
          </span>
          <span class="badge-soft ${isHealthy ? 'badge-green' : 'badge-red'}" style="font-size: 0.75rem;">
            ${isHealthy ? 'Sehat (Surplus)' : 'Warning (Defisit)'}
          </span>
        </div>

        <!-- Period Tabs -->
        <div style="display: flex; gap: 4px; background: var(--bg-color); padding: 3px; border-radius: var(--radius-md); border: 1px solid var(--border);">
          <button type="button" class="ai-period-tab ${periodKey === '1_week' ? 'active' : ''}" data-period="1_week" style="flex:1; border:none; background:${periodKey === '1_week' ? 'var(--card-bg)' : 'transparent'}; color:var(--text-main); font-weight:${periodKey === '1_week' ? '700' : '500'}; font-size:0.72rem; padding:3px 6px; border-radius:var(--radius-sm); cursor:pointer;">1 Mgg</button>
          <button type="button" class="ai-period-tab ${periodKey === '1_month' ? 'active' : ''}" data-period="1_month" style="flex:1; border:none; background:${periodKey === '1_month' ? 'var(--card-bg)' : 'transparent'}; color:var(--text-main); font-weight:${periodKey === '1_month' ? '700' : '500'}; font-size:0.72rem; padding:3px 6px; border-radius:var(--radius-sm); cursor:pointer;">1 Bln</button>
          <button type="button" class="ai-period-tab ${periodKey === '3_months' ? 'active' : ''}" data-period="3_months" style="flex:1; border:none; background:${periodKey === '3_months' ? 'var(--card-bg)' : 'transparent'}; color:var(--text-main); font-weight:${periodKey === '3_months' ? '700' : '500'}; font-size:0.72rem; padding:3px 6px; border-radius:var(--radius-sm); cursor:pointer;">3 Bln</button>
          <button type="button" class="ai-period-tab ${periodKey === '1_year' ? 'active' : ''}" data-period="1_year" style="flex:1; border:none; background:${periodKey === '1_year' ? 'var(--card-bg)' : 'transparent'}; color:var(--text-main); font-weight:${periodKey === '1_year' ? '700' : '500'}; font-size:0.72rem; padding:3px 6px; border-radius:var(--radius-sm); cursor:pointer;">1 Thn</button>
        </div>
      </div>

      <!-- Financial Metrics Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.6rem;">
        <div style="background: var(--bg-color); padding: 0.5rem 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border);">
          <span style="font-size: 0.72rem; color: var(--text-muted); display: block;">Pemasukan</span>
          <strong style="color: var(--green); font-size: 0.9rem;">+ ${formatRupiah(periodIncome)}</strong>
        </div>
        <div style="background: var(--bg-color); padding: 0.5rem 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border);">
          <span style="font-size: 0.72rem; color: var(--text-muted); display: block;">Pengeluaran</span>
          <strong style="color: var(--red); font-size: 0.9rem;">- ${formatRupiah(periodExpense)}</strong>
        </div>
      </div>

      <p style="margin: 0 0 0.4rem 0; font-size: 0.8rem; color: var(--text-muted);">
        ${topCat ? `📌 <strong>Pengeluaran terbesar</strong>: <span style="color:var(--text-main); font-weight:600;">${topCat}</span> (${formatRupiah(topAmount)})` : '📌 Belum ada transaksi pengeluaran dalam periode ini.'}
      </p>

      <div id="ai-insights-box" style="margin-top: 0.5rem; background: var(--bg-color); padding: 0.6rem 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border);">
        <p style="margin: 0; font-size: 0.8rem; color: var(--text-muted);">
          💡 <strong>Saran AI</strong>: ${isHealthy ? `Keuanganmu positif <span style="color:var(--green); font-weight:600;">${formatRupiah(netBalance)}</span>. Bagus! Alokasikan 20% dari surplus ke target Wishlist milikmu.` : `Pengeluaran melebihi pemasukan dalam ${periodLabel}! Tekan pengeluaran di kategori ${topCat || 'terbesar'} agar arus kas kembali sehat.`}
        </p>
      </div>
    </div>
  `;
}

/**
 * Render the Smart AI Input Card HTML
 */
export function getSmartAiInputHtml() {
  return `
    <div class="ai-banner-card">
      <div class="ai-banner-inner">
        <div class="ai-banner-illustration">
          <img class="ai-illustration-light" src="/assets/ai-light.svg" alt="AI Illustration" style="width: 100%; height: 100%; object-fit: contain;" />
          <img class="ai-illustration-dark" src="/assets/ai-dark.svg" alt="AI Illustration" style="width: 100%; height: 100%; object-fit: contain;" />
        </div>
        <div class="ai-banner-content">
          <h3 class="ai-banner-title">Yuk cobain fitur kami</h3>
          <p class="ai-banner-desc">Tambah transaksi, wishlist, analisis keuangan kamu dan tips untuk kamu dengan AI</p>
          <button type="button" class="ai-banner-btn" id="btn-start-ai-chat">
            <span>Mulai percakapan</span>
            <svg
              class="ai-banner-btn-icon"
              viewBox="0 0 16 19"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M7 18C7 18.5523 7.44772 19 8 19C8.55228 19 9 18.5523 9 18H7ZM8.70711 0.292893C8.31658 -0.0976311 7.68342 -0.0976311 7.29289 0.292893L0.928932 6.65685C0.538408 7.04738 0.538408 7.68054 0.928932 8.07107C1.31946 8.46159 1.95262 8.46159 2.34315 8.07107L8 2.41421L13.6569 8.07107C14.0474 8.46159 14.6805 8.46159 15.0711 8.07107C15.4616 7.68054 15.4616 7.04738 15.0711 6.65685L8.70711 0.292893ZM9 18L9 1H7L7 18H9Z"
              ></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Bind interactive events for the Smart AI Input Banner Component
 */
export function initSmartAiInputEvents(onDataSaved) {
  const startBtn = document.getElementById("btn-start-ai-chat");
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      import("../router.js").then((module) => {
        module.navigateTo("/ai");
      });
    });
  }
}
