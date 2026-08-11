// src/pages/ai.js
// Dedicated AI Assistant Page with Persistent Chat History for MyFinance

import { store, formatRupiah } from "../store.js";
import { showToast, showConfirm } from "../components/notifications.js";
import { openScanReceiptModal } from "../components/scanReceipt.js";
import { escapeHtml } from "../utils.js";
import { parseNaturalLanguageTx, parseNaturalLanguageWishlist, generateFinancialSummary } from "../components/smartAiInput.js";
import { API_URL, apiFetch, getAuthHeaders } from "../services/apiClient.js";

// Storage Key per user
function getStorageKey() {
  const uid = store.user?.uid || "guest";
  return `myfinance_ai_sessions_${uid}`;
}

// Storage Helpers
function loadSessions() {
  try {
    const raw = localStorage.getItem(getStorageKey());
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn("Failed to load AI sessions:", e);
    return [];
  }
}

function saveSessions(sessions) {
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(sessions));
  } catch (e) {
    console.warn("Failed to save AI sessions:", e);
  }
}

let activeSessionId = null;

/**
 * Call Gemini AI Backend for multi-turn chat parsing & responses
 */
async function queryGemini(text) {
  if (!store.user?.token) return null;
  try {
    const res = await apiFetch(`${API_URL}/ai/parse`, {
      method: "POST",
      headers: getAuthHeaders(store.user.token),
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Render Main Dedicated AI Assistant Page
 */
export function renderAiPage() {
  const app = document.getElementById("page-content") || document.getElementById("app");
  if (!app) return;

  let sessions = loadSessions();
  
  // Ensure at least 1 active session exists
  if (sessions.length === 0) {
    const newSess = createNewSessionObject("Percakapan Baru");
    sessions = [newSess];
    saveSessions(sessions);
  }

  if (!activeSessionId || !sessions.some(s => s.id === activeSessionId)) {
    activeSessionId = sessions[0].id;
  }

  app.innerHTML = `
    <div class="ai-page-container">
      <!-- 1. Left Sidebar: History -->
      <aside class="ai-history-panel" id="ai-history-panel">
        <div class="ai-history-header">
          <h4><i class="ph-bold ph-clock-counter-clockwise"></i> Histori Chat</h4>
          <button type="button" class="btn btn-primary btn-sm" id="btn-new-chat-sidebar" title="Percakapan Baru" style="padding: 4px 10px; font-size: 0.75rem; border-radius: 8px;">
            <i class="ph-bold ph-plus"></i> Baru
          </button>
        </div>

        <div class="ai-history-list" id="ai-history-list">
          <!-- Rendered dynamically -->
        </div>

        <div style="padding-top: 0.5rem; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
          <button type="button" id="btn-clear-all-ai-history" style="background: transparent; border: none; color: var(--red); font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; gap: 4px;">
            <i class="ph ph-trash"></i> Hapus Histori
          </button>
          <button type="button" class="mobile-only btn btn-outline btn-sm" id="btn-close-history-mobile" style="padding: 2px 8px; font-size: 0.75rem;">Tutup</button>
        </div>
      </aside>

      <!-- 2. Main Chat Area -->
      <main class="ai-chat-container">
        <!-- Header -->
        <header class="ai-chat-header">
          <div class="ai-chat-title-group">
            <button type="button" class="mobile-only btn btn-outline btn-sm" id="btn-toggle-history-mobile" style="padding: 6px 10px; border-radius: 8px;">
              <i class="ph ph-clock-counter-clockwise" style="font-size: 1.1rem;"></i>
            </button>

            <div class="ai-avatar-icon">
              <i class="ph-bold ph-robot"></i>
            </div>
            <div>
              <h3 style="margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--text-main); line-height: 1.2;">
                Asisten AI MyFinance
              </h3>
            </div>
          </div>

          <button type="button" class="btn btn-primary btn-sm" id="btn-new-chat-top" style="border-radius: var(--radius-full); padding: 0.45rem 1rem;">
            <i class="ph-bold ph-plus"></i> Percakapan Baru
          </button>
        </header>

        <!-- Messages Body -->
        <div class="ai-chat-messages" id="ai-chat-messages">
          <!-- Rendered dynamically -->
        </div>

        <!-- Input Bar -->
        <div class="ai-chat-input-bar">
          <!-- Quick Chips -->
          <div class="ai-chat-quick-chips">
            <button type="button" class="ai-chip-btn" data-text="Bensin 50k cash">⛽ Bensin 50rb</button>
            <button type="button" class="ai-chip-btn" data-text="Gaji 5jt transfer BCA">💰 Gajian 5jt</button>
            <button type="button" class="ai-chip-btn" data-text="Nabung laptop 15jt">⭐ Wishlist Laptop 15jt</button>
            <button type="button" class="ai-chip-btn" data-text="Ringkas pengeluaran bulan ini">📊 Ringkas Bulan Ini</button>
            <button type="button" class="ai-chip-btn" data-text="Beri saya tips hemat bulan ini">💡 Tips Hemat</button>
          </div>

          <!-- Text Field & Actions -->
          <div class="ai-input-wrapper">
            <input 
              type="text" 
              id="ai-chat-input" 
              class="form-control ai-input-field" 
              placeholder="Contoh: 'Makan siang 25rb', 'Nabung iPhone 12jt', atau 'Tanya tips hemat'..."
            />
            <div class="ai-input-actions">
              <button type="button" id="btn-ai-scan-receipt" class="btn btn-outline btn-sm" title="Scan Struk Transaksi" style="height: 34px; width: 34px; padding: 0; display: flex; align-items: center; justify-content: center; border-radius: 8px;">
                <i class="ph ph-camera" style="font-size: 1.1rem;"></i>
              </button>
              <button type="button" id="btn-ai-send-msg" class="btn btn-primary btn-sm" title="Kirim Pesan" style="height: 34px; width: 34px; padding: 0; display: flex; align-items: center; justify-content: center; border-radius: 8px;">
                <i class="ph-bold ph-paper-plane-right" style="font-size: 1rem;"></i>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  `;

  bindAiPageEvents();
  renderHistorySidebar();
  renderActiveChatMessages();
}

function createNewSessionObject(title = "Percakapan Baru") {
  return {
    id: `session_${Date.now()}`,
    title,
    createdAt: new Date().toISOString(),
    messages: []
  };
}

function bindAiPageEvents() {
  const inputEl = document.getElementById("ai-chat-input");
  const sendBtn = document.getElementById("btn-ai-send-msg");
  const scanBtn = document.getElementById("btn-ai-scan-receipt");
  const newChatBtnTop = document.getElementById("btn-new-chat-top");
  const newChatBtnSidebar = document.getElementById("btn-new-chat-sidebar");
  const clearHistoryBtn = document.getElementById("btn-clear-all-ai-history");
  const toggleHistoryBtn = document.getElementById("btn-toggle-history-mobile");
  const closeHistoryBtn = document.getElementById("btn-close-history-mobile");

  const startNewChat = () => {
    const sessions = loadSessions();
    const newSess = createNewSessionObject("Percakapan Baru");
    sessions.unshift(newSess);
    activeSessionId = newSess.id;
    saveSessions(sessions);
    renderHistorySidebar();
    renderActiveChatMessages();
    if (inputEl) inputEl.focus();
  };

  if (newChatBtnTop) newChatBtnTop.addEventListener("click", startNewChat);
  if (newChatBtnSidebar) newChatBtnSidebar.addEventListener("click", startNewChat);

  if (toggleHistoryBtn) {
    toggleHistoryBtn.addEventListener("click", () => {
      document.getElementById("ai-history-panel")?.classList.add("mobile-active");
    });
  }

  if (closeHistoryBtn) {
    closeHistoryBtn.addEventListener("click", () => {
      document.getElementById("ai-history-panel")?.classList.remove("mobile-active");
    });
  }

  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener("click", () => {
      showConfirm("Hapus Histori AI?", "Apakah kamu yakin ingin menghapus seluruh riwayat percakapan AI?", async () => {
        saveSessions([]);
        renderAiPage();
        showToast("Dihapus", "Histori percakapan AI berhasil dibersihkan.", "info");
      });
    });
  }

  if (scanBtn) {
    scanBtn.addEventListener("click", () => {
      openScanReceiptModal();
    });
  }

  const handleSend = () => {
    const text = inputEl ? inputEl.value.trim() : "";
    if (!text) return;
    inputEl.value = "";
    processUserChatMessage(text);
  };

  if (sendBtn) sendBtn.addEventListener("click", handleSend);
  if (inputEl) {
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSend();
      }
    });
  }

  // Quick Chips
  const chips = document.querySelectorAll(".ai-chip-btn");
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      const text = chip.getAttribute("data-text");
      if (text) {
        processUserChatMessage(text);
      }
    });
  });
}

function renderHistorySidebar() {
  const container = document.getElementById("ai-history-list");
  if (!container) return;

  const sessions = loadSessions();
  if (sessions.length === 0) {
    container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.78rem; text-align: center; padding: 1.5rem 0;">Belum ada riwayat.</div>`;
    return;
  }

  container.innerHTML = sessions.map((s) => {
    const isActive = s.id === activeSessionId ? "active" : "";
    const timeDisplay = formatTimeDisplay(s.createdAt);
    return `
      <div class="ai-history-item ${isActive}" data-id="${s.id}">
        <div class="ai-history-info">
          <span class="ai-history-title">${escapeHtml(s.title || "Percakapan")}</span>
          <span class="ai-history-date">${timeDisplay}</span>
        </div>
        <button type="button" class="ai-history-delete-btn" data-delete-id="${s.id}" title="Hapus Percakapan">
          <i class="ph ph-trash"></i>
        </button>
      </div>
    `;
  }).join("");

  // Attach click events
  container.querySelectorAll(".ai-history-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      if (e.target.closest(".ai-history-delete-btn")) return;
      activeSessionId = item.getAttribute("data-id");
      renderHistorySidebar();
      renderActiveChatMessages();
      document.getElementById("ai-history-panel")?.classList.remove("mobile-active");
    });
  });

  container.querySelectorAll(".ai-history-delete-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const idToDelete = btn.getAttribute("data-delete-id");
      let sessions = loadSessions();
      sessions = sessions.filter((s) => s.id !== idToDelete);
      if (activeSessionId === idToDelete) {
        activeSessionId = sessions[0]?.id || null;
      }
      saveSessions(sessions);
      renderHistorySidebar();
      renderActiveChatMessages();
    });
  });
}

function formatTimeDisplay(isoString) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

function renderActiveChatMessages() {
  const container = document.getElementById("ai-chat-messages");
  if (!container) return;

  const sessions = loadSessions();
  const activeSession = sessions.find((s) => s.id === activeSessionId);

  if (!activeSession || !activeSession.messages || activeSession.messages.length === 0) {
    const userAvatar = store.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=user`;
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; margin: auto; max-width: 480px; padding: 2rem 1rem;">
        <div class="ai-avatar-icon" style="width: 60px; height: 60px; font-size: 1.8rem; margin-bottom: 1rem;">
          <i class="ph-bold ph-robot"></i>
        </div>
        <h4 style="margin: 0 0 0.5rem 0; font-size: 1.15rem; font-weight: 700; color: var(--text-main);">
          Halo, ${escapeHtml(store.user?.name || "Pengguna")}! 👋
        </h4>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.5rem; line-height: 1.5;">
          Saya Asisten AI MyFinance. Saya bisa membantumu mencatat transaksi, membuat target wishlist, serta memberikan ringkasan & tips keuangan pribadi!
        </p>

        <div style="width: 100%; display: flex; flex-direction: column; gap: 8px;">
          <button type="button" class="ai-welcome-prompt-btn" data-text="Makan siang bakso 25rb cash">
            <span>🍜 Makan siang bakso 25rb cash</span>
            <i class="ph ph-arrow-right"></i>
          </button>
          <button type="button" class="ai-welcome-prompt-btn" data-text="Gaji bulanan 7.5jt transfer BCA">
            <span>💼 Gaji bulanan 7.5jt transfer BCA</span>
            <i class="ph ph-arrow-right"></i>
          </button>
          <button type="button" class="ai-welcome-prompt-btn" data-text="Nabung beli laptop gaming 15jt">
            <span>⭐ Nabung beli laptop gaming 15jt</span>
            <i class="ph ph-arrow-right"></i>
          </button>
          <button type="button" class="ai-welcome-prompt-btn" data-text="Ringkas pengeluaran 1 bulan">
            <span>📊 Ringkas pengeluaran 1 bulan</span>
            <i class="ph ph-arrow-right"></i>
          </button>
        </div>
      </div>
    `;

    container.querySelectorAll(".ai-welcome-prompt-btn").forEach((btn) => {
      btn.style.cssText = `
        background: var(--bg-color);
        border: 1px solid var(--border);
        padding: 0.75rem 1rem;
        border-radius: var(--radius-lg);
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 0.85rem;
        color: var(--text-main);
        cursor: pointer;
        transition: all 0.2s ease;
      `;
      btn.addEventListener("click", () => {
        const text = btn.getAttribute("data-text");
        if (text) processUserChatMessage(text);
      });
    });
    return;
  }

  const userAvatar = store.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=user`;

  container.innerHTML = activeSession.messages.map((msg) => {
    const isUser = msg.sender === "user";
    const timeStr = msg.time || "";

    if (isUser) {
      return `
        <div class="ai-msg-row user">
          <img src="${userAvatar}" class="ai-msg-avatar" alt="User" />
          <div>
            <div class="ai-msg-bubble">
              ${escapeHtml(msg.text)}
            </div>
            <span class="ai-msg-time">${timeStr}</span>
          </div>
        </div>
      `;
    }

    // AI Message
    let contentHtml = `<div>${escapeHtml(msg.text)}</div>`;

    if (msg.intent === "transaction" && msg.data) {
      contentHtml += renderTransactionCardInChat(msg.data, msg.saved);
    } else if (msg.intent === "wishlist" && msg.data) {
      contentHtml += renderWishlistCardInChat(msg.data, msg.saved);
    } else if (msg.intent === "summary_request") {
      contentHtml += generateFinancialSummary(msg.period || "1_month");
    }

    return `
      <div class="ai-msg-row assistant">
        <div class="ai-avatar-icon" style="width: 32px; height: 32px; font-size: 1rem; flex-shrink: 0;">
          <i class="ph-bold ph-robot"></i>
        </div>
        <div>
          <div class="ai-msg-bubble">
            ${contentHtml}
          </div>
          <span class="ai-msg-time">${timeStr}</span>
        </div>
      </div>
    `;
  }).join("");

  bindChatActionButtons();
  scrollToBottom();
}

function scrollToBottom() {
  const container = document.getElementById("ai-chat-messages");
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

function renderTransactionCardInChat(tx, saved = false) {
  const isIncome = tx.type === "income";
  const badgeClass = isIncome ? "badge-green" : "badge-red";
  const sign = isIncome ? "+" : "-";

  return `
    <div class="ai-action-card">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="badge-soft ${badgeClass}" style="font-size: 0.72rem;">
            ${isIncome ? "📈 Pemasukan" : "📉 Pengeluaran"}
          </span>
          <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-main);">${escapeHtml(tx.kategori)}</span>
        </div>
        <strong style="font-size: 0.95rem; color: ${isIncome ? 'var(--green)' : 'var(--red)'}">
          ${sign} ${formatRupiah(tx.harga)}
        </strong>
      </div>
      <div style="font-size: 0.78rem; color: var(--text-muted); display: flex; gap: 8px; flex-wrap: wrap;">
        <span><i class="ph ph-credit-card"></i> ${escapeHtml(tx.metode || "Cash")}</span>
        <span>·</span>
        <span>${escapeHtml(tx.keterangan)}</span>
        ${tx.tanggal ? `<span>·</span><span><i class="ph ph-calendar"></i> ${tx.tanggal}</span>` : ""}
      </div>
      <div style="display: flex; justify-content: flex-end; margin-top: 4px;">
        <button type="button" class="btn btn-primary btn-save-chat-tx" data-tx='${JSON.stringify(tx).replace(/'/g, "&apos;")}' ${saved ? "disabled" : ""} style="padding: 0.35rem 0.85rem; font-size: 0.75rem; border-radius: var(--radius-md);">
          ${saved ? `<i class="ph ph-check"></i> Tersimpan` : `<i class="ph-bold ph-plus"></i> Simpan Transaksi`}
        </button>
      </div>
    </div>
  `;
}

function renderWishlistCardInChat(wishlist, saved = false) {
  return `
    <div class="ai-action-card">
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="badge-soft badge-purple" style="font-size: 0.72rem;">⭐ Target Wishlist</span>
          <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-main);">${escapeHtml(wishlist.name)}</span>
        </div>
        <strong style="font-size: 0.95rem; color: var(--primary);">${formatRupiah(wishlist.target)}</strong>
      </div>
      <div style="display: flex; justify-content: flex-end; margin-top: 4px;">
        <button type="button" class="btn btn-primary btn-save-chat-wishlist" data-wishlist='${JSON.stringify(wishlist).replace(/'/g, "&apos;")}' ${saved ? "disabled" : ""} style="padding: 0.35rem 0.85rem; font-size: 0.75rem; border-radius: var(--radius-md);">
          ${saved ? `<i class="ph ph-check"></i> Tersimpan` : `<i class="ph-bold ph-plus"></i> Simpan ke Wishlist`}
        </button>
      </div>
    </div>
  `;
}

function bindChatActionButtons() {
  document.querySelectorAll(".btn-save-chat-tx").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const raw = btn.getAttribute("data-tx");
      if (!raw) return;
      try {
        const tx = JSON.parse(raw);
        btn.disabled = true;
        btn.innerHTML = `<i class="ph ph-spinner spin"></i> Menyimpan...`;
        await store.addTransaction(tx);
        btn.innerHTML = `<i class="ph ph-check"></i> Tersimpan`;
        showToast("Berhasil!", `Transaksi "${tx.keterangan}" (${formatRupiah(tx.harga)}) tersimpan.`, "success");
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = `<i class="ph-bold ph-plus"></i> Simpan Transaksi`;
        showToast("Gagal", err.message || "Gagal menyimpan transaksi.", "error");
      }
    });
  });

  document.querySelectorAll(".btn-save-chat-wishlist").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const raw = btn.getAttribute("data-wishlist");
      if (!raw) return;
      try {
        const wl = JSON.parse(raw);
        btn.disabled = true;
        btn.innerHTML = `<i class="ph ph-spinner spin"></i> Menyimpan...`;
        if (typeof store.createSaving === "function") {
          await store.createSaving(wl);
        } else {
          store.addSaving(wl);
        }
        btn.innerHTML = `<i class="ph ph-check"></i> Tersimpan`;
        showToast("Berhasil!", `Target Wishlist "${wl.name}" (${formatRupiah(wl.target)}) tersimpan.`, "success");
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = `<i class="ph-bold ph-plus"></i> Simpan ke Wishlist`;
        showToast("Gagal", err.message || "Gagal menyimpan wishlist.", "error");
      }
    });
  });
}

async function processUserChatMessage(userText) {
  let sessions = loadSessions();
  let session = sessions.find((s) => s.id === activeSessionId);

  if (!session) {
    session = createNewSessionObject(userText.slice(0, 24));
    sessions.unshift(session);
    activeSessionId = session.id;
  }

  // Update session title if default
  if (session.title === "Percakapan Baru") {
    session.title = userText.length > 25 ? userText.slice(0, 25) + "..." : userText;
  }

  const nowTime = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  // Add User Message
  session.messages.push({
    id: `msg_${Date.now()}_u`,
    sender: "user",
    text: userText,
    time: nowTime
  });

  saveSessions(sessions);
  renderHistorySidebar();
  renderActiveChatMessages();

  // Show AI typing indicator
  const container = document.getElementById("ai-chat-messages");
  if (container) {
    const typingEl = document.createElement("div");
    typingEl.id = "ai-typing-indicator";
    typingEl.className = "ai-msg-row assistant";
    typingEl.innerHTML = `
      <div class="ai-avatar-icon" style="width: 32px; height: 32px; font-size: 1rem; flex-shrink: 0;">
        <i class="ph-bold ph-robot"></i>
      </div>
      <div class="ai-msg-bubble" style="display: flex; align-items: center; gap: 6px; color: var(--text-muted); font-size: 0.82rem;">
        <i class="ph ph-spinner spin" style="font-size: 1.1rem; color: var(--primary);"></i>
        <span>AI sedang mengetik...</span>
      </div>
    `;
    container.appendChild(typingEl);
    scrollToBottom();
  }

  // Call AI Backend / Fallback Parser
  let aiResult = await queryGemini(userText);

  // Remove typing indicator
  document.getElementById("ai-typing-indicator")?.remove();

  // Reload fresh session
  sessions = loadSessions();
  session = sessions.find((s) => s.id === activeSessionId) || session;

  if (aiResult && aiResult.intent === "transaction" && aiResult.data) {
    session.messages.push({
      id: `msg_${Date.now()}_a`,
      sender: "assistant",
      text: aiResult.message || `Saya menemukan rincian transaksi dari pesan kamu:`,
      intent: "transaction",
      data: aiResult.data,
      time: nowTime
    });
  } else if (aiResult && aiResult.intent === "wishlist" && aiResult.data) {
    session.messages.push({
      id: `msg_${Date.now()}_a`,
      sender: "assistant",
      text: aiResult.message || `Target wishlist berhasil dibuat dari pesan kamu:`,
      intent: "wishlist",
      data: aiResult.data,
      time: nowTime
    });
  } else if (aiResult && aiResult.intent === "summary_request") {
    session.messages.push({
      id: `msg_${Date.now()}_a`,
      sender: "assistant",
      text: aiResult.message || `Berikut ringkasan analisis keuangan kamu:`,
      intent: "summary_request",
      period: aiResult.period || "1_month",
      time: nowTime
    });
  } else {
    // Check fallback local heuristics
    const lower = userText.toLowerCase();

    if (lower.includes("summary") || lower.includes("ringkas") || lower.includes("rangkum") || lower.includes("keuangan") || lower.includes("analisis")) {
      let pk = "1_month";
      if (lower.includes("minggu")) pk = "1_week";
      else if (lower.includes("3 bulan")) pk = "3_months";
      session.messages.push({
        id: `msg_${Date.now()}_a`,
        sender: "assistant",
        text: "Berikut adalah ringkasan keuangan kamu:",
        intent: "summary_request",
        period: pk,
        time: nowTime
      });
    } else {
      const localWl = parseNaturalLanguageWishlist(userText);
      if (localWl) {
        session.messages.push({
          id: `msg_${Date.now()}_a`,
          sender: "assistant",
          text: "Saya mendeteksi target wishlist baru:",
          intent: "wishlist",
          data: localWl,
          time: nowTime
        });
      } else {
        const localTx = parseNaturalLanguageTx(userText);
        if (localTx) {
          session.messages.push({
            id: `msg_${Date.now()}_a`,
            sender: "assistant",
            text: "Saya memproses transaksi kamu:",
            intent: "transaction",
            data: localTx,
            time: nowTime
          });
        } else {
          // General Q&A / Advice response
          let adviceText = "Saya bisa membantumu mencatat transaksi, wishlist, atau menganalisis pengeluaran. Coba ketik contoh seperti: *'Makan siang 25rb cash'*, *'Nabung laptop 15jt'*, atau *'Ringkas 1 bulan'*";
          if (lower.includes("tips") || lower.includes("hemat") || lower.includes("saran")) {
            adviceText = "💡 **Tips Keuangan MyFinance**:\n1. Terapkan alokasi 50/30/20 (50% Kebutuhan, 30% Keinginan, 20% Tabungan/Investasi).\n2. Catat transaksi kecil setiap hari agar pengeluaran tidak meleset.\n3. Buat target Wishlist khusus untuk pembelian bernominal besar!";
          } else if (aiResult && aiResult.message) {
            adviceText = aiResult.message;
          }

          session.messages.push({
            id: `msg_${Date.now()}_a`,
            sender: "assistant",
            text: adviceText,
            intent: "text",
            time: nowTime
          });
        }
      }
    }
  }

  saveSessions(sessions);
  renderActiveChatMessages();
}
