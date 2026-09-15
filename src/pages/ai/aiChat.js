// src/pages/ai/aiChat.js
// Active Chat Rendering, Message Processing, and Action Handlers for Anya AI

import { store, formatRupiah } from "../../store.js";
import { showToast } from "../../components/notifications.js";
import { escapeHtml } from "../../utils.js";
import {
  parseNaturalLanguageTx,
  parseNaturalLanguageWishlist,
  parseNaturalLanguageMultiLocal,
  generateFinancialSummary,
} from "../../components/smartAiInput.js";
import {
  aiState,
  loadSessions,
  saveSessions,
  createNewSessionObject,
} from "./aiState.js";
import { queryGemini, buildAiFinancialContext } from "./aiService.js";
import {
  formatResponseMarkdown,
  renderTransactionCardInChat,
  renderWishlistCardInChat,
  renderMultiItemsContainer,
  showCopySuccess,
} from "./aiRenderers.js";
import { renderHistorySidebar } from "./aiHistory.js";

/**
 * Scroll chat messages viewport to bottom
 */
export function scrollToBottom() {
  const container = document.getElementById("ai-chat-messages");
  if (container) {
    // Instant pin (scroll-behavior: auto) — always lock to newest message.
    container.scrollTop = container.scrollHeight;
  }
}

/**
 * Render active session messages inside chat viewport
 */
export function renderActiveChatMessages() {
  const container = document.getElementById("ai-chat-messages");
  if (!container) return;

  const sessions = loadSessions();
  const activeSession = sessions.find((s) => s.id === aiState.activeSessionId);

  if (
    !activeSession ||
    !activeSession.messages ||
    activeSession.messages.length === 0
  ) {
    container.innerHTML = `
      <div class="ai-welcome-hero">
        <div class="ai-welcome-sparkle-avatar">
          <img src="/assets/technical-support.svg" alt="Anya AI" class="ai-avatar-icon">
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
    container.scrollTop = 0; // empty session/welcome — nothing to pin
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

      if (msg.intent === "multi" && Array.isArray(msg.items)) {
        contentHtml += renderMultiItemsContainer(msg.items);
      } else if (msg.intent === "transaction" && msg.data) {
        contentHtml += renderTransactionCardInChat(msg.data, msg.saved);
      } else if (msg.intent === "wishlist" && msg.data) {
        contentHtml += renderWishlistCardInChat(msg.data, msg.saved);
      } else if (msg.intent === "summary_request") {
        contentHtml += generateFinancialSummary(msg.period || "1_month");
      }

      return `
      <div class="ai-msg-row assistant" data-msg-id="${msg.id}">
        <div class="ai-msg-sparkle-avatar">
          <img src="/assets/technical-support.svg" alt="Anya AI" class="ai-avatar-icon">
        </div>
        <div class="ai-msg-content-wrapper">
          <div class="ai-msg-bubble">
            ${contentHtml}
          </div>
          
          <!-- Gemini Response Action Buttons Bar -->
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
            <button type="button" class="ai-msg-act-btn btn-copy-msg" data-text="${escapeHtml(msg.text)}" title="Salin ke clipboard" aria-label="Salin tanggapan">
              <i class="ph ph-copy"></i>
              <span class="ai-act-label">Salin</span>
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

  // Always lock the viewport to the newest message after (re)rendering.
  scrollToBottom();
}

/**
 * Bind save buttons inside Transaction and Wishlist action cards
 */
export function bindChatActionButtons() {
  // Individual Transaction Save
  document.querySelectorAll(".btn-save-chat-tx").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const raw = btn.getAttribute("data-tx");
      if (!raw) return;
      try {
        const txRaw = JSON.parse(raw);
        btn.disabled = true;
        btn.innerHTML = `<i class="ph ph-spinner spin"></i> Menyimpan...`;

        // Normalize payload: match the same format as modal.js
        const normalizedHarga =
          txRaw.type === "expense"
            ? -Math.abs(txRaw.harga)
            : Math.abs(txRaw.harga);

        const payload = {
          tanggal: txRaw.tanggal || new Date().toISOString().split("T")[0],
          kategori: txRaw.kategori || "Lain-lain",
          metode: txRaw.metode || "Cash",
          akun: txRaw.akun || "",
          keterangan: txRaw.keterangan || txRaw.kategori || "Transaksi AI",
          harga: normalizedHarga,
          type: txRaw.type || "expense",
        };

        await store.addTransaction(payload);

        // Mark this message as saved in localStorage session
        try {
          const sessions = loadSessions();
          const session = sessions.find((s) => s.id === aiState.activeSessionId);
          if (session) {
            const msgEl = btn.closest("[data-msg-id]");
            const msgId = msgEl?.getAttribute("data-msg-id");
            const itemIdxStr = btn.getAttribute("data-item-idx");
            if (msgId) {
              const msg = session.messages.find((m) => m.id === msgId);
              if (msg) {
                if (itemIdxStr !== null && Array.isArray(msg.items)) {
                  const idx = parseInt(itemIdxStr, 10);
                  if (msg.items[idx]) msg.items[idx].saved = true;
                } else {
                  msg.saved = true;
                }
              }
            } else {
              const txMsgs = session.messages.filter(
                (m) => m.intent === "transaction" && m.data && !m.saved,
              );
              if (txMsgs.length > 0) txMsgs[txMsgs.length - 1].saved = true;
            }
            saveSessions(sessions);
          }
        } catch (_) {
          /* non-critical */
        }

        btn.innerHTML = `<i class="ph ph-check"></i> Tersimpan`;
        showToast(
          "Berhasil!",
          `Transaksi "${payload.keterangan}" (${formatRupiah(Math.abs(payload.harga))}) tersimpan.`,
          "success",
        );
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = `<i class="ph-bold ph-plus"></i> Simpan Transaksi`;
        showToast(
          "Gagal Menyimpan",
          err.message || "Gagal menyimpan transaksi.",
          "error",
        );
      }
    });
  });

  // Individual Wishlist Save
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

        // Mark this message item as saved in localStorage session
        try {
          const sessions = loadSessions();
          const session = sessions.find((s) => s.id === aiState.activeSessionId);
          if (session) {
            const msgEl = btn.closest("[data-msg-id]");
            const msgId = msgEl?.getAttribute("data-msg-id");
            const itemIdxStr = btn.getAttribute("data-item-idx");
            if (msgId) {
              const msg = session.messages.find((m) => m.id === msgId);
              if (msg) {
                if (itemIdxStr !== null && Array.isArray(msg.items)) {
                  const idx = parseInt(itemIdxStr, 10);
                  if (msg.items[idx]) msg.items[idx].saved = true;
                } else {
                  msg.saved = true;
                }
              }
            }
            saveSessions(sessions);
          }
        } catch (_) {
          /* non-critical */
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

  // Batch Save All Multi Items
  document.querySelectorAll(".btn-save-all-multi").forEach((saveAllBtn) => {
    saveAllBtn.addEventListener("click", async () => {
      const wrapper = saveAllBtn.closest(".ai-multi-items-wrapper");
      if (!wrapper) return;
      const txBtns = wrapper.querySelectorAll(".btn-save-chat-tx:not(:disabled)");
      const wlBtns = wrapper.querySelectorAll(".btn-save-chat-wishlist:not(:disabled)");
      
      saveAllBtn.disabled = true;
      saveAllBtn.innerHTML = `<i class="ph ph-spinner spin"></i> Menyimpan Semua...`;

      for (const btn of txBtns) {
        btn.click();
        await new Promise(r => setTimeout(r, 120));
      }
      for (const btn of wlBtns) {
        btn.click();
        await new Promise(r => setTimeout(r, 120));
      }

      saveAllBtn.innerHTML = `<i class="ph ph-check-circle"></i> Semua Tersimpan`;
    });
  });
}

/**
 * Bind message response action icons (Thumbs Up, Thumbs Down, Copy, Share)
 */
export function bindMessageResponseActions() {
  document.querySelectorAll(".btn-copy-msg").forEach((btn) => {
    btn.addEventListener("click", () => {
      const text = btn.getAttribute("data-text");
      if (!text) return;
      navigator.clipboard
        .writeText(text)
        .then(() => {
          showCopySuccess(btn);
        })
        .catch(() => {
          showToast("Salin Teks", "Gagal menyalin teks.", "error");
        });
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

/**
 * Main Orchestrator for sending user prompt to AI and handling conversation flow
 */
export async function processUserChatMessage(userText) {
  let sessions = loadSessions();
  let session = sessions.find((s) => s.id === aiState.activeSessionId);

  if (!session) {
    session = createNewSessionObject(userText.slice(0, 24));
    sessions.unshift(session);
    aiState.activeSessionId = session.id;
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
  renderHistorySidebar(() => renderActiveChatMessages(true));
  renderActiveChatMessages(true);

  // Show AI typing indicator
  const container = document.getElementById("ai-chat-messages");
  if (container) {
    const typingEl = document.createElement("div");
    typingEl.id = "ai-typing-indicator";
    typingEl.className = "ai-msg-row assistant";
    typingEl.innerHTML = `
      <div class="ai-msg-sparkle-avatar">
        <img src="/assets/technical-support.svg" alt="Anya AI" class="ai-avatar-icon">
      </div>
      <div class="ai-msg-bubble" style="display: flex; align-items: center; gap: 8px; color: var(--text-muted); font-size: 0.85rem;">
        <i class="ph ph-spinner spin" style="font-size: 1.1rem; color: var(--primary);"></i>
        <span>Anya sedang berpikir...</span>
      </div>
    `;
    container.appendChild(typingEl);
    scrollToBottom();
  }

  // Extract chat history before this message
  const chatHistory = session.messages.slice(-8);

  // Call AI Backend / Fallback Parser
  let aiResult = await queryGemini(userText, chatHistory);

  // Remove typing indicator
  document.getElementById("ai-typing-indicator")?.remove();

  // Reload fresh session
  sessions = loadSessions();
  session = sessions.find((s) => s.id === aiState.activeSessionId) || session;

  // Process Gemini response and persist/render
  if (Array.isArray(aiResult) && aiResult.length > 0) {
    session.messages.push({
      id: `msg_${Date.now()}_a`,
      sender: "assistant",
      text: `Anya menemukan ${aiResult.length} item dari pesan kamu:`,
      intent: "multi",
      items: aiResult,
      time: nowTime,
    });
    saveSessions(sessions);
    renderActiveChatMessages();
    return;
  }

  if (aiResult && aiResult.intent) {
    // Transaction intent
    if (aiResult.intent === "transaction" && aiResult.data) {
      session.messages.push({
        id: `msg_${Date.now()}_a`,
        sender: "assistant",
        text:
          aiResult.message || "Saya menemukan rincian transaksi dari pesan kamu:",
        intent: "transaction",
        data: aiResult.data,
        time: nowTime,
      });
      saveSessions(sessions);
      renderActiveChatMessages();
      return;
    }
    // Wishlist intent
    if (aiResult.intent === "wishlist" && aiResult.data) {
      session.messages.push({
        id: `msg_${Date.now()}_a`,
        sender: "assistant",
        text:
          aiResult.message || "Target wishlist berhasil dibuat dari pesan kamu:",
        intent: "wishlist",
        data: aiResult.data,
        time: nowTime,
      });
      saveSessions(sessions);
      renderActiveChatMessages();
      return;
    }
    // Summary request intent
    if (aiResult.intent === "summary_request") {
      session.messages.push({
        id: `msg_${Date.now()}_a`,
        sender: "assistant",
        text: aiResult.message || "Berikut ringkasan analisis keuangan kamu:",
        intent: "summary_request",
        period: aiResult.period || "1_month",
        time: nowTime,
      });
      saveSessions(sessions);
      renderActiveChatMessages();
      return;
    }
    // Unknown / chat intent – show message
    if (aiResult.intent === "unknown" || aiResult.intent === "chat") {
      session.messages.push({
        id: `msg_${Date.now()}_a`,
        sender: "assistant",
        text: aiResult.message || "Saya di sini untuk membantu!",
        intent: "text",
        time: nowTime,
      });
      saveSessions(sessions);
      renderActiveChatMessages();
      return;
    }
  }

  // Fallback to local heuristics when Gemini didn't provide a usable intent
  const lower = userText.toLowerCase();

  if (
    lower.includes("summary") ||
    lower.includes("ringkas") ||
    lower.includes("rangkum") ||
    lower.includes("keuangan") ||
    lower.includes("analisis")
  ) {
    let pk = "1_month";
    if (lower.includes("minggu") || lower.includes("7 hari")) pk = "1_week";
    else if (lower.includes("3 bulan")) pk = "3_months";
    else if (lower.includes("tahun") || lower.includes("1 thn")) pk = "1_year";
    session.messages.push({
      id: `msg_${Date.now()}_a`,
      sender: "assistant",
      text: "Siap! Anya buatin ringkasan analisis keuangan kamu ya 📊",
      intent: "summary_request",
      period: pk,
      time: nowTime,
    });
  } else {
    const localResult = parseNaturalLanguageMultiLocal(userText);

    // 1. Multiple transactions / wishlists parsed offline
    if (Array.isArray(localResult) && localResult.length > 0) {
      session.messages.push({
        id: `msg_${Date.now()}_a`,
        sender: "assistant",
        text: `Anya menemukan ${localResult.length} item dari pesan kamu:`,
        intent: "multi",
        items: localResult,
        time: nowTime,
      });
      saveSessions(sessions);
      renderActiveChatMessages();
      return;
    }

    // 2. Single item parsed offline
    if (localResult && localResult.intent) {
      if (localResult.intent === "wishlist" && localResult.data) {
        session.messages.push({
          id: `msg_${Date.now()}_a`,
          sender: "assistant",
          text: localResult.message || `Mantap! Target "${localResult.data.name}" sudah Anya deteksi buat Wishlist ⭐`,
          intent: "wishlist",
          data: localResult.data,
          time: nowTime,
        });
        saveSessions(sessions);
        renderActiveChatMessages();
        return;
      }

      if (localResult.intent === "transaction" && localResult.data) {
        const isInc = localResult.data.type === "income";
        session.messages.push({
          id: `msg_${Date.now()}_a`,
          sender: "assistant",
          text: localResult.message || (isInc
            ? "Mantap! Rincian pemasukan kamu sudah siap dicatat ya 🤑"
            : "Siap! Rincian transaksi pengeluaran kamu sudah Anya siapkan ya! 📝"),
          intent: "transaction",
          data: localResult.data,
          time: nowTime,
        });
        saveSessions(sessions);
        renderActiveChatMessages();
        return;
      }
    }

    // General Q&A / Advice response with Data-Grounding
    let adviceText =
      "Halo! Anya di sini siap bantu kamu mencatat transaksi, wishlist, atau menganalisis keuangan.\n\nContoh yang bisa kamu ketik:\n* **'Nasi padang 20rb cash'**\n* **'Bensin pertalite gocap'**\n* **'Nabung laptop 15jt'**\n* **'Ringkas pengeluaran 1 bulan'**";
    if (
      lower.includes("tips") ||
      lower.includes("hemat") ||
      lower.includes("saran") ||
      lower.includes("minus") ||
      lower.includes("boros") ||
      lower.includes("evaluasi") ||
      lower.includes("pendapat")
    ) {
      const fc = buildAiFinancialContext();
      const inc = fc.currentMonth.income;
      const exp = fc.currentMonth.expense;
      const net = inc - exp;
      const top = fc.currentMonth.breakdown[0];

      if (net < 0 && top) {
        adviceText = `Wah, kalau Anya cek catatanmu bulan ini, kamu sedang **defisit ${formatRupiah(Math.abs(net))}** (Pemasukan ${formatRupiah(inc)} vs Pengeluaran ${formatRupiah(exp)}).\n\n📌 **Fokus Utama Penghematan**:\n1. Pos pengeluaran terbesarmu ada di **${top.kategori}** sebesar **${formatRupiah(top.amount)} (${top.percent}%)**. Pangkas belanja di pos ini untuk menutup minus.\n2. Terapkan batas budget harian agar arus kas terkendali.\n3. Tunda pengeluaran sekunder/wishlist sampai arus kas kembali surplus.\n\nMau Anya bantu bikinin batasan budget harian untuk kategori ${top.kategori}? 😊`;
      } else if (top) {
        adviceText = `Kondisi keuanganmu bulan ini **surplus ${formatRupiah(net)}** (Pemasukan ${formatRupiah(inc)} vs Pengeluaran ${formatRupiah(exp)}). Bagus banget!\n\n💡 **Saran Anya**:\n1. Pos terbesarmu saat ini di **${top.kategori} (${formatRupiah(top.amount)})**.\n2. Sisihkan minimal 20% dari surplusmu ke Wishlist atau Tabungan Darurat.\n\nMau kita alokasikan sebagian surplus ini ke target wishlist-mu sekarang? ⭐`;
      } else {
        adviceText =
          "**Tips Keuangan Cerdas Anya**:\n1. Alokasikan 50% untuk kebutuhan utama, 30% opsi kebutuhan sekunder, 20% tabungan.\n2. Selalu catat pengeluaran kecil harian agar tidak boncos.\n3. Tetapkan target wishlist agar tabunganmu terstruktur.\n\nAda kategori pengeluaran tertentu yang mau kita evaluasi bareng? 😊";
      }
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

  saveSessions(sessions);
  renderActiveChatMessages(true);
}

