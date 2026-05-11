import { store } from './store.js';
import {
  getDashboardSkeleton,
  getTableSkeleton,
  getTransaksiSkeleton,
  getAnggaranSkeleton,
  getTabunganSkeleton,
  getLaporanSkeleton,
  getAkunSkeleton
} from './components/skeleton.js';

// --- URL Security & Sanitization Layer (Anti-XSS / Anti-Path Traversal) ---
export function sanitizePath(path) {
  if (!path) return '/dashboard';
  // Ambil bagian path utama (sebelum query parameter ?)
  const mainPath = path.split('?')[0];
  // Bersihkan karakter ilegal selain huruf, angka, slash, dash, dan underscore
  const clean = mainPath.replace(/[^a-zA-Z0-9\/\-_]/g, '');
  return (clean === '/' || clean === '') ? '/dashboard' : clean;
}

export function showSkeleton(routePath) {
  const container = document.getElementById('page-content');
  if (!container) return;

  switch (routePath) {
    case '/dashboard':
      container.innerHTML = getDashboardSkeleton();
      break;
    case '/transaksi':
      container.innerHTML = getTransaksiSkeleton();
      break;
    case '/anggaran':
      container.innerHTML = getAnggaranSkeleton();
      break;
    case '/tabungan':
      container.innerHTML = getTabunganSkeleton(localStorage.getItem('wishlist-view') || 'grid');
      break;
    case '/laporan':
      container.innerHTML = getLaporanSkeleton();
      break;
    case '/akun':
      container.innerHTML = getAkunSkeleton();
      break;
    case '/faq':
      container.innerHTML = getTableSkeleton();
      break;
    default:
      container.innerHTML = getTableSkeleton();
      break;
  }
}

export function handleRoute() {
  const container = document.getElementById('page-content');
  const modalContainer = document.getElementById('modal-container');
  
  // Bersihkan modal yang mungkin masih terbuka
  if (modalContainer) modalContainer.innerHTML = '';

  // Reset scroll ke atas halaman setiap kali pindah rute
  window.scrollTo(0, 0);
  if (container) container.scrollTop = 0;
  const mainWrapper = document.querySelector('.main-content');
  if (mainWrapper) mainWrapper.scrollTop = 0;

  // Keamanan URL: Dapatkan rute yang aman & bersih
  const route = sanitizePath(window.location.pathname);

  // Sembunyikan/tampilkan searchbar di mobile berdasarkan rute aktif
  const searchBar = document.querySelector('.search-bar');
  if (searchBar) {
    if (route === '/dashboard' || route === '/transaksi') {
      searchBar.classList.remove('mobile-hidden');
    } else {
      searchBar.classList.add('mobile-hidden');
    }
  }

  // Kelola border radius pada header berdasarkan rute aktif
  const headerEl = document.querySelector('.header');
  if (headerEl) {
    if (route !== '/dashboard' && route !== '/transaksi') {
      headerEl.classList.add('curved-header');
    } else {
      headerEl.classList.remove('curved-header');
    }
  }
  
  // Update sidebar active state
  document.querySelectorAll('.nav-item').forEach(item => {
    const icon = item.querySelector('i');
    item.classList.remove('active');
    if (icon) {
      icon.classList.remove('ph-fill');
      icon.classList.add('ph');
    }
    const itemRoute = item.getAttribute('href');
    if (itemRoute === route) {
      item.classList.add('active');
      if (icon) {
        icon.classList.remove('ph');
        icon.classList.add('ph-fill');
      }
    }
  });

  // Show skeleton for a smooth transition
  showSkeleton(route);

  // Snappy routing
  setTimeout(() => {
    if (store.isSyncing && store.transactions.length === 0) {
      console.log('Initial sync in progress, keeping skeleton...');
      return;
    }

    if (route === '/dashboard') {
      import('./pages/dashboard.js').then(module => module.renderDashboard());
    } else if (route === '/transaksi') {
      import('./pages/transaksi.js').then(module => module.renderTransaksi());
    } else if (route === '/anggaran') {
      import('./pages/anggaran.js').then(module => module.renderAnggaran());
    } else if (route === '/tabungan') {
      import('./pages/tabungan.js').then(module => module.renderTabungan());
    } else if (route === '/laporan') {
      import('./pages/laporan.js').then(module => module.renderLaporan());
    } else if (route === '/akun') {
      import('./pages/akun.js').then(module => module.renderAkun());
    } else if (route === '/faq') {
      import('./pages/faq.js').then(module => module.renderFaq());
    } else if (route === '/notifikasi') {
      import('./pages/notifikasi.js').then(module => module.renderNotifikasi());
    } else {
      import('./pages/error404.js').then(module => module.renderError404());
    }
  }, 50);
}

// Fungsi bantu navigasi aman tanpa memicu reload halaman
export function navigateTo(path) {
  const safePath = sanitizePath(path);
  window.history.pushState(null, null, safePath);
  handleRoute();
}

// Fungsi buat render ulang halaman aktif TANPA skeleton (biar gak flicker pas sync data)
export function refreshCurrentPage() {
  const route = sanitizePath(window.location.pathname);
  
  if (store.isSyncing && store.transactions.length === 0) {
    console.log('Initial sync in progress, keeping skeleton on refresh...');
    return;
  }
  
  if (route === '/dashboard') {
    import('./pages/dashboard.js').then(m => m.renderDashboard());
  } else if (route === '/transaksi') {
    import('./pages/transaksi.js').then(m => m.renderTransaksi());
  } else if (route === '/anggaran') {
    import('./pages/anggaran.js').then(m => m.renderAnggaran());
  } else if (route === '/tabungan') {
    import('./pages/tabungan.js').then(m => m.renderTabungan());
  } else if (route === '/laporan') {
    import('./pages/laporan.js').then(m => m.renderLaporan());
  } else if (route === '/akun') {
    import('./pages/akun.js').then(m => m.renderAkun());
  } else if (route === '/faq') {
    import('./pages/faq.js').then(m => m.renderFaq());
  } else if (route === '/notifikasi') {
    import('./pages/notifikasi.js').then(m => m.renderNotifikasi());
  } else {
    import('./pages/error404.js').then(m => m.renderError404());
  }
}
