// src/services/transactionService.js
import { API_URL, apiFetch, getAuthHeaders, extractErrorMessage } from "./apiClient.js";

export const transactionService = {
  async fetchTransactions(token) {
    try {
      const res = await apiFetch(`${API_URL}/transactions`, {
        headers: getAuthHeaders(token, false),
        credentials: "include",
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async createTransaction(token, txData) {
    const res = await apiFetch(`${API_URL}/transactions`, {
      method: "POST",
      headers: getAuthHeaders(token),
      credentials: "include",
      body: JSON.stringify(txData),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, "Gagal simpan transaksi"));
    return await res.json();
  },

  async updateTransaction(token, id, txData) {
    const res = await apiFetch(`${API_URL}/transactions/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(token),
      credentials: "include",
      body: JSON.stringify(txData),
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, "Gagal update transaksi"));
    return await res.json();
  },

  async deleteTransaction(token, id) {
    const res = await apiFetch(`${API_URL}/transactions/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(token, false),
      credentials: "include",
    });
    if (!res.ok) throw new Error(await extractErrorMessage(res, "Gagal hapus transaksi"));
    return true;
  },

  async scanReceipt(token, base64, mimeType = "image/jpeg") {
    let res;
    try {
      res = await apiFetch(`${API_URL}/receipts/scan`, {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(token),
        body: JSON.stringify({ image: base64, mimeType }),
      });
    } catch {
      throw new Error("Sistem sedang bermasalah. Coba lagi nanti ya, bre!");
    }

    let json;
    try {
      json = await res.json();
    } catch {
      throw new Error("Sistem sedang bermasalah. Coba lagi nanti ya, bre!");
    }

    if (!res.ok) {
      if (res.status === 422 && json?.error) {
        throw new Error(json.error);
      }
      if (res.status === 413) {
        throw new Error("Ukuran gambar terlalu besar. Maksimal 4MB.");
      }
      throw new Error("Sistem sedang bermasalah. Coba lagi nanti ya, bre!");
    }
    if (!json?.success || !json?.data) {
      throw new Error("Sistem sedang bermasalah. Coba lagi nanti ya, bre!");
    }

    return json.data;
  },
};
