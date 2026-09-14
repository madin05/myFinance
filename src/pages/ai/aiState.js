// src/pages/ai/aiState.js
// State & LocalStorage session management for AI Assistant (Anya)

import { store } from "../../store.js";

// Storage Key per user
export function getStorageKey() {
  const uid = store.user?.uid || "guest";
  return `myfinance_ai_sessions_${uid}`;
}

// Storage Helpers
export function loadSessions() {
  try {
    const raw = localStorage.getItem(getStorageKey());
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn("Failed to load AI sessions:", e);
    return [];
  }
}

export function saveSessions(sessions) {
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(sessions));
  } catch (e) {
    console.warn("Failed to save AI sessions:", e);
  }
}

export function createNewSessionObject(title = "Percakapan Baru") {
  return {
    id: `session_${Date.now()}`,
    title,
    createdAt: new Date().toISOString(),
    pinned: false,
    messages: [],
  };
}

// Module State Store
export const aiState = {
  activeSessionId: null,
  currentModelName: "Flash Mendalam",
  historySearchQuery: "",
  isSidebarCollapsedDesktop: false,
};
