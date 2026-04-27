import { getDashboardSkeleton, getTableSkeleton } from './components/skeleton.js';

export function showSkeleton(type) {
  const container = document.getElementById('page-content');
  if (type === 'dashboard') {
    container.innerHTML = getDashboardSkeleton();
  } else {
    container.innerHTML = getTableSkeleton();
  }
}

export function handleRoute() {
  const hash = window.location.hash || '#dashboard';
  const container = document.getElementById('page-content');
  
  // Update sidebar active state
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('href') === hash) {
      item.classList.add('active');
    }
  });

  // Show skeleton for a smooth transition
  const type = hash === '#dashboard' ? 'dashboard' : 'table';
  showSkeleton(type);

  // Small delay to simulate "loading" and show off the skeleton
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
  }, 400); // 400ms is enough to see the shimmer but not feel slow
}
