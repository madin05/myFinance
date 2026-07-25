// src/services/savingsService.js
import { API_URL, getAuthHeaders, extractErrorMessage } from "./apiClient.js";

export const savingsService = {
  async fetchSavings(token) {
    try {
      const res = await fetch(`${API_URL}/savings`, {
        headers: getAuthHeaders(token, false),
        credentials: "include",
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async createSaving(token, goal) {
    const res = await fetch(`${API_URL}/savings`, {
      method: "POST",
      headers: getAuthHeaders(token),
      credentials: "include",
      body: JSON.stringify({
        name: goal.name,
        targetAmount: goal.target,
        currentAmount: goal.current || 0,
        icon: goal.icon,
        color: goal.color,
      }),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, "Gagal simpan wishlist"));
    return await res.json();
  },

  async updateSaving(token, id, data) {
    const res = await fetch(`${API_URL}/savings/${id}`, {
      method: "PATCH",
      headers: getAuthHeaders(token),
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, "Gagal update wishlist"));
    return await res.json();
  },

  async deleteSaving(token, id) {
    const res = await fetch(`${API_URL}/savings/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(token, false),
      credentials: "include",
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, "Gagal hapus wishlist"));
    return true;
  },

  async reorderSavings(token, orderedIds) {
    const res = await fetch(`${API_URL}/savings/reorder`, {
      method: "POST",
      headers: getAuthHeaders(token),
      credentials: "include",
      body: JSON.stringify({ orderedIds }),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, "Gagal simpan urutan wishlist"));
    return await res.json();
  },
};
