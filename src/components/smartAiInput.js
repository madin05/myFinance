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
 * Parse natural language text into a structured transaction object (Fallback)
 */
export function parseNaturalLanguageTx(text) {
  if (!text || typeof text !== "string") return null;

  const lower = text.trim().toLowerCase();
  if (!lower) return null;

  // 1. Detect Nominal / Amount
  let amount = 0;
  const jtMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:jt|juta)/i);
  const kMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:k|rb|ribu)/i);
  const rawNumMatch = lower.match(/(?:rp\.?\s*)?(\d{1,3}(?:\.\d{3})+|\d+)/i);

  if (jtMatch) {
    amount = parseFloat(jtMatch[1].replace(',', '.')) * 1000000;
  } else if (kMatch) {
    amount = parseFloat(kMatch[1].replace(',', '.')) * 1000;
  } else if (rawNumMatch) {
    const cleanStr = rawNumMatch[1].replace(/\./g, "");
    amount = parseFloat(cleanStr);
  }

  if (isNaN(amount) || amount <= 0) return null;

  // 2. Detect Type (income vs expense)
  const incomeKeywords = ["gaji", "bonus", "dividen", "dapat", "terima", "inflow", "pemasukan", "hadiah", "jual", "profit", "omset"];
  const isIncome = incomeKeywords.some((kw) => lower.includes(kw));
  const type = isIncome ? "income" : "expense";

  // 3. Infer Category
  let kategori = isIncome ? "Gaji & Pendapatan" : "Lain-lain";
  if (lower.includes("bensin") || lower.includes("pertamax") || lower.includes("pertalite") || lower.includes("parkir") || lower.includes("gojek") || lower.includes("grab") || lower.includes("angkot") || lower.includes("tol") || lower.includes("transport")) {
    kategori = "Transportasi";
  } else if (lower.includes("makan") || lower.includes("minum") || lower.includes("kopi") || lower.includes("bakso") || lower.includes("nasi") || lower.includes("resto") || lower.includes("warung") || lower.includes("food")) {
    kategori = "Makanan & Minuman";
  } else if (lower.includes("gaji") || lower.includes("payroll") || lower.includes("thr") || lower.includes("bonus")) {
    kategori = "Gaji & Pendapatan";
  } else if (lower.includes("belanja") || lower.includes("baju") || lower.includes("sepatu") || lower.includes("tokopedia") || lower.includes("shopee") || lower.includes("mall")) {
    kategori = "Belanja";
  } else if (lower.includes("listrik") || lower.includes("air") || lower.includes("wifi") || lower.includes("pulsa") || lower.includes("tagihan") || lower.includes("token")) {
    kategori = "Tagihan & Tagihan";
  } else if (lower.includes("investasi") || lower.includes("saham") || lower.includes("crypto") || lower.includes("reksadana")) {
    kategori = "Investasi & Tabungan";
  } else if (lower.includes("obat") || lower.includes("dokter") || lower.includes("sehat") || lower.includes("rs") || lower.includes("gym")) {
    kategori = "Kesehatan";
  } else if (lower.includes("kursus") || lower.includes("buku") || lower.includes("udemy") || lower.includes("kuliah") || lower.includes("sekolah")) {
    kategori = "Pendidikan";
  }

  // 4. Infer Payment Method
  let metode = "Cash";
  if (lower.includes("transfer") || lower.includes("bank") || lower.includes("bca") || lower.includes("mandiri") || lower.includes("bni") || lower.includes("bri")) {
    metode = "Transfer Bank";
  } else if (lower.includes("gopay") || lower.includes("ovo") || lower.includes("dana") || lower.includes("shopeepay") || lower.includes("spay") || lower.includes("qris") || lower.includes("ewallet")) {
    metode = "E-Wallet";
  } else if (lower.includes("kartu") || lower.includes("kredit") || lower.includes("debit")) {
    metode = "Kartu Kredit/Debit";
  }

  // 5. Clean up description
  let keterangan = text
    .replace(/(?:rp\.?\s*)?(\d{1,3}(?:\.\d{3})+|\d+)\s*(?:jt|juta|k|rb|ribu)?/gi, "")
    .replace(/\b(cash|tunai|transfer|bank|qris|gopay|ovo|dana|shopeepay|spay|bca|mandiri)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!keterangan) {
    keterangan = isIncome ? `Pemasukan ${kategori}` : `Pengeluaran ${kategori}`;
  }

  keterangan = keterangan.charAt(0).toUpperCase() + keterangan.slice(1);
  const todayStr = new Date().toISOString().split("T")[0];

  return {
    tanggal: todayStr,
    kategori,
    metode,
    keterangan,
    harga: amount,
    type,
  };
}

/**
 * Parse natural language text into a structured Wishlist object (Fallback)
 */
export function parseNaturalLanguageWishlist(text) {
  if (!text || typeof text !== "string") return null;

  const lower = text.trim().toLowerCase();
  const wishlistKeywords = ["wishlist", "nabung", "target", "impian", "beli", "cita-cita", "save"];
  const isWishlist = wishlistKeywords.some((kw) => lower.includes(kw));
  if (!isWishlist) return null;

  let amount = 0;
  const jtMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:jt|juta)/i);
  const kMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*(?:k|rb|ribu)/i);
  const rawNumMatch = lower.match(/(?:rp\.?\s*)?(\d{1,3}(?:\.\d{3})+|\d+)/i);

  if (jtMatch) {
    amount = parseFloat(jtMatch[1].replace(',', '.')) * 1000000;
  } else if (kMatch) {
    amount = parseFloat(kMatch[1].replace(',', '.')) * 1000;
  } else if (rawNumMatch) {
    const cleanStr = rawNumMatch[1].replace(/\./g, "");
    amount = parseFloat(cleanStr);
  }

  if (isNaN(amount) || amount <= 0) return null;

  let name = text
    .replace(/(?:wishlist|nabung|target|impian|beli|cita-cita|pengen|mau)/gi, "")
    .replace(/(?:rp\.?\s*)?(\d{1,3}(?:\.\d{3})+|\d+)\s*(?:jt|juta|k|rb|ribu)?/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!name) name = "Target Impian";
  name = name.charAt(0).toUpperCase() + name.slice(1);

  let icon = "ph-star";
  if (lower.includes("laptop") || lower.includes("pc") || lower.includes("komputer")) icon = "ph-laptop";
  else if (lower.includes("hp") || lower.includes("phone") || lower.includes("iphone")) icon = "ph-phone";
  else if (lower.includes("motor") || lower.includes("mobil")) icon = "ph-car";
  else if (lower.includes("rumah") || lower.includes("tanah")) icon = "ph-house";
  else if (lower.includes("liburan") || lower.includes("tiket")) icon = "ph-airplane";

  return {
    name,
    target: amount,
    current: 0,
    icon,
    color: "purple",
  };
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
        ${topCat ? `📌 **Pengeluaran terbesar**: <span style="color:var(--text-main); font-weight:600;">${topCat}</span> (${formatRupiah(topAmount)})` : '📌 Belum ada transaksi pengeluaran dalam periode ini.'}
      </p>

      <div id="ai-insights-box" style="margin-top: 0.5rem; background: var(--bg-color); padding: 0.6rem 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border);">
        <p style="margin: 0; font-size: 0.8rem; color: var(--text-muted);">
          💡 **Saran AI**: ${isHealthy ? `Keuanganmu positif Rp ${formatRupiah(netBalance)}. Bagus! Alokasikan 20% dari surplus ke target Wishlist milikmu.` : `Pengeluaran melebihi pemasukan dalam ${periodLabel}! Tekan pengeluaran di kategori ${topCat || 'terbesar'} agar arus kas kembali sehat.`}
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
          <p class="ai-banner-desc">Tambah transaksi, wishlist, analisis keuangan kamu dan tips untuk kamu dengan AI-nan</p>
          <button class="btn btn-primary ai-banner-btn" id="btn-start-ai-chat">
            Mulai percakapan <i class="ph-bold ph-arrow-right"></i>
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
