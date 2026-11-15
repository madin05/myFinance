const OFFLINE_GATE_ID = 'pwa-offline-gate';
const UPDATE_TOAST_ID = 'pwa-update-toast';
const IOS_MODAL_ID = 'pwa-ios-install-modal';

let previousFocusedElement = null;

function createWifiOffSvg() {
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <line x1="2" y1="2" x2="22" y2="22"></line>
    <path d="M8.5 16.5a5 5 0 0 1 7 0"></path>
    <path d="M2 8.82a15 15 0 0 1 4.17-2.65"></path>
    <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76"></path>
    <path d="M16.85 11.25a10 10 0 0 1 2.22 1.68"></path>
    <path d="M5 13a10 10 0 0 1 5.24-2.76"></path>
    <line x1="12" y1="20" x2="12.01" y2="20"></line>
  </svg>`;
}

function createRefreshSvg() {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M21 12a9 9 0 1 1-2.64-6.36"></path>
    <polyline points="21 3 21 9 15 9"></polyline>
  </svg>`;
}

function ensureOfflineGate({ onRetry } = {}) {
  let gate = document.getElementById(OFFLINE_GATE_ID);
  if (gate) return gate;

  gate = document.createElement('div');
  gate.id = OFFLINE_GATE_ID;
  gate.className = 'pwa-offline-gate';
  gate.setAttribute('role', 'alertdialog');
  gate.setAttribute('aria-modal', 'true');
  gate.setAttribute('aria-labelledby', 'pwa-offline-title');
  gate.hidden = true;

  gate.innerHTML = `
    <div class="pwa-offline-card">
      <div class="pwa-offline-illustration-wrapper">
        <img src="/assets/offline-illustration-light.webp" class="pwa-offline-img pwa-offline-img-light" alt="Oops kamu offline nih, periksa jaringanmu kembali" width="340" height="269" />
        <img src="/assets/offline-illustration-dark.webp" class="pwa-offline-img pwa-offline-img-dark" alt="Oops kamu offline nih, periksa jaringanmu kembali" width="340" height="269" />
      </div>

      <h2 id="pwa-offline-title" class="pwa-offline-sr-only">Oops kamu offline nih, periksa jaringanmu kembali.</h2>

      <p id="pwa-offline-feedback" class="pwa-offline-feedback" aria-live="polite"></p>

      <button type="button" id="pwa-offline-retry" class="pwa-btn-primary">
        ${createRefreshSvg()}
        <span>Coba Hubungkan Ulang</span>
      </button>
    </div>
  `;

  document.body.appendChild(gate);

  const retryBtn = gate.querySelector('#pwa-offline-retry');
  retryBtn?.addEventListener('click', () => {
    onRetry?.();
  });

  // Trap focus inside the blocking offline gate so keyboard users cannot tab into blocked background controls.
  gate.addEventListener('keydown', (event) => {
    if (event.key === 'Tab' && !gate.hidden) {
      event.preventDefault();
      retryBtn?.focus();
    }
  });

  return gate;
}

/**
 * Displays the online-only blocking overlay and locks background scrolling and focus.
 */
export function showOfflineGate({ onRetry, message = '' } = {}) {
  if (typeof document === 'undefined') return;
  const gate = ensureOfflineGate({ onRetry });
  const feedbackEl = gate.querySelector('#pwa-offline-feedback');
  if (feedbackEl && message) {
    feedbackEl.textContent = message;
  }

  if (gate.hidden) {
    previousFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    gate.hidden = false;
    document.documentElement.classList.add('pwa-offline-locked');
    document.body.classList.add('pwa-offline-locked');
    requestAnimationFrame(() => {
      gate.classList.add('active');
      gate.querySelector('#pwa-offline-retry')?.focus();
    });
  }
}

/**
 * Updates helper status text and loading state on the blocking offline overlay.
 */
export function setOfflineGateFeedback(message, isChecking = false) {
  if (typeof document === 'undefined') return;
  const gate = document.getElementById(OFFLINE_GATE_ID);
  if (!gate) return;

  const feedbackEl = gate.querySelector('#pwa-offline-feedback');
  const retryBtn = gate.querySelector('#pwa-offline-retry');
  if (feedbackEl) feedbackEl.textContent = message;
  if (retryBtn) {
    retryBtn.disabled = Boolean(isChecking);
    const labelEl = retryBtn.querySelector('span');
    if (labelEl) {
      labelEl.textContent = isChecking ? 'Memeriksa Koneksi...' : 'Coba Hubungkan Ulang';
    }
  }
}

/**
 * Hides the blocking offline overlay once connectivity is restored.
 */
export function hideOfflineGate() {
  if (typeof document === 'undefined') return;
  const gate = document.getElementById(OFFLINE_GATE_ID);
  if (!gate || gate.hidden) return;

  gate.classList.remove('active');
  gate.hidden = true;
  document.documentElement.classList.remove('pwa-offline-locked');
  document.body.classList.remove('pwa-offline-locked');

  const feedbackEl = gate.querySelector('#pwa-offline-feedback');
  if (feedbackEl) feedbackEl.textContent = '';

  const retryBtn = gate.querySelector('#pwa-offline-retry');
  if (retryBtn) {
    retryBtn.disabled = false;
    const labelEl = retryBtn.querySelector('span');
    if (labelEl) labelEl.textContent = 'Coba Hubungkan Ulang';
  }

  if (previousFocusedElement && document.contains(previousFocusedElement)) {
    previousFocusedElement.focus();
  }
  previousFocusedElement = null;
}

/**
 * Displays a non-intrusive toast notification when a newer Service Worker version is ready.
 */
export function showUpdateToast({ onAccept, onDismiss } = {}) {
  if (typeof document === 'undefined') return;

  let toast = document.getElementById(UPDATE_TOAST_ID);
  if (!toast) {
    toast = document.createElement('aside');
    toast.id = UPDATE_TOAST_ID;
    toast.className = 'pwa-update-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    toast.innerHTML = `
      <div class="pwa-update-body">
        <p class="pwa-update-title">Versi Baru Tersedia</p>
        <p class="pwa-update-desc">Muat ulang MyFinance untuk menggunakan pembaruan terbaru.</p>
      </div>
      <div class="pwa-update-actions">
        <button type="button" class="pwa-btn-secondary" data-pwa-later>Nanti</button>
        <button type="button" class="pwa-btn-primary" data-pwa-reload>Perbarui</button>
      </div>
    `;

    document.body.appendChild(toast);
  }

  const closeToast = () => {
    toast.classList.remove('active');
    onDismiss?.();
  };

  toast.querySelector('[data-pwa-later]')?.addEventListener('click', closeToast, { once: true });
  toast.querySelector('[data-pwa-reload]')?.addEventListener(
    'click',
    () => {
      closeToast();
      onAccept?.();
    },
    { once: true }
  );

  const handleEscape = (event) => {
    if (event.key === 'Escape') {
      closeToast();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);

  requestAnimationFrame(() => {
    toast.classList.add('active');
  });
}

/**
 * Opens an accessible Safari iOS installation guide modal (bottom sheet on mobile, centered card on desktop).
 */
export function showIosInstallModal() {
  if (typeof document === 'undefined') return;

  let modal = document.getElementById(IOS_MODAL_ID);
  if (!modal) {
    modal = document.createElement('div');
    modal.id = IOS_MODAL_ID;
    modal.className = 'pwa-ios-modal-overlay';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'pwa-ios-title');

    modal.innerHTML = `
      <div class="pwa-ios-modal-card">
        <div class="pwa-ios-pull-bar" aria-hidden="true"></div>
        <div class="pwa-ios-header">
          <h3 id="pwa-ios-title">Pasang MyFinance di Perangkat</h3>
          <button type="button" class="pwa-ios-close" aria-label="Tutup panduan pasang">&times;</button>
        </div>
        <div class="pwa-ios-content">
          <p class="pwa-ios-intro">Tambahkan MyFinance ke layar utama untuk akses cepat dalam mode aplikasi penuh:</p>
          <ol class="pwa-ios-steps">
            <li>Tekan tombol <strong>Bagikan (Share)</strong> di bilah menu Safari.</li>
            <li>Gulir ke bawah dan pilih <strong>Tambah ke Layar Utama (Add to Home Screen)</strong>.</li>
            <li>Ketuk <strong>Tambah (Add)</strong> di pojok kanan atas layar.</li>
          </ol>
        </div>
        <div class="pwa-ios-footer">
          <button type="button" class="pwa-btn-primary" data-pwa-ios-done>Mengerti</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => {
      modal.classList.remove('active');
      document.documentElement.classList.remove('modal-open');
      document.body.classList.remove('modal-open');
    };

    modal.querySelector('.pwa-ios-close')?.addEventListener('click', closeModal);
    modal.querySelector('[data-pwa-ios-done]')?.addEventListener('click', closeModal);
    modal.addEventListener('click', (event) => {
      if (event.target === modal) closeModal();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal.classList.contains('active')) {
        closeModal();
      }
    });
  }

  requestAnimationFrame(() => {
    modal.classList.add('active');
    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');
    modal.querySelector('[data-pwa-ios-done]')?.focus();
  });
}
