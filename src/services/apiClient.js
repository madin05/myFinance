// src/services/apiClient.js
import { auth } from "../firebase-config.js";
import { store } from "../store.js";

const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

export const API_URL = isLocalhost ? "http://localhost:5000/api" : "/api";

export function getAuthHeaders(token, isJson = true) {
  const headers = {};
  if (isJson) headers["Content-Type"] = "application/json";
  const activeToken = token || store.user?.token;
  if (activeToken) headers["Authorization"] = `Bearer ${activeToken}`;
  return headers;
}

export async function extractErrorMessage(res, defaultMsg) {
  let detail = "";
  try {
    const data = await res.json();
    detail = data?.message || data?.error || (typeof data === "string" ? data : "");
  } catch {
    try {
      detail = await res.text();
    } catch {
      detail = "";
    }
  }
  return detail || `${defaultMsg} (HTTP ${res.status})`;
}

/**
 * Intelligent fetch wrapper that handles credentials, automatic Firebase ID Token
 * refresh on 401 Unauthorized responses, session cookie renewal, and request retry.
 */
export async function apiFetch(url, options = {}) {
  options.credentials = options.credentials || "include";
  options.headers = options.headers || {};

  // Attach Bearer token if not explicitly provided
  if (!options.headers["Authorization"]) {
    const token = store.user?.token;
    if (token) {
      options.headers["Authorization"] = `Bearer ${token}`;
    }
  }

  let res = await fetch(url, options);

  // If 401 Unauthorized occurs, attempt background token refresh & retry
  if (res.status === 401 && auth.currentUser) {
    console.warn("[apiClient] Session expired (401). Auto-refreshing Firebase token...");
    try {
      const newToken = await auth.currentUser.getIdToken(true);
      if (newToken && store.user) {
        store.user.token = newToken;
        store.save();

        // Renew backend session cookie in background
        fetch(`${API_URL}/auth/session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: newToken }),
          credentials: "include",
        }).catch(() => {});

        // Update authorization header and retry request
        options.headers["Authorization"] = `Bearer ${newToken}`;
        res = await fetch(url, options);
      }
    } catch (err) {
      console.error("[apiClient] Auto token refresh failed:", err);
    }
  }

  return res;
}
