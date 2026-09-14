// src/pages/ai/aiRenderers.js
// Message UI Renderers, Markdown Parsers, and Action Cards for AI Assistant (Anya)

import { formatRupiah } from "../../store.js";
import { escapeHtml } from "../../utils.js";

/**
 * Format markdown response text into clean styled HTML
 */
export function formatResponseMarkdown(text) {
  if (!text) return "";
  let formatted = escapeHtml(text.trim());

  // Bold **text**
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Italic *text*
  formatted = formatted.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // Format inline or newline numbered items (e.g., "1. ", "2. ") with clean spacing and bold numbers
  formatted = formatted.replace(/(?:\s+)(\d+)[\.\)]\s+/g, "<br/><br/><strong>$1.</strong> ");
  formatted = formatted.replace(/^(?:\s*)(\d+)[\.\)]\s+/gm, "<strong>$1.</strong> ");

  // Bullet lists starting with *, -, or •
  formatted = formatted.replace(
    /(?:^|\n)[*•\-]\s+(.*?)(?=\n|$)/g,
    "<br/>• $1",
  );

  // Paragraph breaks
  formatted = formatted.replace(/\n\n/g, "<br/><br/>");
  formatted = formatted.replace(/\n/g, "<br/>");

  // Remove trailing/leading excessive breaks
  formatted = formatted.replace(/^(<br\s*\/?>)+/gi, "");

  return formatted;
}

/**
 * Format time string for message bubbles
 */
export function formatTimeDisplay(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

/**
 * Render structured Transaction card inside chat message
 */
export function renderTransactionCardInChat(tx, saved = false, itemIndex = null) {
  const isIncome = tx.type === "income";
  const badgeClass = isIncome ? "badge-green" : "badge-red";
  const amountClass = isIncome ? "income" : "expense";
  const sign = isIncome ? "+" : "-";
  const idxAttr = itemIndex !== null ? `data-item-idx="${itemIndex}"` : "";

  return `
    <div class="ai-action-card" ${idxAttr}>
      <div class="ai-action-card-top">
        <span class="badge-soft ${badgeClass} ai-action-card-badge">
          ${isIncome ? "Pemasukan" : "Pengeluaran"}
        </span>
        <strong class="ai-action-card-amount ${amountClass}">
          ${sign} ${formatRupiah(tx.harga)}
        </strong>
      </div>
      <h4 class="ai-action-card-title">${escapeHtml(tx.kategori)}</h4>
      <div class="ai-action-card-details">
        <div class="ai-card-detail-line">
          <i class="ph ph-credit-card"></i>
          <span>${escapeHtml(tx.metode || "Cash")}</span>
          ${tx.keterangan ? `<span class="ai-card-dot">·</span><span>${escapeHtml(tx.keterangan)}</span>` : ""}
        </div>
        ${tx.tanggal ? `
        <div class="ai-card-detail-line">
          <i class="ph ph-calendar"></i>
          <span>${tx.tanggal}</span>
        </div>` : ""}
      </div>
      <div class="ai-action-card-footer">
        <button type="button" class="btn btn-primary ai-action-card-btn btn-save-chat-tx" data-tx='${JSON.stringify(tx).replace(/'/g, "&apos;")}' ${idxAttr} ${saved ? "disabled" : ""}>
          ${saved ? `<i class="ph ph-check"></i> Tersimpan` : `<i class="ph-bold ph-plus"></i> Simpan Transaksi`}
        </button>
      </div>
    </div>
  `;
}

/**
 * Render structured Wishlist card inside chat message
 */
export function renderWishlistCardInChat(wishlist, saved = false, itemIndex = null) {
  const idxAttr = itemIndex !== null ? `data-item-idx="${itemIndex}"` : "";
  return `
    <div class="ai-action-card" ${idxAttr}>
      <div class="ai-action-card-top">
        <span class="badge-soft badge-purple ai-action-card-badge">⭐ Target Wishlist</span>
        <strong class="ai-action-card-amount purple">${formatRupiah(wishlist.target)}</strong>
      </div>
      <h4 class="ai-action-card-title">${escapeHtml(wishlist.name)}</h4>
      <div class="ai-action-card-footer">
        <button type="button" class="btn btn-primary ai-action-card-btn btn-save-chat-wishlist" data-wishlist='${JSON.stringify(wishlist).replace(/'/g, "&apos;")}' ${idxAttr} ${saved ? "disabled" : ""}>
          ${saved ? `<i class="ph ph-check"></i> Tersimpan` : `<i class="ph-bold ph-plus"></i> Simpan ke Wishlist`}
        </button>
      </div>
    </div>
  `;
}

/**
 * Render container for multiple items (e.g. combined transactions/wishlists)
 */
export function renderMultiItemsContainer(items = []) {
  if (!Array.isArray(items) || items.length === 0) return "";
  
  const allSaved = items.every(item => item.saved);
  const cardsHtml = items.map((item, idx) => {
    if (item.intent === "transaction" && item.data) {
      return renderTransactionCardInChat(item.data, !!item.saved, idx);
    } else if (item.intent === "wishlist" && item.data) {
      return renderWishlistCardInChat(item.data, !!item.saved, idx);
    }
    return "";
  }).join("");

  return `
    <div class="ai-multi-items-wrapper">
      <div class="ai-multi-items-header">
        <span class="ai-multi-items-count">Ditemukan ${items.length} transaksi/item</span>
        <button type="button" class="btn btn-secondary btn-sm btn-save-all-multi" ${allSaved ? "disabled" : ""}>
          <i class="${allSaved ? "ph ph-check-circle" : "ph-bold ph-check-square"}"></i>
          <span>${allSaved ? "Semua Tersimpan" : "Simpan Semua"}</span>
        </button>
      </div>
      <div class="ai-multi-items-grid">
        ${cardsHtml}
      </div>
    </div>
  `;
}

/**
 * Inline success feedback for the copy action button
 */
export function showCopySuccess(btn) {
  if (btn.dataset.copied) return;
  const icon = btn.querySelector("i");
  const label = btn.querySelector(".ai-act-label");
  const prevIcon = icon ? icon.className : "";
  const prevLabel = label ? label.textContent : "";

  btn.classList.add("copied");
  btn.dataset.copied = "1";
  if (icon) icon.className = "ph-fill ph-check-circle";
  if (label) label.textContent = "Tersalin";

  setTimeout(() => {
    btn.classList.remove("copied");
    delete btn.dataset.copied;
    if (icon) icon.className = prevIcon;
    if (label) label.textContent = prevLabel;
  }, 1800);
}

