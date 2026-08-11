// src/components/smartAiInput.js
// Smart AI Input Component for MyFinance Dashboard
// Handles quick natural language transaction logging & financial summary inquiries.

import { store, formatRupiah } from "../store.js";
import { showToast } from "./notifications.js";
import { openScanReceiptModal } from "./scanReceipt.js";
import { escapeHtml } from "../utils.js";

/**
 * Parse natural language text into a structured transaction object
 */
export function parseNaturalLanguageTx(text) {
  if (!text || typeof text !== "string") return null;

  const lower = text.trim().toLowerCase();
  if (!lower) return null;

  // 1. Detect Nominal / Amount
  let amount = 0;
  // Match patterns like 50k, 50rb, 50.000, 5jt, 5.000.000, 50000
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

  // Capitalize first letter
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
 * Generate a dynamic financial summary report based on current user data
 */
export function generateFinancialSummary() {
  const stats = store.getStats();
  const txs = store.transactions || [];
  const budgets = store.budgets || [];
  const savings = store.savings || [];

  const now = new Date();
  const monthName = now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  // Filter current month transactions
  const currentMonthTxs = txs.filter((t) => {
    const d = new Date(t.tanggal);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  // Calculate top spending category
  const expenseByCat = {};
  currentMonthTxs.forEach((t) => {
    if (t.type === "expense") {
      expenseByCat[t.kategori] = (expenseByCat[t.kategori] || 0) + Math.abs(t.harga);
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

  const netBalance = stats.income - stats.expense;
  const isHealthy = netBalance >= 0;

  return `
    <div style="font-size: 0.85rem; line-height: 1.5; color: var(--text-main);">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.6rem; border-bottom: 1px dashed var(--border); padding-bottom: 0.5rem;">
        <span style="font-weight: 700; color: var(--primary); display: flex; align-items: center; gap: 6px;">
          <i class="ph-bold ph-chart-pie-slice"></i> Ringkasan Keuangan (${monthName})
        </span>
        <span class="badge-soft ${isHealthy ? 'badge-green' : 'badge-red'}" style="font-size: 0.7rem;">
          ${isHealthy ? 'Sehat (Surplus)' : 'Warning (Defisit)'}
        </span>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.6rem;">
        <div style="background: var(--bg-color); padding: 0.5rem 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border);">
          <span style="font-size: 0.72rem; color: var(--text-muted); display: block;">Pemasukan</span>
          <strong style="color: var(--green); font-size: 0.9rem;">+ ${formatRupiah(stats.income)}</strong>
        </div>
        <div style="background: var(--bg-color); padding: 0.5rem 0.75rem; border-radius: var(--radius-md); border: 1px solid var(--border);">
          <span style="font-size: 0.72rem; color: var(--text-muted); display: block;">Pengeluaran</span>
          <strong style="color: var(--red); font-size: 0.9rem;">- ${formatRupiah(stats.expense)}</strong>
        </div>
      </div>
      <p style="margin: 0 0 0.4rem 0; font-size: 0.8rem; color: var(--text-muted);">
        ${topCat ? `📌 **Pengeluaran terbesar**: <span style="color:var(--text-main); font-weight:600;">${topCat}</span> (${formatRupiah(topAmount)})` : '📌 Belum ada transaksi pengeluaran bulan ini.'}
      </p>
      <p style="margin: 0; font-size: 0.8rem; color: var(--text-muted);">
        💡 **Saran AI**: ${isHealthy ? `Keuanganmu positif Rp ${formatRupiah(netBalance)}. Alokasikan sebagian ke target Wishlist!` : `Pengeluaran melebihi pemasukan bulan ini! Evaluasi kategori ${topCat || 'terbesar'} untuk menghemat.`}
      </p>
    </div>
  `;
}

/**
 * Render the Smart AI Input Card HTML
 */
export function getSmartAiInputHtml() {
  return `
    <div class="smart-ai-card" style="
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius-xl);
      padding: 1.15rem 1.25rem;
      margin-top: 1.25rem;
      box-shadow: 0 2px 10px -2px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    ">
      <!-- Header Mini -->
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <img src="/assets/mascot.png" alt="MyFinance AI Mascot" style="width: 32px; height: 32px; border-radius: 8px; object-fit: contain; background: var(--primary-light); padding: 2px;" />
          <h4 style="margin: 0; font-size: 0.925rem; font-weight: 700; color: var(--text-main);">Catat & Tanya AI</h4>
        </div>
        <span style="background: var(--primary-light); color: var(--primary); font-size: 0.7rem; font-weight: 700; padding: 3px 9px; border-radius: 99px; display: inline-flex; align-items: center; gap: 4px;">
          <i class="ph-bold ph-lightning" style="font-size: 0.75rem;"></i> Gemini 2.5
        </span>
      </div>

      <!-- Input Area & Action Buttons -->
      <div style="position: relative; display: flex; align-items: center; gap: 8px;">
        <input 
          type="text" 
          id="smart-ai-input-field" 
          class="form-control" 
          placeholder="Contoh: 'Bensin 50rb cash' atau 'Ringkas keuangan bulan ini'" 
          style="
            flex: 1; 
            padding-right: 85px; 
            font-size: 0.825rem; 
            height: 42px;
            border-radius: var(--radius-md);
          "
        />
        <div style="position: absolute; right: 6px; display: flex; align-items: center; gap: 4px;">
          <button 
            type="button" 
            id="btn-smart-ai-scan" 
            title="Scan Struk / Upload Gambar" 
            style="
              background: transparent; 
              border: none; 
              color: var(--text-muted); 
              width: 32px; 
              height: 32px; 
              border-radius: 6px; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              cursor: pointer;
              transition: all 0.15s ease;
            "
            onmouseenter="this.style.color='var(--primary)'; this.style.background='var(--bg-color)';"
            onmouseleave="this.style.color='var(--text-muted)'; this.style.background='transparent';"
          >
            <i class="ph ph-camera" style="font-size: 1.15rem;"></i>
          </button>
          <button 
            type="button" 
            id="btn-smart-ai-submit" 
            title="Proses Input" 
            style="
              background: var(--primary); 
              border: none; 
              color: white; 
              width: 32px; 
              height: 32px; 
              border-radius: 6px; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              cursor: pointer;
              transition: transform 0.15s ease, opacity 0.15s ease;
            "
            onmouseenter="this.style.opacity='0.9';"
            onmouseleave="this.style.opacity='1';"
          >
            <i class="ph-bold ph-paper-plane-right" style="font-size: 1rem;"></i>
          </button>
        </div>
      </div>

      <!-- Quick Chips -->
      <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
        <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 500; margin-right: 2px;">Cepat:</span>
        <button type="button" class="smart-ai-chip" data-text="Bensin 50k cash" style="
          background: var(--bg-color); 
          border: 1px solid var(--border); 
          color: var(--text-main); 
          font-size: 0.72rem; 
          padding: 3px 8px; 
          border-radius: 99px; 
          cursor: pointer; 
          transition: all 0.15s ease;
        " onmouseenter="this.style.borderColor='var(--primary)'; this.style.color='var(--primary)';" onmouseleave="this.style.borderColor='var(--border)'; this.style.color='var(--text-main)';">
          ⛽ Bensin 50k cash
        </button>
        <button type="button" class="smart-ai-chip" data-text="Makan siang 25k" style="
          background: var(--bg-color); 
          border: 1px solid var(--border); 
          color: var(--text-main); 
          font-size: 0.72rem; 
          padding: 3px 8px; 
          border-radius: 99px; 
          cursor: pointer; 
          transition: all 0.15s ease;
        " onmouseenter="this.style.borderColor='var(--primary)'; this.style.color='var(--primary)';" onmouseleave="this.style.borderColor='var(--border)'; this.style.color='var(--text-main)';">
          🍔 Makan 25k
        </button>
        <button type="button" class="smart-ai-chip" data-text="Ringkas keuangan bulan ini" style="
          background: var(--bg-color); 
          border: 1px solid var(--border); 
          color: var(--text-main); 
          font-size: 0.72rem; 
          padding: 3px 8px; 
          border-radius: 99px; 
          cursor: pointer; 
          transition: all 0.15s ease;
        " onmouseenter="this.style.borderColor='var(--primary)'; this.style.color='var(--primary)';" onmouseleave="this.style.borderColor='var(--border)'; this.style.color='var(--text-main)';">
          📊 Summary Keuangan
        </button>
      </div>

      <!-- Preview / AI Output Container -->
      <div id="smart-ai-output-container" style="display: none; margin-top: 0.25rem;"></div>
    </div>
  `;
}

/**
 * Bind interactive events for the Smart AI Input Component
 */
export function initSmartAiInputEvents(onTransactionSaved) {
  const inputEl = document.getElementById("smart-ai-input-field");
  const submitBtn = document.getElementById("btn-smart-ai-submit");
  const scanBtn = document.getElementById("btn-smart-ai-scan");
  const outputContainer = document.getElementById("smart-ai-output-container");
  const chips = document.querySelectorAll(".smart-ai-chip");

  if (!inputEl || !submitBtn || !outputContainer) return;

  // 1. Scan Receipt Button Handler
  if (scanBtn) {
    scanBtn.addEventListener("click", () => {
      openScanReceiptModal();
    });
  }

  let currentParsedTx = null;

  // Process input text
  const processInput = (rawText) => {
    const text = (rawText || inputEl.value).trim();
    if (!text) {
      showToast("Peringatan", "Ketik transaksi atau pertanyaan untuk AI.", "warning");
      return;
    }

    const lower = text.toLowerCase();

    // Check if query is for summary/financial insight
    if (lower.includes("summary") || lower.includes("ringkas") || lower.includes("rangkum") || lower.includes("keuangan") || lower.includes("analisis") || lower.includes("pengeluaran") || lower.includes("pemasukan")) {
      currentParsedTx = null;
      outputContainer.style.display = "block";
      outputContainer.innerHTML = `
        <div style="background: var(--bg-color); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 0.85rem 1rem; position: relative;">
          <button type="button" id="btn-close-ai-output" style="position: absolute; top: 8px; right: 10px; background: transparent; border: none; color: var(--text-muted); cursor: pointer; font-size: 1rem;">
            <i class="ph ph-x"></i>
          </button>
          ${generateFinancialSummary()}
        </div>
      `;

      const closeBtn = document.getElementById("btn-close-ai-output");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => {
          outputContainer.style.display = "none";
          outputContainer.innerHTML = "";
        });
      }
      return;
    }

    // Try parsing as transaction
    const parsed = parseNaturalLanguageTx(text);
    if (!parsed) {
      outputContainer.style.display = "block";
      outputContainer.innerHTML = `
        <div style="background: var(--bg-color); border: 1px dashed var(--border); border-radius: var(--radius-lg); padding: 0.75rem 1rem; color: var(--text-muted); font-size: 0.8rem; display: flex; align-items: center; justify-content: space-between;">
          <span>💡 Tidak dapat mengenali nominal. Coba: <em>"Bensin 50rb cash"</em> atau klik chip di atas.</span>
          <button type="button" id="btn-close-ai-output" style="background: transparent; border: none; color: var(--text-muted); cursor: pointer;"><i class="ph ph-x"></i></button>
        </div>
      `;
      const closeBtn = document.getElementById("btn-close-ai-output");
      if (closeBtn) {
        closeBtn.addEventListener("click", () => {
          outputContainer.style.display = "none";
          outputContainer.innerHTML = "";
        });
      }
      return;
    }

    currentParsedTx = parsed;
    const isIncome = parsed.type === "income";
    const badgeClass = isIncome ? "badge-green" : "badge-red";
    const sign = isIncome ? "+" : "-";

    outputContainer.style.display = "block";
    outputContainer.innerHTML = `
      <div style="
        background: var(--bg-color); 
        border: 1px solid var(--border); 
        border-radius: var(--radius-lg); 
        padding: 0.75rem 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      ">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="badge-soft ${badgeClass}" style="font-size: 0.72rem;">
              ${isIncome ? "📈 Pemasukan" : "📉 Pengeluaran"}
            </span>
            <span style="font-size: 0.78rem; font-weight: 600; color: var(--text-main);">${escapeHtml(parsed.kategori)}</span>
          </div>
          <strong style="font-size: 0.95rem; color: ${isIncome ? 'var(--green)' : 'var(--red)'};">
            ${sign} ${formatRupiah(parsed.harga)}
          </strong>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.78rem; color: var(--text-muted);">
          <span>Ket: <strong style="color: var(--text-main);">${escapeHtml(parsed.keterangan)}</strong> (${escapeHtml(parsed.metode)})</span>
          <button 
            type="button" 
            id="btn-save-ai-tx" 
            class="btn btn-primary" 
            style="padding: 0.35rem 0.75rem; font-size: 0.75rem; border-radius: var(--radius-md); display: inline-flex; align-items: center; gap: 4px;"
          >
            <i class="ph-bold ph-plus"></i> Simpan Transaksi
          </button>
        </div>
      </div>
    `;

    const saveBtn = document.getElementById("btn-save-ai-tx");
    if (saveBtn) {
      saveBtn.addEventListener("click", async () => {
        if (!currentParsedTx) return;
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<i class="ph ph-spinner spin"></i> Menyimpan...`;

        try {
          await store.addTransaction(currentParsedTx);
          showToast("Berhasil!", `Transaksi "${currentParsedTx.keterangan}" (${formatRupiah(currentParsedTx.harga)}) tersimpan.`, "success");
          
          inputEl.value = "";
          outputContainer.style.display = "none";
          outputContainer.innerHTML = "";
          currentParsedTx = null;

          if (typeof onTransactionSaved === "function") {
            onTransactionSaved();
          }
        } catch (err) {
          showToast("Gagal", err.message || "Gagal menyimpan transaksi.", "error");
          saveBtn.disabled = false;
          saveBtn.innerHTML = `<i class="ph-bold ph-plus"></i> Simpan Transaksi`;
        }
      });
    }
  };

  // Submit button click
  submitBtn.addEventListener("click", () => processInput());

  // Enter key press in input
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      processInput();
    }
  });

  // Quick Chips click
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const text = chip.getAttribute("data-text");
      if (text) {
        inputEl.value = text;
        processInput(text);
      }
    });
  });
}
