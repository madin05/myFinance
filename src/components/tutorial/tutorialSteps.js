// src/components/tutorial/tutorialSteps.js

export const TUTORIAL_STORAGE_KEY = 'myfinance_tutorial_completed';

export const TUTORIAL_TIMING = {
  ROUTE_CHANGE_DELAY: 120,
  SYNC_FRAME_DURATION: 400,
  EXIT_CLEANUP_DELAY: 350,
};

export const TUTORIAL_STEPS = [
  {
    target: 'label.fam-trigger, .bottom-nav-fab-btn',
    route: '/dashboard',
    title: 'Tambah Transaksi Instan',
    desc: 'Klik tombol bulat melayang ini kapan saja untuk mencatat transaksi baru, scan struk AI, atau kalkulator.'
  },
  {
    target: '#card-total-saldo',
    route: '/dashboard',
    title: 'Ringkasan Saldo Saat Ini',
    desc: 'Pantau akumulasi seluruh saldo kas, dompet digital, dan rekening bank aktif Anda secara real-time.'
  },
  {
    target: '#card-pemasukan',
    route: '/dashboard',
    title: 'Total Pemasukan Bulan Ini',
    desc: 'Lihat jumlah akumulasi uang masuk bulan ini beserta persentase perbandingannya.'
  },
  {
    target: '#card-pengeluaran',
    route: '/dashboard',
    title: 'Total Pengeluaran Bulan Ini',
    desc: 'Lihat jumlah akumulasi uang keluar bulan ini beserta grafik persentase penggunaan dana.'
  },
  {
    target: '.transactions-section .table-container, .transactions-table',
    route: '/dashboard',
    fallback: '.transactions-section',
    title: 'Daftar Transaksi Terakhir',
    desc: 'Daftar 4 transaksi terbaru yang Anda catat. Klik "Lihat Semua" untuk melihat seluruh riwayat lengkap.'
  },
  {
    target: '.ai-banner-card, .smart-ai-input-container, #smart-ai-input',
    route: '/dashboard',
    title: 'Asisten Keuangan Cerdas AI',
    desc: 'Catat transaksi dengan bahasa sehari-hari (misal: "gajian 5jt hari ini cash") atau tanyakan analisis keuanganmu.'
  },
  {
    target: '.widgets-section .widget-card:first-child',
    route: '/dashboard',
    fallback: '.widgets-section',
    title: 'Ringkasan Anggaran Bulan Ini',
    desc: 'Pantau sisa limit anggaran bulanan per kategori agar pengeluaran Anda tidak kebablasan.'
  },
  {
    target: '.widget-card.widget-primary',
    route: '/dashboard',
    fallback: '.widgets-section',
    title: 'Target Wishlist & Tabungan',
    desc: 'Pantau progres pencapaian barang impian dan tabungan Anda langsung dari dashboard.'
  },
  {
    target: '#notif-trigger .icon-btn, #notif-trigger',
    route: '/dashboard',
    title: 'Pusat Notifikasi',
    desc: 'Dapatkan peringatan otomatis saat pengeluaran mendekati atau melampaui limit anggaran.'
  }
];
