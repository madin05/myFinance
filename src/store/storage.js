// src/store/storage.js

export function getInitialStorage(key, fallback = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.warn(`[Store] Gagal membaca localStorage key "${key}":`, e);
    return fallback;
  }
}

export function generateAvatarUrl(name = "User") {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "User")}&background=7C3AED&color=fff&bold=true`;
}

export function _mapSavingData(s) {
  if (!s) return null;
  return {
    id: s.id,
    name: s.name,
    target: s.targetAmount !== undefined ? s.targetAmount : s.target || 0,
    current: s.currentAmount !== undefined ? s.currentAmount : s.current || 0,
    icon: s.icon,
    color: s.color,
    orderIndex: s.orderIndex,
    isDone: Boolean(s.isDone),
  };
}

export function _mapAccountData(a) {
  if (!a) return null;
  return {
    id: a.id,
    name: a.name,
    type: a.type,
    balance: Number(a.balance || 0),
    logo: a.logo || "",
    orderIndex: a.orderIndex,
  };
}

const formatterCache = new Map();

export function formatCurrency(number, currency = "IDR") {
  const locale = currency === "IDR" ? "id-ID" : "en-US";
  const cacheKey = `${locale}-${currency}`;

  if (!formatterCache.has(cacheKey)) {
    formatterCache.set(
      cacheKey,
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  return formatterCache.get(cacheKey).format(number || 0);
}

export function formatRupiah(number, currency = "IDR") {
  return formatCurrency(number, currency);
}

export function formatDate(dateString) {
  if (!dateString) return "-";
  const options = { day: "numeric", month: "short", year: "numeric" };
  return new Date(dateString).toLocaleDateString("id-ID", options);
}
