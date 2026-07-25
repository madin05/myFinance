// src/services/budgetService.js
import { API_URL, getAuthHeaders } from "./apiClient.js";

export const budgetService = {
  async fetchBudgets(token, period) {
    try {
      const url = period ? `${API_URL}/budgets?period=${period}` : `${API_URL}/budgets`;
      const res = await fetch(url, {
        headers: getAuthHeaders(token, false),
        credentials: "include",
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async updateBudget(token, category, amount, period) {
    const res = await fetch(`${API_URL}/budgets`, {
      method: "POST",
      headers: getAuthHeaders(token),
      credentials: "include",
      body: JSON.stringify({ category, amount, period }),
    });
    if (!res.ok) return null;
    return await res.json();
  },

  async deleteBudget(token, id) {
    const res = await fetch(`${API_URL}/budgets/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(token, false),
      credentials: "include",
    });
    if (!res.ok) return null;
    return res.ok;
  },
};
