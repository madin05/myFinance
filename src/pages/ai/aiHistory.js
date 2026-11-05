// src/pages/ai/aiHistory.js
// Sidebar History Panel, Drawer Toggling, Pinning, and Deleting Sessions

import { escapeHtml } from "../../utils.js";
import { aiState, loadSessions, saveSessions } from "./aiState.js";

/**
 * Open Mobile Sidebar Drawer
 */
export function openAiDrawer() {
  document.getElementById("ai-history-panel")?.classList.add("mobile-active");
  document.getElementById("ai-drawer-backdrop")?.classList.add("mobile-active");
  document.body.style.overflow = "hidden";
}

/**
 * Close Mobile Sidebar Drawer
 */
export function closeAiDrawer() {
  document.getElementById("ai-history-panel")?.classList.remove("mobile-active");
  const drawerBackdrop = document.getElementById("ai-drawer-backdrop");
  if (drawerBackdrop) drawerBackdrop.classList.remove("mobile-active");
  document.body.style.overflow = "";
}

/**
 * Render history items in left sidebar
 */
export function renderHistorySidebar(onSelectSession) {
  const container = document.getElementById("ai-history-list");
  if (!container) return;

  let sessions = loadSessions();
  if (sessions.length === 0) {
    container.innerHTML = `<div class="ai-history-empty">Belum ada riwayat percakapan.</div>`;
    return;
  }

  // Filter search
  if (aiState.historySearchQuery.trim()) {
    const query = aiState.historySearchQuery.toLowerCase().trim();
    sessions = sessions.filter((s) =>
      (s.title || "").toLowerCase().includes(query),
    );
  }

  // Sort pinned first, then by date descending
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
      const isActive = s.id === aiState.activeSessionId ? "active" : "";
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

  // Attach click events to switch active chat
  container.querySelectorAll(".ai-history-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      if (
        e.target.closest(".ai-history-delete-btn") ||
        e.target.closest(".ai-history-pin-btn")
      )
        return;
      aiState.activeSessionId = item.getAttribute("data-id");
      renderHistorySidebar(onSelectSession);
      closeAiDrawer();
      if (typeof onSelectSession === "function") {
        onSelectSession();
      }
    });
  });

  // Pin / Unpin events
  container.querySelectorAll(".ai-history-pin-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const idToPin = btn.getAttribute("data-pin-id");
      let allSessions = loadSessions();
      const targetSess = allSessions.find((item) => item.id === idToPin);
      if (targetSess) {
        targetSess.pinned = !targetSess.pinned;
        saveSessions(allSessions);
        renderHistorySidebar(onSelectSession);
      }
    });
  });

  // Delete session events
  container.querySelectorAll(".ai-history-delete-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const idToDelete = btn.getAttribute("data-delete-id");
      let allSessions = loadSessions();
      allSessions = allSessions.filter((s) => s.id !== idToDelete);
      if (aiState.activeSessionId === idToDelete) {
        aiState.activeSessionId = allSessions[0]?.id || null;
      }
      saveSessions(allSessions);
      renderHistorySidebar(onSelectSession);
      if (typeof onSelectSession === "function") {
        onSelectSession();
      }
    });
  });
}
