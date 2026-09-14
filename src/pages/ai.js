// src/pages/ai.js
// Dedicated AI Assistant Page with Gemini Mobile UI & Persistent Chat History (Modularized)

import { escapeHtml } from "../utils.js";
import { showToast } from "../components/notifications.js";
import { openScanReceiptModal } from "../components/scanReceipt.js";
import {
  aiState,
  loadSessions,
  saveSessions,
  createNewSessionObject,
} from "./ai/aiState.js";
import {
  openAiDrawer,
  closeAiDrawer,
  renderHistorySidebar,
} from "./ai/aiHistory.js";
import {
  renderActiveChatMessages,
  processUserChatMessage,
  scrollToBottom,
} from "./ai/aiChat.js";

// Re-export buildAiFinancialContext for backwards-compatibility
export { buildAiFinancialContext } from "./ai/aiService.js";

/**
 * Pin the chat viewport to the latest message when the tab/app regains focus.
 * (No-op when the chat container isn't mounted.)
 */
function repinChatToBottom() {
  if (document.visibilityState === "visible") scrollToBottom();
}

/**
 * Render Main Dedicated AI Assistant Page (Gemini Mobile UI)
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

  if (!aiState.activeSessionId || !sessions.some((s) => s.id === aiState.activeSessionId)) {
    aiState.activeSessionId = sessions[0].id;
  }

  app.innerHTML = `
    <div class="ai-page-container ${aiState.isSidebarCollapsedDesktop ? "sidebar-collapsed" : ""}">
      <!-- Backdrop for mobile drawer -->
      <div class="ai-drawer-backdrop" id="ai-drawer-backdrop"></div>

      <!-- 1. Left Sidebar / Drawer (Gemini Mobile Drawer) -->
      <aside class="ai-history-panel" id="ai-history-panel">
        <!-- Drawer Header -->
        <div class="ai-history-panel-header">
          <div class="ai-history-brand">
            <div class="ai-history-sparkle-icon">
              <img src="/assets/technical-support.svg" alt="Anya AI" class="ai-avatar-icon">
            </div>
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
            <input type="text" id="ai-history-search-input" placeholder="Telusuri percakapan" value="${escapeHtml(aiState.historySearchQuery)}" />
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

  renderHistorySidebar(() => renderActiveChatMessages());
  renderActiveChatMessages();
}

/**
 * Bind interactive events on the AI Assistant page
 */
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

  const startNewChat = () => {
    const sessions = loadSessions();
    const newSess = createNewSessionObject("Percakapan Baru");
    sessions.unshift(newSess);
    aiState.activeSessionId = newSess.id;
    saveSessions(sessions);
    closeAiDrawer();
    renderHistorySidebar(() => renderActiveChatMessages(true));
    renderActiveChatMessages(true);
    if (inputEl) inputEl.focus();
  };

  if (newChatBtnTop) newChatBtnTop.addEventListener("click", startNewChat);
  if (newChatBtnSidebar)
    newChatBtnSidebar.addEventListener("click", startNewChat);

  if (toggleHistoryBtn) toggleHistoryBtn.addEventListener("click", openAiDrawer);
  if (closeHistoryBtn) closeHistoryBtn.addEventListener("click", closeAiDrawer);
  if (drawerBackdrop) drawerBackdrop.addEventListener("click", closeAiDrawer);

  document.addEventListener("click", () => {
    if (plusMenu) plusMenu.style.display = "none";
  });

  // History Search Filter
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      aiState.historySearchQuery = e.target.value;
      renderHistorySidebar(() => renderActiveChatMessages(true));
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
        actionIcon.parentElement?.setAttribute("title", "Kirim Pesan");
      } else {
        actionIcon.className = "ph ph-microphone";
        actionIcon.parentElement?.setAttribute("title", "Perintah Suara");
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
      actionIcon.parentElement?.setAttribute("title", "Perintah Suara");
    }
    processUserChatMessage(text);
  };

  if (actionIconBtn) {
    actionIconBtn.addEventListener("click", () => {
      const text = inputEl ? inputEl.value.trim() : "";
      if (text) {
        handleSend();
      } else {
        showToast("Suara AI", "Fitur Perintah Suara siap digunakan.", "info");
      }
    });
  }

  // Quick chips
  document.querySelectorAll(".ai-chip-btn").forEach((chip) => {
    chip.addEventListener("click", () => {
      const chipText = chip.getAttribute("data-text");
      if (chipText) {
        processUserChatMessage(chipText);
      }
    });
  });

  // Re-lock the chat to the newest message whenever the tab/app becomes
  // active again. Named handler => repeated binding is deduped by the browser.
  document.addEventListener("visibilitychange", repinChatToBottom);
  window.addEventListener("focus", repinChatToBottom);
}
