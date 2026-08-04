import { store } from './store.js';
import { auth } from './firebase-config.js';
import {
  getDashboardSkeleton,
  getTableSkeleton,
  getTransaksiSkeleton,
  getAnggaranSkeleton,
  getTabunganSkeleton,
  getSaldoSkeleton,
  getLaporanSkeleton,
  getAkunSkeleton
} from './components/skeleton.js';

// --- Daftar rute yang DIKUNCI untuk user yang belum verifikasi email ---
const VERIFICATION_REQUIRED_ROUTES = ['/transaksi', '/anggaran', '/saldo', '/laporan', '/settings'];

/**
 * Cek apakah user sudah terverifikasi emailnya.
 * Prioritas: Firebase Auth currentUser > store.user.emailVerified
 * Google OAuth users dianggap selalu verified.
 */
export function isUserVerified() {
  const firebaseUser = auth.currentUser;
  if (firebaseUser) {
    // Google provider selalu dianggap verified
    const isGoogle = firebaseUser.providerData.some(p => p.providerId === 'google.com');
    if (isGoogle) return true;
    return firebaseUser.emailVerified;
  }
  // Fallback ke store
  if (store.user?.provider === 'google') return true;
  return store.user?.emailVerified ?? false;
}

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
    case '/saldo':
      container.innerHTML = getSaldoSkeleton();
      break;
    case '/laporan':
      container.innerHTML = getLaporanSkeleton();
      break;
    case '/akun':
      container.innerHTML = getAkunSkeleton();
      break;
    case '/settings':
      container.innerHTML = getTableSkeleton();
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

  // Toggle kelas page-dashboard untuk styling background hero
  if (route === '/dashboard') {
    document.body.classList.add('page-dashboard');
  } else {
    document.body.classList.remove('page-dashboard');
  }

  // Update sidebar active state
  document.querySelectorAll('.sidebar .nav-item').forEach(item => {
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

  // Update mobile bottom nav active state
  document.querySelectorAll('.bottom-nav-item').forEach(item => {
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

  // Render skeleton for immediate visual feedback
  showSkeleton(route);

  // Render page content immediately without artificial delays
  loadRoutePage(route);
}

function loadRoutePage(route) {
  if (route === '/dashboard') {
    import('./pages/dashboard.js').then(module => module.renderDashboard());
  } else if (route === '/transaksi') {
    import('./pages/transaksi.js').then(module => module.renderTransaksi());
  } else if (route === '/anggaran') {
    import('./pages/anggaran.js').then(module => module.renderAnggaran());
  } else if (route === '/tabungan') {
    import('./pages/tabungan.js').then(module => module.renderTabungan());
  } else if (route === '/saldo') {
    import('./pages/saldo.js').then(module => module.renderSaldo());
  } else if (route === '/laporan') {
    import('./pages/laporan.js').then(module => module.renderLaporan());
  } else if (route === '/akun') {
    import('./pages/akun.js').then(module => module.renderAkun());
  } else if (route === '/settings') {
    import('./pages/settings.js').then(module => module.renderSettings());
  } else if (route === '/faq') {
    import('./pages/faq.js').then(module => module.renderFaq());
  } else if (route === '/notifikasi') {
    import('./pages/notifikasi.js').then(module => module.renderNotifikasi());
  } else {
    import('./pages/error404.js').then(module => module.renderError404());
  }
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
  loadRoutePage(route);
}
