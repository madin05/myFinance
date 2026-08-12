// src/pages/ai.js
// Dedicated AI Assistant Page with Gemini Mobile UI & Persistent Chat History

import { store, formatRupiah } from "../store.js";
import { showToast, showConfirm } from "../components/notifications.js";
import { openScanReceiptModal } from "../components/scanReceipt.js";
import { escapeHtml } from "../utils.js";
import {
  parseNaturalLanguageTx,
  parseNaturalLanguageWishlist,
  generateFinancialSummary,
} from "../components/smartAiInput.js";
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
let currentModelName = "Flash Mendalam";
let historySearchQuery = "";
let isSidebarCollapsedDesktop = false;

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
 * Render Main Dedicated AI Assistant Page (Gemini Mobile UI Re-layouting)
 */
export function renderAiPage() {
  const app =
    document.getElementById("page-content") || document.getElementById("app");
  if (!app) return;

  let sessions = loadSessions();

  // Ensure at least 1 active session exists
  if (sessions.length === 0) {
    const newSess = createNewSessionObject("Percakapan Baru");
    sessions = [newSess];
    saveSessions(sessions);
  }

  if (!activeSessionId || !sessions.some((s) => s.id === activeSessionId)) {
    activeSessionId = sessions[0].id;
  }

  app.innerHTML = `
    <div class="ai-page-container ${isSidebarCollapsedDesktop ? "sidebar-collapsed" : ""}">
      <!-- Backdrop for mobile drawer -->
      <div class="ai-drawer-backdrop" id="ai-drawer-backdrop"></div>

      <!-- 1. Left Sidebar / Drawer (Gemini Mobile Drawer) -->
      <aside class="ai-history-panel" id="ai-history-panel">
        <!-- Drawer Header -->
        <div class="ai-history-panel-header">
          <div class="ai-history-brand">
            <span class="ai-history-brand-title">Anya</span>
          </div>
          <button type="button" class="ai-icon-btn mobile-only" id="btn-close-history-mobile" title="Tutup Menu">
            <i class="ph ph-x" style="font-size: 1.25rem;"></i>
          </button>
        </div>

        <!-- Action Items -->
        <div class="ai-history-actions">
          <button type="button" class="ai-history-action-btn" id="btn-new-chat-sidebar">
            <i class="ph ph-pencil-simple" style="font-size: 1.1rem;"></i>
            <span>Percakapan baru</span>
          </button>

          <div class="ai-history-search-box">
            <i class="ph ph-magnifying-glass"></i>
            <input type="text" id="ai-history-search-input" placeholder="Telusuri percakapan" value="${escapeHtml(historySearchQuery)}" />
          </div>
        </div>

        <!-- Section Title: Terbaru -->
        <div class="ai-history-section-title">
          <span>Terbaru</span>
          <i class="ph ph-caret-down"></i>
        </div>

        <!-- Dynamic History List -->
        <div class="ai-history-list" id="ai-history-list">
          <!-- Rendered dynamically -->
        </div>
      </aside>

      <!-- 2. Main Chat Area -->
      <main class="ai-chat-container">
        <!-- Header Top Bar -->
        <header class="ai-chat-header mobile-only">
          <div class="ai-chat-header-left">
            <button type="button" class="ai-icon-btn mobile-only" id="btn-toggle-history-mobile" title="Histori Percakapan">
              <i class="ph ph-equals" style="font-size: 1.35rem; font-weight: bold;"></i>
            </button>
          </div>

          <div class="ai-chat-header-right">
            <button type="button" class="ai-icon-btn" id="btn-new-chat-top" title="Percakapan Baru">
              <i class="ph ph-pencil-simple" style="font-size: 1.25rem;"></i>
            </button>
          </div>
        </header>

        <!-- Messages Body -->
        <div class="ai-chat-messages" id="ai-chat-messages">
          <!-- Rendered dynamically -->
        </div>

        <!-- Floating Gemini Input Bar (Pill Capsule Layout) -->
        <div class="ai-chat-input-container">
          <!-- Horizontal Quick Prompt Chips -->
          <div class="ai-chat-quick-chips" id="ai-quick-chips-wrapper">
            <button type="button" class="ai-chip-btn" data-text="Bensin 50k cash">⛽ Bensin 50rb</button>
            <button type="button" class="ai-chip-btn" data-text="Gaji 5jt transfer BCA">💰 Gajian 5jt</button>
            <button type="button" class="ai-chip-btn" data-text="Nabung laptop 15jt">⭐ Wishlist Laptop 15jt</button>
            <button type="button" class="ai-chip-btn" data-text="Ringkas pengeluaran bulan ini">📊 Ringkas Bulan Ini</button>
            <button type="button" class="ai-chip-btn" data-text="Beri saya tips hemat bulan ini">💡 Tips Hemat</button>
          </div>

          <!-- Gemini Floating Capsule Input Pill -->
          <div class="ai-input-pill">
            <!-- Plus Button -->
            <div class="ai-pill-left">
              <button type="button" id="btn-ai-plus-menu" class="ai-pill-icon-btn" title="Tambah / Opsi">
                <i class="ph ph-plus" style="font-size: 1.3rem;"></i>
              </button>

              <!-- Plus Menu Popup -->
              <div class="ai-plus-menu" id="ai-plus-menu" style="display: none;">
                <button type="button" class="ai-plus-menu-item" id="btn-ai-scan-receipt-pill">
                  <i class="ph ph-camera"></i>
                  <span>Scan Struk Transaksi</span>
                </button>
                <button type="button" class="ai-plus-menu-item" id="btn-ai-quick-summary">
                  <i class="ph ph-chart-bar"></i>
                  <span>Ringkasan Keuangan</span>
                </button>
                <button type="button" class="ai-plus-menu-item" id="btn-ai-tips">
                  <i class="ph ph-lightbulb"></i>
                  <span>Tips Hemat Keuangan</span>
                </button>
              </div>
            </div>

            <!-- Text Field -->
            <input 
              type="text" 
              id="ai-chat-input" 
              class="ai-pill-field" 
              placeholder="Minta Anya..."
              autocomplete="off"
            />

            <!-- Microphone / Send Button -->
            <div class="ai-pill-right">
              <button type="button" id="btn-ai-mic-send" class="ai-pill-icon-btn" title="Suara / Kirim">
                <i class="ph ph-microphone" id="ai-input-action-icon" style="font-size: 1.25rem;"></i>
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
    pinned: false,
    messages: [],
  };
}

function bindAiPageEvents() {
  const inputEl = document.getElementById("ai-chat-input");
  const actionIconBtn = document.getElementById("btn-ai-mic-send");
  const actionIcon = document.getElementById("ai-input-action-icon");
  const plusBtn = document.getElementById("btn-ai-plus-menu");
  const plusMenu = document.getElementById("ai-plus-menu");
  const scanBtn = document.getElementById("btn-ai-scan-receipt-pill");
  const summaryBtn = document.getElementById("btn-ai-quick-summary");
  const tipsBtn = document.getElementById("btn-ai-tips");
  const newChatBtnTop = document.getElementById("btn-new-chat-top");
  const newChatBtnSidebar = document.getElementById("btn-new-chat-sidebar");
  const toggleHistoryBtn = document.getElementById("btn-toggle-history-mobile");
  const closeHistoryBtn = document.getElementById("btn-close-history-mobile");
  const drawerBackdrop = document.getElementById("ai-drawer-backdrop");

  const searchInput = document.getElementById("ai-history-search-input");

  const openDrawer = () => {
    document.getElementById("ai-history-panel")?.classList.add("mobile-active");
    drawerBackdrop?.classList.add("mobile-active");
  };

  const closeDrawer = () => {
    document
      .getElementById("ai-history-panel")
      ?.classList.remove("mobile-active");
    drawerBackdrop?.classList.remove("mobile-active");
  };

  const startNewChat = () => {
    const sessions = loadSessions();
    const newSess = createNewSessionObject("Percakapan Baru");
    sessions.unshift(newSess);
    activeSessionId = newSess.id;
    saveSessions(sessions);
    closeDrawer();
    renderHistorySidebar();
    renderActiveChatMessages();
    if (inputEl) inputEl.focus();
  };

  if (newChatBtnTop) newChatBtnTop.addEventListener("click", startNewChat);
  if (newChatBtnSidebar)
    newChatBtnSidebar.addEventListener("click", startNewChat);

  if (toggleHistoryBtn) toggleHistoryBtn.addEventListener("click", openDrawer);
  if (closeHistoryBtn) closeHistoryBtn.addEventListener("click", closeDrawer);
  if (drawerBackdrop) drawerBackdrop.addEventListener("click", closeDrawer);

  document.addEventListener("click", () => {
    if (plusMenu) plusMenu.style.display = "none";
  });

  // History Search Filter
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      historySearchQuery = e.target.value;
      renderHistorySidebar();
    });
  }

  // Plus button menu toggle
  if (plusBtn && plusMenu) {
    plusBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isVisible = plusMenu.style.display === "block";
      plusMenu.style.display = isVisible ? "none" : "block";
    });
  }

  if (scanBtn) {
    scanBtn.addEventListener("click", () => {
      if (plusMenu) plusMenu.style.display = "none";
      openScanReceiptModal();
    });
  }

  if (summaryBtn) {
    summaryBtn.addEventListener("click", () => {
      if (plusMenu) plusMenu.style.display = "none";
      processUserChatMessage("Ringkas pengeluaran bulan ini");
    });
  }

  if (tipsBtn) {
    tipsBtn.addEventListener("click", () => {
      if (plusMenu) plusMenu.style.display = "none";
      processUserChatMessage("Beri saya tips hemat bulan ini");
    });
  }

  // Switch mic icon vs send icon based on text input
  if (inputEl && actionIcon) {
    inputEl.addEventListener("input", () => {
      const text = inputEl.value.trim();
      if (text.length > 0) {
        actionIcon.className = "ph-bold ph-paper-plane-right";
        actionIcon.parentElement.setAttribute("title", "Kirim Pesan");
      } else {
        actionIcon.className = "ph ph-microphone";
        actionIcon.parentElement.setAttribute("title", "Perintah Suara");
      }
    });

    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSend();
      }
    });
  }

  const handleSend = () => {
    const text = inputEl ? inputEl.value.trim() : "";
    if (!text) {
      showToast("Suara AI", "Fitur Perintah Suara siap digunakan.", "info");
      return;
    }
    inputEl.value = "";
    if (actionIcon) {
      actionIcon.className = "ph ph-microphone";
    }
    processUserChatMessage(text);
  };

  if (actionIconBtn) actionIconBtn.addEventListener("click", handleSend);

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

  let sessions = loadSessions();
  if (sessions.length === 0) {
    container.innerHTML = `<div class="ai-history-empty">Belum ada riwayat percakapan.</div>`;
    return;
  }

  // Filter search
  if (historySearchQuery.trim()) {
    const query = historySearchQuery.toLowerCase().trim();
    sessions = sessions.filter((s) =>
      (s.title || "").toLowerCase().includes(query),
    );
  }

  // Sort pinned first
  sessions.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  if (sessions.length === 0) {
    container.innerHTML = `<div class="ai-history-empty">Percakapan tidak ditemukan.</div>`;
    return;
  }

  container.innerHTML = sessions
    .map((s) => {
      const isActive = s.id === activeSessionId ? "active" : "";
      const isPinned = !!s.pinned;
      return `
      <div class="ai-history-item ${isActive}" data-id="${s.id}">
        <div class="ai-history-item-content">
          <span class="ai-history-title">${escapeHtml(s.title || "Percakapan")}</span>
        </div>
        <div class="ai-history-item-actions">
          <button type="button" class="ai-history-pin-btn ${isPinned ? "pinned" : ""}" data-pin-id="${s.id}" title="${isPinned ? "Lepas Pin" : "Sematkan Pin"}">
            <i class="${isPinned ? "ph-fill ph-push-pin" : "ph ph-push-pin"}"></i>
          </button>
          <button type="button" class="ai-history-delete-btn" data-delete-id="${s.id}" title="Hapus Percakapan">
            <i class="ph ph-trash"></i>
          </button>
        </div>
      </div>
    `;
    })
    .join("");

  // Attach click events
  container.querySelectorAll(".ai-history-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      if (
        e.target.closest(".ai-history-delete-btn") ||
        e.target.closest(".ai-history-pin-btn")
      )
        return;
      activeSessionId = item.getAttribute("data-id");
      renderHistorySidebar();
      renderActiveChatMessages();
      document
        .getElementById("ai-history-panel")
        ?.classList.remove("mobile-active");
      document
        .getElementById("ai-drawer-backdrop")
        ?.classList.remove("mobile-active");
    });
  });

  // Pin events
  container.querySelectorAll(".ai-history-pin-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const idToPin = btn.getAttribute("data-pin-id");
      let sessions = loadSessions();
      const s = sessions.find((item) => item.id === idToPin);
      if (s) {
        s.pinned = !s.pinned;
        saveSessions(sessions);
        renderHistorySidebar();
      }
    });
  });

  // Delete events
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

function renderActiveChatMessages() {
  const container = document.getElementById("ai-chat-messages");
  if (!container) return;

  const sessions = loadSessions();
  const activeSession = sessions.find((s) => s.id === activeSessionId);

  if (
    !activeSession ||
    !activeSession.messages ||
    activeSession.messages.length === 0
  ) {
    container.innerHTML = `
      <div class="ai-welcome-hero">
        <div class="ai-welcome-sparkle-avatar">
          <i class="ph-bold ph-robot"></i>
        </div>
        <h3 class="ai-welcome-title">Halo, ${escapeHtml(store.user?.name || "Pengguna")}! 👋</h3>
        <p class="ai-welcome-subtitle">
          Saya Anya Asisten Keuangan MyFinance. Tanyakan tips hemat, catat transaksi otomatis, atau minta analisis pengeluaranmu.
        </p>

        <div class="ai-welcome-prompts-grid">
          <button type="button" class="ai-welcome-prompt-card" data-text="Makan siang 25rb cash">
            <span class="ai-welcome-prompt-text">🍜 Makan siang 25rb cash</span>
            <i class="ph ph-arrow-right"></i>
          </button>
          <button type="button" class="ai-welcome-prompt-card" data-text="Gaji bulanan 7.5jt transfer BCA">
            <span class="ai-welcome-prompt-text">💼 Gaji bulanan 7.5jt transfer BCA</span>
            <i class="ph ph-arrow-right"></i>
          </button>
          <button type="button" class="ai-welcome-prompt-card" data-text="Nabung beli laptop gaming 15jt">
            <span class="ai-welcome-prompt-text">⭐ Nabung laptop gaming 15jt</span>
            <i class="ph ph-arrow-right"></i>
          </button>
          <button type="button" class="ai-welcome-prompt-card" data-text="Ringkas pengeluaran 1 bulan">
            <span class="ai-welcome-prompt-text">📊 Ringkas pengeluaran bulan ini</span>
            <i class="ph ph-arrow-right"></i>
          </button>
        </div>
      </div>
    `;

    container.querySelectorAll(".ai-welcome-prompt-card").forEach((btn) => {
      btn.addEventListener("click", () => {
        const text = btn.getAttribute("data-text");
        if (text) processUserChatMessage(text);
      });
    });
    return;
  }

  const userAvatar =
    store.user?.avatar ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=user`;

  container.innerHTML = activeSession.messages
    .map((msg) => {
      const isUser = msg.sender === "user";
      const timeStr = msg.time || "";

      if (isUser) {
        return `
        <div class="ai-msg-row user">
          <div class="ai-msg-content-wrapper">
            <div class="ai-msg-bubble">
              ${escapeHtml(msg.text)}
            </div>
            <span class="ai-msg-time">${timeStr}</span>
          </div>
          <img src="${userAvatar}" class="ai-msg-avatar" alt="User" />
        </div>
      `;
      }

      // Assistant / Gemini Message Response
      let contentHtml = `<div class="ai-formatted-text">${formatResponseMarkdown(msg.text)}</div>`;

      if (msg.intent === "transaction" && msg.data) {
        contentHtml += renderTransactionCardInChat(msg.data, msg.saved);
      } else if (msg.intent === "wishlist" && msg.data) {
        contentHtml += renderWishlistCardInChat(msg.data, msg.saved);
      } else if (msg.intent === "summary_request") {
        contentHtml += generateFinancialSummary(msg.period || "1_month");
      }

      return `
      <div class="ai-msg-row assistant" data-msg-id="${msg.id}">
        <div class="ai-msg-sparkle-avatar">
          <i class="ph-bold ph-robot"></i>
        </div>
        <div class="ai-msg-content-wrapper">
          <div class="ai-msg-bubble">
            ${contentHtml}
          </div>
          
          <!-- Gemini Response Action Buttons Bar (Matches Image 1) -->
          <div class="ai-msg-action-bar">
            <button type="button" class="ai-msg-act-btn btn-like-msg" title="Sukai tanggapan">
              <i class="ph ph-thumbs-up"></i>
            </button>
            <button type="button" class="ai-msg-act-btn btn-dislike-msg" title="Tanggapan kurang tepat">
              <i class="ph ph-thumbs-down"></i>
            </button>
            <button type="button" class="ai-msg-act-btn btn-share-msg" data-text="${escapeHtml(msg.text)}" title="Bagikan tanggapan">
              <i class="ph ph-share-network"></i>
            </button>
            <button type="button" class="ai-msg-act-btn btn-copy-msg" data-text="${escapeHtml(msg.text)}" title="Salin ke clipboard">
              <i class="ph ph-copy"></i>
            </button>
            <button type="button" class="ai-msg-act-btn btn-more-msg" title="Opsi lainnya">
              <i class="ph ph-dots-three-vertical"></i>
            </button>
          </div>

          <span class="ai-msg-time">${timeStr}</span>
        </div>
      </div>
    `;
    })
    .join("");

  bindChatActionButtons();
  bindMessageResponseActions();
  scrollToBottom();
}

/**
 * Format markdown response text into clean styled HTML
 */
function formatResponseMarkdown(text) {
  if (!text) return "";
  let formatted = escapeHtml(text);

  // Bold **text**
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Lists starting with * or - or o
  formatted = formatted.replace(
    /(?:^|\n)[*•\-o]\s+(.*?)(?=\n|$)/g,
    "\n<li>$1</li>",
  );
  if (formatted.includes("<li>")) {
    formatted = formatted.replace(/(<li>.*?<\/li>)+/gs, "<ul>$&</ul>");
  }

  // Paragraph breaks
  formatted = formatted.replace(/\n\n/g, "<br/><br/>");
  return formatted;
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
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="badge-soft ${badgeClass}" style="font-size: 0.72rem;">
            ${isIncome ? "📈 Pemasukan" : "📉 Pengeluaran"}
          </span>
          <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-main);">${escapeHtml(tx.kategori)}</span>
        </div>
        <strong style="font-size: 0.95rem; color: ${isIncome ? "var(--green)" : "var(--red)"}">
          ${sign} ${formatRupiah(tx.harga)}
        </strong>
      </div>
      <div style="font-size: 0.78rem; color: var(--text-muted); display: flex; gap: 8px; flex-wrap: wrap;">
        <span><i class="ph ph-credit-card"></i> ${escapeHtml(tx.metode || "Cash")}</span>
        <span>·</span>
        <span>${escapeHtml(tx.keterangan)}</span>
        ${tx.tanggal ? `<span>·</span><span><i class="ph ph-calendar"></i> ${tx.tanggal}</span>` : ""}
      </div>
      <div style="display: flex; justify-content: flex-end; margin-top: 6px;">
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
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="badge-soft badge-purple" style="font-size: 0.72rem;">⭐ Target Wishlist</span>
          <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-main);">${escapeHtml(wishlist.name)}</span>
        </div>
        <strong style="font-size: 0.95rem; color: var(--primary);">${formatRupiah(wishlist.target)}</strong>
      </div>
      <div style="display: flex; justify-content: flex-end; margin-top: 6px;">
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
        showToast(
          "Berhasil!",
          `Transaksi "${tx.keterangan}" (${formatRupiah(tx.harga)}) tersimpan.`,
          "success",
        );
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = `<i class="ph-bold ph-plus"></i> Simpan Transaksi`;
        showToast(
          "Gagal",
          err.message || "Gagal menyimpan transaksi.",
          "error",
        );
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
        showToast(
          "Berhasil!",
          `Target Wishlist "${wl.name}" (${formatRupiah(wl.target)}) tersimpan.`,
          "success",
        );
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = `<i class="ph-bold ph-plus"></i> Simpan ke Wishlist`;
        showToast("Gagal", err.message || "Gagal menyimpan wishlist.", "error");
      }
    });
  });
}

/**
 * Bind message response action icons (Thumbs Up, Thumbs Down, Copy, Share)
 */
function bindMessageResponseActions() {
  document.querySelectorAll(".btn-copy-msg").forEach((btn) => {
    btn.addEventListener("click", () => {
      const text = btn.getAttribute("data-text");
      if (text) {
        navigator.clipboard
          .writeText(text)
          .then(() => {
            showToast(
              "Salin Teks",
              "Tanggapan AI telah disalin ke clipboard.",
              "success",
            );
          })
          .catch(() => {
            showToast("Salin Teks", "Gagal menyalin teks.", "error");
          });
      }
    });
  });

  document.querySelectorAll(".btn-like-msg").forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.classList.toggle("active");
      const dislikeBtn = btn.parentElement.querySelector(".btn-dislike-msg");
      if (dislikeBtn) dislikeBtn.classList.remove("active");
      if (btn.classList.contains("active")) {
        showToast(
          "Masukan AI",
          "Terima kasih atas tanggapan positif kamu!",
          "info",
        );
      }
    });
  });

  document.querySelectorAll(".btn-dislike-msg").forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.classList.toggle("active");
      const likeBtn = btn.parentElement.querySelector(".btn-like-msg");
      if (likeBtn) likeBtn.classList.remove("active");
      if (btn.classList.contains("active")) {
        showToast(
          "Masukan AI",
          "Kami mencatat evaluasi ini untuk perbaikan.",
          "info",
        );
      }
    });
  });

  document.querySelectorAll(".btn-share-msg").forEach((btn) => {
    btn.addEventListener("click", () => {
      const text = btn.getAttribute("data-text");
      if (navigator.share) {
        navigator
          .share({
            title: "Jawaban Anya MyFinance",
            text: text,
          })
          .catch(() => {});
      } else {
        navigator.clipboard.writeText(text);
        showToast("Bagikan", "Teks tanggapan disalin untuk dibagikan.", "info");
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
    session.title =
      userText.length > 25 ? userText.slice(0, 25) + "..." : userText;
  }

  const nowTime = new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Add User Message
  session.messages.push({
    id: `msg_${Date.now()}_u`,
    sender: "user",
    text: userText,
    time: nowTime,
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
      <div class="ai-msg-sparkle-avatar">
        <i class="ph-bold ph-robot"></i>
      </div>
      <div class="ai-msg-bubble" style="display: flex; align-items: center; gap: 8px; color: var(--text-muted); font-size: 0.85rem;">
        <i class="ph ph-spinner spin" style="font-size: 1.1rem; color: var(--primary);"></i>
        <span>Anya sedang berpikir...</span>
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
      text:
        aiResult.message || `Saya menemukan rincian transaksi dari pesan kamu:`,
      intent: "transaction",
      data: aiResult.data,
      time: nowTime,
    });
  } else if (aiResult && aiResult.intent === "wishlist" && aiResult.data) {
    session.messages.push({
      id: `msg_${Date.now()}_a`,
      sender: "assistant",
      text:
        aiResult.message || `Target wishlist berhasil dibuat dari pesan kamu:`,
      intent: "wishlist",
      data: aiResult.data,
      time: nowTime,
    });
  } else if (aiResult && aiResult.intent === "summary_request") {
    session.messages.push({
      id: `msg_${Date.now()}_a`,
      sender: "assistant",
      text: aiResult.message || `Berikut ringkasan analisis keuangan kamu:`,
      intent: "summary_request",
      period: aiResult.period || "1_month",
      time: nowTime,
    });
  } else {
    // Check fallback local heuristics
    const lower = userText.toLowerCase();

    if (
      lower.includes("summary") ||
      lower.includes("ringkas") ||
      lower.includes("rangkum") ||
      lower.includes("keuangan") ||
      lower.includes("analisis")
    ) {
      let pk = "1_month";
      if (lower.includes("minggu")) pk = "1_week";
      else if (lower.includes("3 bulan")) pk = "3_months";
      session.messages.push({
        id: `msg_${Date.now()}_a`,
        sender: "assistant",
        text: "Berikut adalah ringkasan keuangan kamu:",
        intent: "summary_request",
        period: pk,
        time: nowTime,
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
          time: nowTime,
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
            time: nowTime,
          });
        } else {
          // General Q&A / Advice response
          let adviceText =
            "Saya siap membantumu mencatat transaksi, wishlist, atau menganalisis keuangan.\n\nContoh yang bisa kamu ketik:\n* **'Makan siang 25rb cash'**\n* **'Nabung laptop 15jt'**\n* **'Ringkas pengeluaran 1 bulan'**";
          if (
            lower.includes("tips") ||
            lower.includes("hemat") ||
            lower.includes("saran")
          ) {
            adviceText =
              "**Tips Keuangan Cerdas Anya**:\n1. Alokasikan 50% untuk kebutuhan utama, 30% opsi kebutuhan sekunder, 20% tabungan.\n2. Selalu catat pengeluaran kecil harian.\n3. Tetapkan target wishlist agar tabunganmu terstruktur.";
          } else if (aiResult && aiResult.message) {
            adviceText = aiResult.message;
          }

          session.messages.push({
            id: `msg_${Date.now()}_a`,
            sender: "assistant",
            text: adviceText,
            intent: "text",
            time: nowTime,
          });
        }
      }
    }
  }

  saveSessions(sessions);
  renderActiveChatMessages();
}
