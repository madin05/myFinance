// src/services/accountService.js
import { API_URL, getAuthHeaders } from "./apiClient.js";

export const accountService = {
  async fetchAccounts(token) {
    try {
      const res = await fetch(`${API_URL}/accounts`, {
        headers: getAuthHeaders(token, false),
        credentials: "include",
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async syncAccounts(token, accounts) {
    const res = await fetch(`${API_URL}/accounts/sync`, {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify({ accounts }),
      credentials: "include",
    });
    return res.ok;
  },

  async createAccount(token, account) {
    const res = await fetch(`${API_URL}/accounts`, {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify(account),
      credentials: "include",
    });
    if (!res.ok) return null;
    return await res.json();
  },

  async updateAccount(token, id, data) {
    const res = await fetch(`${API_URL}/accounts/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(token),
      body: JSON.stringify(data),
      credentials: "include",
    });
    return res.ok;
  },

  async deleteAccount(token, id) {
    const res = await fetch(`${API_URL}/accounts/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(token, false),
      credentials: "include",
    });
    return res.ok;
  },
};
