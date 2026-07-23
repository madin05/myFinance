// src/services/userService.js
import { API_URL, getAuthHeaders, extractErrorMessage } from "./apiClient.js";

export const userService = {
  async syncUser(token, extraData = {}) {
    const res = await fetch(`${API_URL}/users/sync`, {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify(extraData),
      credentials: "include",
    });
    if (!res.ok) return null;
    return await res.json();
  },

  async updateProfile(token, profileData) {
    const res = await fetch(`${API_URL}/users/sync`, {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify(profileData),
    });
    if (!res.ok) {
      const err = await extractErrorMessage(res, "Gagal update profil");
      throw new Error(err);
    }
    return await res.json();
  },

  async update2FA(token, enabled) {
    const res = await fetch(`${API_URL}/users/sync`, {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify({ is2FAEnabled: enabled }),
    });
    if (!res.ok) return false;
    return await res.json();
  },

  async changePassword(token, oldPassword, newPassword) {
    const res = await fetch(`${API_URL}/users/update-password`, {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gagal ubah password");
    return data;
  },

  async deleteAccount(token) {
    const res = await fetch(`${API_URL}/users`, {
      method: "DELETE",
      headers: getAuthHeaders(token, false),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Gagal hapus akun");
    }
    return true;
  },

  async createSession(idToken) {
    return fetch(`${API_URL}/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      credentials: "include",
    });
  },

  async deleteSession() {
    return fetch(`${API_URL}/auth/session`, {
      method: "DELETE",
      credentials: "include",
    });
  },
};
