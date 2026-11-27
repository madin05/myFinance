export const DEFAULT_TRANSACTIONS = [
  {
    id: 101,
    tanggal: new Date().toISOString().split('T')[0],
    kategori: "Makanan & Minuman",
    metode: "Bank Transfer",
    keterangan: "Belanja Bulanan Supermarket",
    harga: -450000,
    type: "expense",
    akun: "Bank BCA"
  },
  {
    id: 102,
    tanggal: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    kategori: "Gaji & Pendapatan",
    metode: "Bank Transfer",
    keterangan: "Gaji Bulanan Utama",
    harga: 12500000,
    type: "income",
    akun: "Bank BCA"
  },
  {
    id: 103,
    tanggal: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
    kategori: "Makanan & Minuman",
    metode: "E-Wallet",
    keterangan: "Kopi Kekinian & Toast",
    harga: -45000,
    type: "expense",
    akun: "GoPay"
  },
  {
    id: 104,
    tanggal: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0],
    kategori: "Transportasi",
    metode: "E-Wallet",
    keterangan: "GrabCar Transportasi Kantor",
    harga: -65000,
    type: "expense",
    akun: "GoPay"
  },
  {
    id: 105,
    tanggal: new Date(Date.now() - 86400000 * 4).toISOString().split('T')[0],
    kategori: "Belanja",
    metode: "Bank Transfer",
    keterangan: "Beli Pakaian & Kemeja Kerja",
    harga: -350000,
    type: "expense",
    akun: "Bank BCA"
  },
  {
    id: 106,
    tanggal: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0],
    kategori: "Tagihan",
    metode: "Bank Transfer",
    keterangan: "Token Listrik PLN Rumah",
    harga: -300000,
    type: "expense",
    akun: "Bank BCA"
  },
  {
    id: 107,
    tanggal: new Date(Date.now() - 86400000 * 6).toISOString().split('T')[0],
    kategori: "Hiburan",
    metode: "E-Wallet",
    keterangan: "Tiket Bioskop XXI & Snack",
    harga: -120000,
    type: "expense",
    akun: "GoPay"
  },
  {
    id: 108,
    tanggal: new Date(Date.now() - 86400000 * 7).toISOString().split('T')[0],
    kategori: "Kesehatan",
    metode: "E-Wallet",
    keterangan: "Vitamin C & Multivitamin",
    harga: -95000,
    type: "expense",
    akun: "DANA"
  },
  {
    id: 109,
    tanggal: new Date(Date.now() - 86400000 * 8).toISOString().split('T')[0],
    kategori: "Makanan & Minuman",
    metode: "Cash",
    keterangan: "Makan Siang Resto",
    harga: -55000,
    type: "expense",
    akun: "Dompet Tunai"
  },
  {
    id: 110,
    tanggal: new Date(Date.now() - 86400000 * 9).toISOString().split('T')[0],
    kategori: "Lain-lain",
    metode: "Cash",
    keterangan: "Infaq & Sedekah Rutin",
    harga: -50000,
    type: "expense",
    akun: "Dompet Tunai"
  }
];

export function getInitialStorage(key, fallback = null) {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    const parsed = JSON.parse(item);
    if (Array.isArray(fallback) && Array.isArray(parsed) && parsed.length === 0 && fallback.length > 0) {
      return fallback;
    }
    return parsed;
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

export function normalizeAccountName(name) {
  if (!name || typeof name !== 'string') return '';
  const clean = name.trim().toLowerCase();

  // Standarisasi variasi Blu BCA
  if (clean === 'bank blu' || clean === 'blubca' || clean === 'blu') return 'blu';

  // Standarisasi variasi Uang Tunai / Cash / Dompet
  if (['cash', 'uang tunai', 'dompet', 'dompet tunai', 'dompet kas', 'brankas'].includes(clean)) {
    return 'cash';
  }

  // Hilangkan prefix "bank " untuk bank umum (misal: "bank bca" -> "bca", "bank mandiri" -> "mandiri")
  if (clean.startsWith('bank ')) {
    return clean.replace(/^bank\s+/, '').trim();
  }

  return clean;
}

export function isSameAccount(nameA, nameB) {
  if (!nameA || !nameB) return false;
  const a = String(nameA).trim().toLowerCase();
  const b = String(nameB).trim().toLowerCase();
  if (a === b) return true;
  return normalizeAccountName(a) === normalizeAccountName(b);
}

export function deduplicateAccounts(accounts) {
  if (!Array.isArray(accounts)) return [];
  const map = new Map();

  for (const raw of accounts) {
    if (!raw || !raw.name) continue;
    const key = normalizeAccountName(raw.name);
    if (!map.has(key)) {
      map.set(key, { ...raw, balance: Number(raw.balance || 0) });
    } else {
      const existing = map.get(key);
      // Utamakan ID database integer daripada temporary timestamp lokal
      if (typeof raw.id === 'number' && raw.id < 1000000000000) {
        existing.id = raw.id;
      }
      if (raw.logo && !existing.logo) {
        existing.logo = raw.logo;
      }
      // Jika salah satu saldo bernilai 0 dan yang lain memiliki saldo riil, pertahankan saldo riil
      if (Number(existing.balance || 0) === 0 && Number(raw.balance || 0) !== 0) {
        existing.balance = Number(raw.balance);
      }
      // Pertahankan nama yang lebih spesifik/bersih
      if (raw.name.length > existing.name.length && !existing.name.toLowerCase().startsWith('bank')) {
        existing.name = raw.name;
      }
    }
  }

  return Array.from(map.values());
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

/**
 * Format local YYYY-MM period key without UTC timezone shift.
 */
export function getLocalPeriodKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}
