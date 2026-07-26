// src/components/tutorial.js
import { store } from '../store.js';
import { navigateTo } from '../router.js';

const TUTORIAL_STORAGE_KEY = 'myfinance_tutorial_completed';


export const TUTORIAL_TIMING = {
  ROUTE_CHANGE_DELAY: 120,  // Delay (ms) saat berpindah halaman via router sebelum highlight dirender
  SYNC_FRAME_DURATION: 400, // Durasi (ms) kuncian loop requestAnimationFrame 60FPS per langkah
  EXIT_CLEANUP_DELAY: 350,   // Delay (ms) sebelum DOM tutorial dihapus saat selesai/lewati
};

const TUTORIAL_STEPS = [
  // --- STEP 1-4: DASHBOARD STATS & QUICK ADD ---
  {
    target: 'label.fam-trigger',
    route: '/dashboard',
    title: 'Tambah Transaksi Instan',
    desc: 'Klik tombol bulat melayang ini kapan saja untuk mencatat transaksi baru, scan struk, atau kalkulator.'
  },
  {
    target: '.stats-cards .stat-card:nth-child(1), .stat-card:nth-child(1)',
    route: '/dashboard',
    title: 'Total Pemasukan Anda',
    desc: 'Pantau akumulasi total uang masuk dan tren pertumbuhan pemasukan Anda selama 4 minggu terakhir.'
  },
  {
    target: '.stats-cards .stat-card:nth-child(2), .stat-card:nth-child(2)',
    route: '/dashboard',
    title: 'Total Pengeluaran Anda',
    desc: 'Gunakan grafik ini untuk melihat tren pengeluaran mingguan Anda secara visual dan mendeteksi anomali.'
  },
  {
    target: '.stats-cards .stat-card:nth-child(3), .stat-card:nth-child(3)',
    route: '/dashboard',
    title: 'Ringkasan Saldo Saat Ini',
    desc: 'Pantau akumulasi seluruh saldo kas, dompet digital, dan rekening aktif Anda secara real-time.'
  },

  // --- STEP 5-6: HALAMAN TRANSAKSI ---
  {
    target: '#btn-tambah-page, .transactions-section .btn-primary',
    route: '/transaksi',
    fallback: '.transactions-section',
    title: 'Fitur Transaksi: Catat Baru',
    desc: 'Di halaman Transaksi, gunakan tombol + Tambah ini untuk mencatat detail transaksi baru secara manual.'
  },
  {
    target: '#btn-filter-popover, .filter-btn',
    route: '/transaksi',
    fallback: '.transactions-section',
    title: 'Filter & Pencarian Lanjutan',
    desc: 'Saring daftar transaksi Anda berdasarkan kategori, kurun waktu bulan/tahun, tipe, atau besaran nominal.'
  },

  // --- STEP 7: HALAMAN ANGGARAN ---
  {
    target: '#btn-tambah-anggaran, .anggaran-section, .empty-state-btn',
    route: '/anggaran',
    fallback: '.main-content',
    title: 'Kelola Limit Anggaran',
    desc: 'Tetapkan batasan (limit) anggaran bulanan untuk tiap kategori agar pengeluaran Anda selalu terkontrol.'
  },

  // --- STEP 8: HALAMAN TABUNGAN / WISHLIST ---
  {
    target: '#btn-tambah-tabungan, .wishlist-grid, .tabungan-section',
    route: '/tabungan',
    fallback: '.main-content',
    title: 'Wishlist & Target Tabungan',
    desc: 'Rencanakan barang impian dan alokasikan dana tabungan secara berkala hingga target tercapai.'
  },

  // --- STEP 9: HALAMAN SALDO & REKENING ---
  {
    target: '#btn-add-account, .saldo-cards-grid, .saldo-section',
    route: '/saldo',
    fallback: '.main-content',
    title: 'Kelola Rekening & Dompet',
    desc: 'Kelola daftar rekening bank, dompet digital (e-wallet), dan kas tunai Anda secara akurat.'
  },

  // --- STEP 10-13: HALAMAN LAPORAN KEUANGAN ---
  {
    target: '.filter-tabs',
    route: '/laporan',
    fallback: '.section-header',
    title: 'Filter Periode Laporan',
    desc: 'Atur kurun waktu analisis laporan keuangan Anda: mingguan, bulanan, 3 bulanan, atau tahunan.'
  },
  {
    target: '.download-group',
    route: '/laporan',
    fallback: '.section-header',
    title: 'Ekspor PDF & Excel',
    desc: 'Unduh laporan resmi seluruh rekap keuangan Anda ke dalam file PDF atau spreadsheet Excel.'
  },
  {
    target: '.visual-analysis',
    route: '/laporan',
    fallback: '.main-content',
    title: 'Grafik Pengeluaran & Arus Kas',
    desc: 'Visualisasi diagram lingkaran persentase pengeluaran per kategori dan grafik garis tren arus kas.'
  },
  {
    target: '.bottom-grid .stat-card:first-child',
    route: '/laporan',
    fallback: '.bottom-grid',
    title: 'Ringkasan Periode Laporan',
    desc: 'Evaluasi total pengeluaran, total pemasukan, serta sisa saldo bersih pada periode pilihan Anda.'
  },

  // --- STEP 14-15: HALAMAN AKUN & PROFIL ---
  {
    target: '.profile-card',
    route: '/akun',
    fallback: '.main-content',
    title: 'Kartu Informasi Profil',
    desc: 'Lihat foto profil, username, email terdaftar, tanggal bergabung, dan status verifikasi akun Anda.'
  },
  {
    target: '.account-grid > div:nth-child(2)',
    route: '/akun',
    fallback: '.main-content',
    title: 'Akses Keamanan & Pengaturan Akun',
    desc: 'Atur ulang kata sandi, aktifkan Autentikasi 2-Faktor, dan kelola keamanan akun Anda di sini.'
  },

  // --- STEP 16: PUSAT NOTIFIKASI ---
  {
    target: '#notif-trigger',
    route: '/dashboard',
    title: 'Pusat Notifikasi',
    desc: 'Dapatkan peringatan otomatis saat pengeluaran mendekati atau melampaui limit anggaran.'
  }
];

let currentStepIndex = 0;
let overlayEl = null;
let spotlightEl = null;
let cardEl = null;
let keydownHandler = null;

function preventScrollListener(e) {
  if (e.type === 'keydown') {
    const scrollKeys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];
    if (scrollKeys.includes(e.key)) {
      e.preventDefault();
    }
  } else if (e.type === 'wheel' || e.type === 'touchmove') {
    e.preventDefault();
  }
}

function lockUserScroll() {
  window.addEventListener('wheel', preventScrollListener, { passive: false });
  window.addEventListener('touchmove', preventScrollListener, { passive: false });
  window.addEventListener('keydown', preventScrollListener, { passive: false });
}

function unlockUserScroll() {
  window.removeEventListener('wheel', preventScrollListener);
  window.removeEventListener('touchmove', preventScrollListener);
  window.removeEventListener('keydown', preventScrollListener);
}

export function startProductTutorial(force = false) {
  const userId = store.user?.uid || 'guest';
  const key = `${TUTORIAL_STORAGE_KEY}_${userId}`;

  if (!force && localStorage.getItem(key)) {
    return;
  }

  currentStepIndex = 0;
  createTutorialDOM();
  showStep(0);

  keydownHandler = (e) => {
    if (e.key === 'Escape') {
      endTutorial(true);
    } else if (e.key === 'ArrowRight') {
      nextStep();
    } else if (e.key === 'ArrowLeft') {
      prevStep();
    }
  };
  window.addEventListener('keydown', keydownHandler);
}

function createTutorialDOM() {
  cleanupTutorialDOM();

  document.body.classList.add('tutorial-active');
  document.documentElement.classList.add('tutorial-active');
  lockUserScroll();

  window.addEventListener('resize', updateHighlightPosition, { passive: true });
  window.addEventListener('scroll', updateHighlightPosition, { passive: true });

  // Overlay Container with SVG Cutout Mask (z-index: 99998)
  overlayEl = document.createElement('div');
  overlayEl.className = 'tutorial-overlay-container';
  overlayEl.innerHTML = `
    <svg class="tutorial-svg-bg" width="100%" height="100%">
      <defs>
        <mask id="tutorial-mask-cutout">
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          <rect id="tutorial-mask-hole" x="0" y="0" width="0" height="0" rx="14" ry="14" fill="black" />
        </mask>
      </defs>
      <rect x="0" y="0" width="100%" height="100%" fill="rgba(8, 10, 20, 0.82)" mask="url(#tutorial-mask-cutout)" />
    </svg>
  `;
  document.body.appendChild(overlayEl);

  // Spotlight Soft Purple Halo Aura Ring (z-index: 99999)
  spotlightEl = document.createElement('div');
  spotlightEl.className = 'tutorial-spotlight';
  document.body.appendChild(spotlightEl);

  // Tooltip Dialog Card (z-index: 100000)
  cardEl = document.createElement('div');
  cardEl.className = 'tutorial-card';
  document.body.appendChild(cardEl);

  requestAnimationFrame(() => {
    overlayEl.classList.add('active');
  });
}

let activeTargetNode = null;
let rafPositionId = null;

function restoreActiveTarget() {
  document.querySelectorAll('.tutorial-target-active').forEach(el => {
    el.classList.remove('tutorial-target-active');
  });
  activeTargetNode = null;

  if (rafPositionId) {
    cancelAnimationFrame(rafPositionId);
    rafPositionId = null;
  }
}

function showStep(index) {
  if (index < 0 || index >= TUTORIAL_STEPS.length) {
    endTutorial(false);
    return;
  }

  // 1. Reset / Clean-up state sebelumnya sebelum nempelin style step baru!
  restoreActiveTarget();

  currentStepIndex = index;
  const step = TUTORIAL_STEPS[index];

  // Auto-navigate to page if step requires a specific route
  if (step.route && window.location.pathname !== step.route) {
    navigateTo(step.route);
    setTimeout(() => {
      renderStepHighlight(index);
    }, TUTORIAL_TIMING.ROUTE_CHANGE_DELAY);
    return;
  }

  renderStepHighlight(index);
}
function updateHighlightPosition() {
  if (!activeTargetNode || !overlayEl || !spotlightEl) return;

  const rect = activeTargetNode.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(activeTargetNode);
  const rawRadius = computedStyle.borderRadius || '12px';
  const parsedRadius = parseFloat(rawRadius) || 12;

  const isCircle = rawRadius.includes('50%') || 
                   activeTargetNode.classList.contains('fam-trigger') ||
                   activeTargetNode.classList.contains('icon-btn') ||
                   activeTargetNode.id === 'notif-trigger' ||
                   (Math.abs(rect.width - rect.height) < 16 && (parsedRadius >= 10 || rawRadius.includes('50%')));

  const isPill = (rawRadius.includes('100px') || rawRadius.includes('999')) && rect.width > rect.height * 1.4;

  const padding = 4;
  const holeX = Math.max(0, rect.left - padding);
  const holeY = Math.max(0, rect.top - padding);
  const holeW = rect.width + (padding * 2);
  const holeH = rect.height + (padding * 2);

  let rxVal, spotBorderRadius;
  if (isCircle) {
    rxVal = `${holeW / 2}`;
    spotBorderRadius = '50%';
  } else if (isPill) {
    rxVal = `${holeH / 2}`;
    spotBorderRadius = '100px';
  } else {
    rxVal = `${Math.min(parsedRadius + padding, 24)}`;
    spotBorderRadius = `${rxVal}px`;
  }

  // Update SVG Mask Cutout Hole
  const maskHole = document.getElementById('tutorial-mask-hole');
  if (maskHole) {
    maskHole.setAttribute('x', holeX);
    maskHole.setAttribute('y', holeY);
    maskHole.setAttribute('width', holeW);
    maskHole.setAttribute('height', holeH);
    maskHole.setAttribute('rx', rxVal);
    maskHole.setAttribute('ry', rxVal);
  }

  // Update Spotlight Halo Ring position & border-radius
  if (spotlightEl) {
    spotlightEl.style.top = `${holeY}px`;
    spotlightEl.style.left = `${holeX}px`;
    spotlightEl.style.width = `${holeW}px`;
    spotlightEl.style.height = `${holeH}px`;
    spotlightEl.style.borderRadius = spotBorderRadius;
  }

  // Update Tooltip Card position dynamically
  if (cardEl && cardEl.classList.contains('active')) {
    positionCard(rect);
  }
}

function renderStepHighlight(index) {
  const step = TUTORIAL_STEPS[index];
  let targetNode = document.querySelector(step.target);

  if (!targetNode && step.fallback) {
    targetNode = document.querySelector(step.fallback);
  }

  // Fallback to mobile hamburger if sidebar link is hidden on small screens
  if (!targetNode && step.target.includes('data-route')) {
    targetNode = document.querySelector('#btn-open-sidebar-mobile, .hamburger, .sidebar-nav');
  }

  if (!targetNode) {
    targetNode = document.querySelector('.main-content, #page-content');
  }

  if (!targetNode) {
    if (index < TUTORIAL_STEPS.length - 1) {
      showStep(index + 1);
    } else {
      endTutorial(false);
    }
    return;
  }

  activeTargetNode = targetNode;
  targetNode.classList.add('tutorial-target-active');

  // Scroll target instantly to center so position is settled without smooth-scroll lag
  targetNode.scrollIntoView({ behavior: 'auto', block: 'center' });

  // Render & position Tooltip Card
  renderTooltipCard(index, targetNode.getBoundingClientRect());

  // Immediately position & run 60FPS rAF sync loop across layout settle frames
  updateHighlightPosition();
  const startTime = performance.now();
  function syncLoop(now) {
    updateHighlightPosition();
    if (now - startTime < TUTORIAL_TIMING.SYNC_FRAME_DURATION) {
      rafPositionId = requestAnimationFrame(syncLoop);
    } else {
      rafPositionId = null;
    }
  }
  rafPositionId = requestAnimationFrame(syncLoop);
}

function renderTooltipCard(index, targetRect) {
  const step = TUTORIAL_STEPS[index];
  const totalSteps = TUTORIAL_STEPS.length;
  const isLast = index === totalSteps - 1;
  const progressPercent = Math.round(((index + 1) / totalSteps) * 100);

  const dotsOrBarHTML = totalSteps <= 8 ? `
    <div class="tutorial-dots">
      ${TUTORIAL_STEPS.map((_, i) => `<div class="tutorial-dot ${i === index ? 'active' : ''}"></div>`).join('')}
    </div>
  ` : `
    <div class="tutorial-progress-wrapper" title="Langkah ${index + 1} dari ${totalSteps} (${progressPercent}%)">
      <div class="tutorial-progress-fill" style="width: ${progressPercent}%;"></div>
    </div>
  `;

  cardEl.innerHTML = `
    <div class="tutorial-header">
      <span class="tutorial-step-badge">Langkah ${index + 1} dari ${totalSteps}</span>
      <button class="tutorial-skip-link" id="tut-btn-skip">Lewati</button>
    </div>
    
    <h3 class="tutorial-title">${step.title}</h3>
    <p class="tutorial-desc">${step.desc}</p>

    <div class="tutorial-footer">
      ${dotsOrBarHTML}

      <div class="tutorial-actions">
        <button class="tutorial-btn tutorial-btn-prev" id="tut-btn-prev" ${index === 0 ? 'disabled' : ''}>
          <i class="ph ph-caret-left"></i> Kembali
        </button>
        <button class="tutorial-btn tutorial-btn-next" id="tut-btn-next">
          ${isLast ? 'Selesai' : 'Lanjut <i class="ph ph-caret-right"></i>'}
        </button>
      </div>
    </div>
  `;

  // Position Tooltip Card near target without overlap
  positionCard(targetRect);

  document.getElementById('tut-btn-skip')?.addEventListener('click', () => endTutorial(true));
  document.getElementById('tut-btn-prev')?.addEventListener('click', prevStep);
  document.getElementById('tut-btn-next')?.addEventListener('click', nextStep);

  cardEl.classList.add('active');
}

function positionCard(targetRect) {
  const isMobile = window.innerWidth <= 768;
  const maxCardW = isMobile ? 310 : 360;
  const cardWidth = Math.min(window.innerWidth - 32, maxCardW);
  const cardHeight = cardEl.offsetHeight || (isMobile ? 160 : 210);
  const margin = isMobile ? 12 : 18;

  let top, left;

  const spaceAbove = targetRect.top;
  const spaceBelow = window.innerHeight - targetRect.bottom;
  const spaceLeft = targetRect.left;
  const spaceRight = window.innerWidth - targetRect.right;

  // Smart positioning: Prefer placing card ABOVE when target is in bottom section of viewport
  if (spaceAbove >= cardHeight + margin && (targetRect.top > window.innerHeight * 0.55 || spaceBelow < cardHeight + margin)) {
    top = targetRect.top - cardHeight - margin;
    left = targetRect.left + (targetRect.width / 2) - (cardWidth / 2);
  } else if (spaceRight >= cardWidth + margin) {
    left = targetRect.right + margin;
    top = targetRect.top;
  } else if (spaceLeft >= cardWidth + margin) {
    left = targetRect.left - cardWidth - margin;
    top = targetRect.top;
  } else {
    top = targetRect.bottom + margin;
    left = targetRect.left + (targetRect.width / 2) - (cardWidth / 2);
  }

  // Viewport boundary clamping with 16px safe margin
  if (left < margin) left = margin;
  if (left + cardWidth > window.innerWidth - margin) {
    left = window.innerWidth - cardWidth - margin;
  }
  if (top < margin) top = margin;
  if (top + cardHeight > window.innerHeight - margin) {
    top = window.innerHeight - cardHeight - margin;
  }

  cardEl.style.top = `${top}px`;
  cardEl.style.left = `${left}px`;
}

function nextStep() {
  showStep(currentStepIndex + 1);
}

function prevStep() {
  showStep(currentStepIndex - 1);
}

function endTutorial(isSkip = false) {
  const userId = store.user?.uid || 'guest';
  const key = `${TUTORIAL_STORAGE_KEY}_${userId}`;
  localStorage.setItem(key, 'true');

  restoreActiveTarget();
  unlockUserScroll();

  if (keydownHandler) {
    window.removeEventListener('keydown', keydownHandler);
    keydownHandler = null;
  }

  if (cardEl) cardEl.classList.remove('active');
  if (overlayEl) overlayEl.classList.remove('active');

  // Return home to dashboard if user ends on another page
  if (window.location.pathname !== '/dashboard') {
    navigateTo('/dashboard');
  }

  setTimeout(() => {
    cleanupTutorialDOM();
  }, TUTORIAL_TIMING.EXIT_CLEANUP_DELAY);
}

function cleanupTutorialDOM() {
  document.body.classList.remove('tutorial-active');
  document.documentElement.classList.remove('tutorial-active');
  unlockUserScroll();

  if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
  if (spotlightEl && spotlightEl.parentNode) spotlightEl.parentNode.removeChild(spotlightEl);
  if (cardEl && cardEl.parentNode) cardEl.parentNode.removeChild(cardEl);
  overlayEl = null;
  spotlightEl = null;
  cardEl = null;
}
