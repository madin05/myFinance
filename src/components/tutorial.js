// src/components/tutorial.js
import { store } from '../store.js';
import { navigateTo } from '../router.js';

const TUTORIAL_STORAGE_KEY = 'myfinance_tutorial_completed';

export const TUTORIAL_TIMING = {
  ROUTE_CHANGE_DELAY: 120,
  SYNC_FRAME_DURATION: 400,
  EXIT_CLEANUP_DELAY: 350,
};

const TUTORIAL_STEPS = [
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
let activeTargetNode = null;
let rafPositionId = null;

const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);

function preventScrollListener(e) {
  if (e.type === 'keydown' && SCROLL_KEYS.has(e.key)) {
    e.preventDefault();
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

export async function startProductTutorial(force = false) {
  const userId = store.user?.uid || 'guest';
  const key = `${TUTORIAL_STORAGE_KEY}_${userId}`;

  if (!force && localStorage.getItem(key)) return;

  // Jika dipicu dari halaman lain (misal FAQ / Sidebar), pindah ke dashboard lebih dulu
  const currentPath = window.location.pathname || '/dashboard';
  if (currentPath !== '/dashboard' && currentPath !== '/') {
    navigateTo('/dashboard');
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  currentStepIndex = 0;
  createTutorialDOM();
  showStep(0);

  keydownHandler = (e) => {
    if (e.key === 'Escape') endTutorial(true);
    else if (e.key === 'ArrowRight') nextStep();
    else if (e.key === 'ArrowLeft') prevStep();
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

  spotlightEl = document.createElement('div');
  spotlightEl.className = 'tutorial-spotlight';
  document.body.appendChild(spotlightEl);

  cardEl = document.createElement('div');
  cardEl.className = 'tutorial-card';
  document.body.appendChild(cardEl);

  requestAnimationFrame(() => {
    overlayEl?.classList.add('active');
  });
}

function restoreActiveTarget() {
  if (activeTargetNode) {
    activeTargetNode.classList.remove('tutorial-target-active');
    activeTargetNode = null;
  }
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

  restoreActiveTarget();
  currentStepIndex = index;
  const step = TUTORIAL_STEPS[index];

  if (step.route && window.location.pathname !== step.route) {
    navigateTo(step.route);
    setTimeout(() => { renderStepHighlight(index); }, TUTORIAL_TIMING.ROUTE_CHANGE_DELAY);
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

  const isCircle = (rawRadius.includes('50%') && rect.width < 120) || 
                   activeTargetNode.classList.contains('fam-trigger') ||
                   activeTargetNode.classList.contains('bottom-nav-fab-btn') ||
                   activeTargetNode.classList.contains('icon-btn') ||
                   activeTargetNode.id === 'notif-trigger' ||
                   (rect.width < 90 && rect.height < 90 && Math.abs(rect.width - rect.height) < 12 && (parsedRadius >= 20 || rawRadius.includes('50%')));

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

  const maskHole = document.getElementById('tutorial-mask-hole');
  if (maskHole) {
    maskHole.setAttribute('x', holeX);
    maskHole.setAttribute('y', holeY);
    maskHole.setAttribute('width', holeW);
    maskHole.setAttribute('height', holeH);
    maskHole.setAttribute('rx', rxVal);
    maskHole.setAttribute('ry', rxVal);
  }

  spotlightEl.style.top = `${holeY}px`;
  spotlightEl.style.left = `${holeX}px`;
  spotlightEl.style.width = `${holeW}px`;
  spotlightEl.style.height = `${holeH}px`;
  spotlightEl.style.borderRadius = spotBorderRadius;

  if (cardEl && cardEl.classList.contains('active')) {
    positionCard(rect);
  }
}

function findVisibleTarget(selector) {
  if (!selector) return null;
  const parts = selector.split(',').map(s => s.trim());
  for (const part of parts) {
    const nodes = document.querySelectorAll(part);
    for (const el of nodes) {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      if (rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden') {
        return el;
      }
    }
  }
  return null;
}

function renderStepHighlight(index) {
  const step = TUTORIAL_STEPS[index];
  let targetNode = findVisibleTarget(step.target);

  if (!targetNode && step.fallback) targetNode = findVisibleTarget(step.fallback);
  if (!targetNode && step.target?.includes('data-route')) targetNode = findVisibleTarget('#btn-open-sidebar-mobile, .hamburger, .sidebar-nav');
  if (!targetNode) targetNode = document.querySelector('.main-content, #page-content');

  if (!targetNode) {
    if (index < TUTORIAL_STEPS.length - 1) showStep(index + 1);
    else endTutorial(false);
    return;
  }

  activeTargetNode = targetNode;
  targetNode.classList.add('tutorial-target-active');
  targetNode.scrollIntoView({ behavior: 'auto', block: 'center' });

  renderTooltipCard(index, targetNode.getBoundingClientRect());

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

  if (left < margin) left = margin;
  if (left + cardWidth > window.innerWidth - margin) left = window.innerWidth - cardWidth - margin;
  if (top < margin) top = margin;
  if (top + cardHeight > window.innerHeight - margin) top = window.innerHeight - cardHeight - margin;

  cardEl.style.top = `${top}px`;
  cardEl.style.left = `${left}px`;
}

function nextStep() { showStep(currentStepIndex + 1); }
function prevStep() { showStep(currentStepIndex - 1); }

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

  cardEl?.classList.remove('active');
  overlayEl?.classList.remove('active');

  if (window.location.pathname !== '/dashboard') {
    navigateTo('/dashboard');
  }

  setTimeout(() => { cleanupTutorialDOM(); }, TUTORIAL_TIMING.EXIT_CLEANUP_DELAY);
}

function cleanupTutorialDOM() {
  document.body.classList.remove('tutorial-active');
  document.documentElement.classList.remove('tutorial-active');
  unlockUserScroll();
  window.removeEventListener('resize', updateHighlightPosition);
  window.removeEventListener('scroll', updateHighlightPosition);

  if (overlayEl?.parentNode) overlayEl.parentNode.removeChild(overlayEl);
  if (spotlightEl?.parentNode) spotlightEl.parentNode.removeChild(spotlightEl);
  if (cardEl?.parentNode) cardEl.parentNode.removeChild(cardEl);
  overlayEl = null;
  spotlightEl = null;
  cardEl = null;
}
