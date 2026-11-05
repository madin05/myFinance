// src/pages/ai/aiService.js
// Communication service with Backend AI & Real-time Financial Context Builder

import { store } from "../../store.js";
import { API_URL, apiFetch, getAuthHeaders } from "../../services/apiClient.js";

/**
 * Build rich financial context snapshot from user's current store
 */
export function buildAiFinancialContext() {
  const txs = store.transactions || [];
  const budgets = store.budgets || [];
  const savings = store.savings || [];
  const accounts = store.saldos || [];

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let currentMonthIncome = 0;
  let currentMonthExpense = 0;
  const expenseByCategory = {};
  const txCountByCategory = {};
  const currentMonthTxs = [];

  txs.forEach((t) => {
    const d = new Date(t.tanggal);
    if (d >= startOfMonth && d <= now) {
      const amt = Math.abs(t.harga || t.amount || 0);
      if (t.type === "income") {
        currentMonthIncome += amt;
      } else {
        currentMonthExpense += amt;
        expenseByCategory[t.kategori] = (expenseByCategory[t.kategori] || 0) + amt;
        txCountByCategory[t.kategori] = (txCountByCategory[t.kategori] || 0) + 1;
        currentMonthTxs.push(t);
      }
    }
  });

  const breakdown = Object.entries(expenseByCategory).map(([cat, amt]) => {
    const percent = currentMonthExpense > 0 ? Math.round((amt / currentMonthExpense) * 100) : 0;
    return {
      kategori: cat,
      amount: amt,
      count: txCountByCategory[cat] || 1,
      percent,
    };
  }).sort((a, b) => b.amount - a.amount);

  const budgetList = budgets.map((b) => {
    const used = expenseByCategory[b.kategori] || 0;
    const limit = Number(b.limit || b.nominal || 0);
    const percent = limit > 0 ? Math.round((used / limit) * 100) : 0;
    return {
      kategori: b.kategori,
      limit,
      used,
      percent,
      isOver: used > limit && limit > 0,
    };
  });

  const recentTransactions = [...txs]
    .sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal))
    .slice(0, 15)
    .map((t) => ({
      tanggal: t.tanggal,
      kategori: t.kategori,
      keterangan: t.keterangan || t.kategori,
      harga: t.harga,
      type: t.type,
      metode: t.metode || "Cash",
    }));

  return {
    userName: store.user?.name || "Pengguna",
    currentMonth: {
      income: currentMonthIncome,
      expense: currentMonthExpense,
      netBalance: currentMonthIncome - currentMonthExpense,
      txCount: currentMonthTxs.length,
      breakdown,
      recentTransactions,
    },
    budgets: budgetList,
    savings: savings.map((s) => ({
      name: s.name || s.nama,
      target: Number(s.target || 0),
      current: Number(s.current || s.terkumpul || 0),
    })),
    accounts: accounts.map((a) => ({
      nama: a.nama,
      saldo: Number(a.saldo || 0),
    })),
  };
}

/**
 * Call Gemini AI Backend for multi-turn chat parsing & responses
 */
export async function queryGemini(text, chatHistory = []) {
  if (!store.user?.token) return null;
  const financialContext = buildAiFinancialContext();
  try {
    const res = await apiFetch(`${API_URL}/ai/parse`, {
      method: "POST",
      headers: getAuthHeaders(store.user.token),
      body: JSON.stringify({
        text,
        financialContext,
        chatHistory: Array.isArray(chatHistory) ? chatHistory.slice(-8) : [],
      }),
    });
    if (!res.ok) {
      console.warn(`[aiService] Backend AI request failed with HTTP ${res.status}. Falling back to offline NLP parser.`);
      return null;
    }
    const json = await res.json();
    if (json.intent === "fallback") return null;
    return json;
  } catch (err) {
    console.warn(`[aiService] Unable to reach Backend AI (${API_URL}/ai/parse):`, err.message || err);
    return null;
  }
}
