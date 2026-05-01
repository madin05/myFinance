import {
  getDashboardSkeleton,
  getTableSkeleton,
  getTransaksiSkeleton,
  getAnggaranSkeleton,
  getTabunganSkeleton,
  getLaporanSkeleton,
  getAkunSkeleton
} from './components/skeleton.js';

export function showSkeleton(routeHash) {
  const container = document.getElementById('page-content');
  if (!container) return;

  switch (routeHash) {
    case '#dashboard':
      container.innerHTML = getDashboardSkeleton();
      break;
    case '#transaksi':
      container.innerHTML = getTransaksiSkeleton();
      break;
    case '#anggaran':
      container.innerHTML = getAnggaranSkeleton();
      break;
    case '#tabungan':
      container.innerHTML = getTabunganSkeleton(localStorage.getItem('wishlist-view') || 'grid');
      break;
    case '#laporan':
      container.innerHTML = getLaporanSkeleton();
      break;
    case '#akun':
      container.innerHTML = getAkunSkeleton();
      break;
    default:
      container.innerHTML = getTableSkeleton();
      break;
  }
}

export function handleRoute() {
  const hash = window.location.hash || '#dashboard';
  const container = document.getElementById('page-content');
  const modalContainer = document.getElementById('modal-container');
  
  // Bersihkan modal yang mungkin masih terbuka
  if (modalContainer) modalContainer.innerHTML = '';
  
  // Update sidebar active state
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('href') === hash) {
      item.classList.add('active');
    }
  });

  // Show skeleton for a smooth transition
  showSkeleton(hash);

  // Small delay to simulate "loading" and show off the skeleton if needed, 
  // but keep it snappy (50ms instead of 400ms)
  setTimeout(() => {
    if (hash === '#dashboard') {
      import('./pages/dashboard.js').then(module => module.renderDashboard());
    } else if (hash === '#transaksi') {
      import('./pages/transaksi.js').then(module => module.renderTransaksi());
    } else if (hash === '#anggaran') {
      import('./pages/anggaran.js').then(module => module.renderAnggaran());
    } else if (hash === '#tabungan') {
      import('./pages/tabungan.js').then(module => module.renderTabungan());
    } else if (hash === '#laporan') {
      import('./pages/laporan.js').then(module => module.renderLaporan());
    } else if (hash === '#akun') {
      import('./pages/akun.js').then(module => module.renderAkun());
    } else {
      container.innerHTML = `<h2>Page ${hash} under construction</h2>`;
    }
  }, 50);
}

// Fungsi buat render ulang halaman aktif TANPA skeleton (biar gak flicker pas sync data)
export function refreshCurrentPage() {
  const hash = window.location.hash || '#dashboard';
  
  if (hash === '#dashboard') {
    import('./pages/dashboard.js').then(m => m.renderDashboard());
  } else if (hash === '#transaksi') {
    import('./pages/transaksi.js').then(m => m.renderTransaksi());
  } else if (hash === '#anggaran') {
    import('./pages/anggaran.js').then(m => m.renderAnggaran());
  } else if (hash === '#tabungan') {
    import('./pages/tabungan.js').then(m => m.renderTabungan());
  } else if (hash === '#laporan') {
    import('./pages/laporan.js').then(m => m.renderLaporan());
  } else if (hash === '#akun') {
    import('./pages/akun.js').then(m => m.renderAkun());
  }
}
