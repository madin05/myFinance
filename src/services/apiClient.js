// src/services/apiClient.js
import { auth } from "../firebase-config.js";
import { store } from "../store.js";

const hostname = window.location.hostname;
const isLocalhost =
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  hostname.startsWith("192.168.") ||
  hostname.startsWith("110.168."); // Supaya bisa diakses via IP LAN di HP

export const API_URL = import.meta.env.VITE_API_URL || (isLocalhost ? `http://${hostname}:5000/api` : "/api");

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
  
  const rawMsg = detail || defaultMsg || `Gagal memproses data (HTTP ${res.status})`;

  // Filter out raw Prisma / Database / Connection stack traces
  if (
    rawMsg.includes('prisma') ||
    rawMsg.includes('Prisma') ||
    rawMsg.includes('connection pool') ||
    rawMsg.includes('Timed out') ||
    rawMsg.includes('invocation in') ||
    rawMsg.includes('database') ||
    rawMsg.includes('Postgres') ||
    rawMsg.includes('ECONNRESET') ||
    rawMsg.includes('ETIMEDOUT')
  ) {
    return 'Koneksi ke server sedang sibuk. Coba ulangi beberapa saat lagi ya, bre!';
  }

  if (rawMsg.length > 150 && (rawMsg.includes('{') || rawMsg.includes('at ') || rawMsg.includes('\n'))) {
    return 'Ada sedikit kendala pada sistem. Coba muat ulang halaman atau ulangi lagi ya, bre!';
  }

  return rawMsg;
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
