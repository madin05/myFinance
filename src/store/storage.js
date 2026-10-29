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
