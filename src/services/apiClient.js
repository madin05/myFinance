// src/services/apiClient.js

const isLocalhost =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

export const API_URL = isLocalhost ? "http://localhost:5000/api" : "/api";

export function getAuthHeaders(token, isJson = true) {
  const headers = {};
  if (isJson) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
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
