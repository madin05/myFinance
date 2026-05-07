# MyFinance

MyFinance adalah platform pengelolaan keuangan personal *full-stack* yang dirancang untuk mencatat transaksi, menganalisis pengeluaran, mengatur anggaran, serta melacak target tabungan (wishlist). Aplikasi ini dibangun dengan vanilla JavaScript di sisi frontend untuk performa yang optimal dan Node.js/Express di sisi backend.

---

## Fitur Utama

### 📊 Laporan & Analisis Visual
*   **Grafik Interaktif**: Visualisasi analisis pengeluaran (Doughnut Chart) dan tren arus kas (Line Chart) menggunakan Chart.js.
*   **Ekspor Laporan**: Fitur unduh laporan keuangan dalam format **PDF** (dengan grafik) dan **Excel** (rinci per kategori).
*   **Informasi Ringkas**: Pantau total saldo, pemasukan, dan pengeluaran secara real-time pada halaman utama.

### 🎯 Manajemen Anggaran & Tabungan
*   **Siklus Keuangan Kustom**: Konfigurasi tanggal awal pencatatan keuangan bulanan sesuai dengan tanggal gajian user.
*   **Dukungan Multi-Currency**: Pilihan preferensi mata uang (IDR, USD, EUR, dll.) dengan format penulisan angka otomatis.
*   **Wishlist & Anggaran**: Kelola target tabungan (dengan fitur *drag & drop reordering*) serta tetapkan batas pengeluaran per kategori.

### 🛡️ Keamanan & Integrasi Akun
*   **Autentikasi Akun**: Menggunakan Firebase Authentication untuk pendaftaran dan masuk akun secara aman.
*   **Pusat Keamanan**: Fitur ganti kata sandi dan opsi Autentikasi Dua Faktor (2FA).
*   **Manajemen Profil**: Unggah foto profil secara langsung dengan sistem kompresi gambar otomatis untuk efisiensi penyimpanan.

### 🎨 Antarmuka & UX Responsif
*   **Desain Dual-Theme**: Mendukung Mode Terang (Light Mode) dan Mode Gelap (Dark Mode) yang terintegrasi secara instan.
*   **Notifikasi Kustom**: Toast notification dengan fungsi geser untuk menutup (*Swipe-to-Dismiss*).
*   **Layout Responsif**: Dioptimalkan untuk perangkat mobile dan desktop.

---

## Tech Stack

### Frontend
*   **Core**: Vanilla Javascript (ES6+)
*   **Styling**: Vanilla CSS (Variables, Flexbox, Grid)
*   **Libraries**: Chart.js, Phosphor Icons, SortableJS (Drag & Drop), jsPDF, SheetJS (XLSX)
*   **Build Tool**: Vite.js

### Backend & Database
*   **Server**: Node.js & Express.js
*   **Database**: PostgreSQL (neon.tech)
*   **ORM**: Prisma
*   **Authentication**: Firebase Admin SDK & Bcrypt

---

## Panduan Instalasi Lokal

### 1. Kloning Repositori
```bash
git clone https://github.com/madin05/myFinance.git
cd myFinance
```

### 2. Konfigurasi Environment Variables
Buat file `.env` di direktori utama dan folder `backend/` untuk mendefinisikan variabel lingkungan yang diperlukan (koneksi database, konfigurasi Firebase SDK, dll.).

### 3. Setup Frontend
```bash
# Install dependensi dan jalankan development server
npm install
npm run dev
```

### 4. Setup Backend
```bash
# Pindah ke direktori backend
cd backend
npm install

# Inisialisasi Database (Prisma)
npx prisma db push
npx prisma generate

# Jalankan server API
npm run dev
```

---

## Struktur Direktori

```text
myfinance/
├── src/                # File Frontend (Vanilla JS)
│   ├── components/     # Komponen UI (Modal, Notifications)
│   ├── pages/          # Logika Tampilan (Dashboard, Laporan, Akun)
│   ├── services/       # Integrasi API & Ekspor Data
│   └── css/            # Gaya Tampilan Modular (CSS)
├── backend/            # Server Backend (Node.js & Express)
│   ├── prisma/         # Skema Database Prisma
│   └── src/controllers # Kontroler Logika API
└── index.html          # Entry Point Utama Aplikasi
```
