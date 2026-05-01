# 💎 MyFinance - Ultimate Personal Financial Dashboard

MyFinance adalah platform pengelolaan keuangan personal *full-stack* yang menggabungkan estetika desain premium dengan fungsionalitas analisis yang mendalam. Dibangun menggunakan arsitektur modern untuk memberikan pengalaman pengguna yang sangat responsif, aman, dan intuitif.

---

## ✨ Fitur Unggulan

### 📊 Analisis & Visualisasi Canggih
*   **Visual Charts**: Integrasi Chart.js untuk analisis pengeluaran (Doughnut Chart) dan tren arus kas (Line Chart) yang interaktif.
*   **Laporan Professional**: Ekspor data ke format **PDF Premium** (lengkap dengan grafik visual) atau **Excel Detail** (3-Sheet breakdown).
*   **Real-time Analytics**: Ringkasan saldo, pemasukan, dan pengeluaran yang diperbarui secara instan.

### 🎯 Manajemen Keuangan Cerdas
*   **Siklus Keuangan Kustom**: Atur tanggal gajian kamu sebagai awal periode laporan.
*   **Multi-Currency Support**: Pilih mata uang default (IDR, USD, EUR, dsb.) dengan format angka otomatis yang cerdas.
*   **Wishlist & Budgeting**: Kelola target tabungan dengan fitur *Drag & Drop reordering* dan pantau sisa jatah belanja tiap kategori.

### 🛡️ Keamanan & Profil
*   **Pusat Keamanan**: Dukungan **Autentikasi 2 Faktor (2FA)** dan manajemen password yang terenkripsi.
*   **Sync Profile**: Integrasi Firebase Auth untuk sinkronisasi identitas dan preferensi user secara cloud.
*   **Optimistic Avatar Upload**: Ganti foto profil dengan fitur kompresi otomatis dan update UI instan.

### 🎨 Estetika & UX Premium
*   **Glassmorphism UI**: Antarmuka modern dengan efek blur kaca dan saturasi tinggi.
*   **Smart Notifications**: Toast notification dengan efek glassmorphism dan fitur **Swipe-to-Dismiss** (geser untuk tutup).
*   **Responsive Engine**: Pengalaman yang mulus baik di desktop maupun perangkat mobile tanpa horizontal overflow.
*   **Micro-interactions**: Skeleton loading, gold-coin loader, dan animasi transisi navigasi yang presisi.

---

## 🛠️ Tech Stack

### Frontend
*   **Core**: Vanilla Javascript (ES6+)
*   **Styling**: Pure CSS (Modern Variables, Flexbox/Grid, Backdrop-filters)
*   **Visual**: Chart.js, Phosphor Icons
*   **Utilities**: SortableJS (Drag & Drop), jsPDF (Report Engine), XLSX (Excel Engine)
*   **Build Tool**: Vite.js

### Backend & Database
*   **Engine**: Node.js & Express.js
*   **Database**: PostgreSQL (via Neon.tech)
*   **ORM**: Prisma (Type-safe database client)
*   **Authentication**: Firebase Admin SDK & Bcrypt

---

## 🚀 Instalasi Lokal

### 1. Prasyarat
*   Node.js terinstal di sistem kamu.
*   Database PostgreSQL (atau ganti koneksi string di `.env`).

### 2. Setup Frontend
```bash
# Masuk ke folder root
npm install
npm run dev
```

### 3. Setup Backend
```bash
# Masuk ke folder backend
cd backend
npm install

# Setup Database (Prisma)
npx prisma db push
npx prisma generate

# Jalankan server
npm run dev
```

---

## 📁 Struktur Proyek
```text
myfinance/
├── src/                # Frontend Source
│   ├── components/     # UI Reusable Components (Toasts, Selects)
│   ├── pages/          # Page Logic (Dashboard, Akun, Laporan)
│   ├── services/       # External API & Export Services
│   └── css/            # Modular CSS Components
├── backend/            # Backend API (Node + Express)
│   ├── prisma/         # Database Schema & Migrations
│   └── src/controllers # API Logic
└── index.html          # Main Entry
```

---

*Dibuat dengan ❤️ oleh **Antigravity** untuk membantu kamu mengelola masa depan finansial yang lebih baik.*
