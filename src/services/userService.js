// src/services/userService.js
import { API_URL, apiFetch, getAuthHeaders, extractErrorMessage } from "./apiClient.js";

export const userService = {
  async syncUser(token, extraData = {}) {
    const res = await apiFetch(`${API_URL}/users/sync`, {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify(extraData),
      credentials: "include",
    });
    if (!res.ok) return null;
    return await res.json();
  },

  async updateProfile(token, profileData) {
    const res = await apiFetch(`${API_URL}/users/sync`, {
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

  async toggle2FA(token, enabled, password = null) {
    const res = await apiFetch(`${API_URL}/auth/2fa/toggle`, {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify({ enabled, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gagal memproses 2FA");
    return data;
  },

  async verify2FAMagicLink(rawToken) {
    const res = await apiFetch(`${API_URL}/auth/2fa/verify?token=${encodeURIComponent(rawToken)}`, {
      method: "GET",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gagal verifikasi 2FA");
    return data;
  },

  async changePassword(token, oldPassword, newPassword) {
    const res = await apiFetch(`${API_URL}/users/update-password`, {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gagal ubah password");
    return data;
  },

  async deleteAccount(token) {
    const res = await apiFetch(`${API_URL}/users`, {
      method: "DELETE",
      headers: getAuthHeaders(token, false),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Gagal hapus akun");
    }
    return true;
  },

  async requestDeleteAccountOtp(token) {
    const res = await apiFetch(`${API_URL}/users/delete-request`, {
      method: "POST",
      headers: getAuthHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gagal mengirim OTP hapus akun");
    return data;
  },

  async confirmDeleteAccount(token, otp) {
    const res = await apiFetch(`${API_URL}/users/delete-confirm`, {
      method: "POST",
      headers: getAuthHeaders(token),
      body: JSON.stringify({ otp }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Gagal memproses penghapusan akun");
    return data;
  },

  async createSession(idToken) {
    return apiFetch(`${API_URL}/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      credentials: "include",
    });
  },

  async deleteSession() {
    return apiFetch(`${API_URL}/auth/session`, {
      method: "DELETE",
      credentials: "include",
    });
  },
};
