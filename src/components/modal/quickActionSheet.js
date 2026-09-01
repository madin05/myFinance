/**
 * @module quickActionSheet
 * Mobile quick-action bottom sheet — navigates to key features.
 */
import { checkVerification } from '../notifications.js';
import { getContainer, animateCloseModal, bindModalEvents } from './modalCore.js';

export function openQuickActionSheet() {
  const container = getContainer();
  if (!container) return;

  container.innerHTML = `
    <div class="modal-overlay" id="quick-action-overlay">
      <div class="modal-content quick-action-card" id="quick-action-card">
        <div class="quick-action-header">
          <h3>Pilih Aksi Cepat</h3>
        </div>
        <div class="quick-action-grid">
          <div class="quick-action-item" role="button" tabindex="0" id="qa-ai-chat">
            <div class="qa-icon"><i class="ph-fill ph-robot"></i></div>
            <div class="qa-info"><h4>Asisten AI MyFinance</h4></div>
            <i class="ph ph-caret-right qa-arrow"></i>
          </div>

          <div class="quick-action-item" role="button" tabindex="0" id="qa-add-tx">
            <div class="qa-icon"><i class="ph-fill ph-receipt"></i></div>
            <div class="qa-info"><h4>Tambah Transaksi</h4></div>
            <i class="ph ph-caret-right qa-arrow"></i>
          </div>

          <div class="quick-action-item" role="button" tabindex="0" id="qa-scan-receipt">
            <div class="qa-icon"><i class="ph-fill ph-scan"></i></div>
            <div class="qa-info"><h4>Scan Struk (OCR)</h4></div>
            <i class="ph ph-caret-right qa-arrow"></i>
          </div>

          <div class="quick-action-item" role="button" tabindex="0" id="qa-wishlist">
            <div class="qa-icon"><i class="ph-fill ph-heart"></i></div>
            <div class="qa-info"><h4>Wishlist &amp; Tabungan</h4></div>
            <i class="ph ph-caret-right qa-arrow"></i>
          </div>

          <div class="quick-action-item" role="button" tabindex="0" id="qa-calculator">
            <div class="qa-icon"><i class="ph-fill ph-calculator"></i></div>
            <div class="qa-info"><h4>Kalkulator</h4></div>
            <i class="ph ph-caret-right qa-arrow"></i>
          </div>
        </div>
      </div>
    </div>
  `;

  const closeModal = bindModalEvents(container, 'quick-action-overlay', ['close-quick-action']);

  document.getElementById('qa-ai-chat')?.addEventListener('click', () => {
    animateCloseModal(container, () => {
      import('../../router.js').then(m => m.navigateTo('/ai'));
    });
  });

  document.getElementById('qa-add-tx')?.addEventListener('click', () => {
    animateCloseModal(container, () => {
      checkVerification(() => {
        import('./transactionModal.js').then(m => {
          m.openAddTransactionModal(() => {
            const path = window.location.pathname || '/dashboard';
            if (path === '/dashboard' || path === '/transaksi') {
              import('../../router.js').then(r => r.handleRoute());
            }
          });
        });
      });
    });
  });

  document.getElementById('qa-scan-receipt')?.addEventListener('click', () => {
    animateCloseModal(container, () => {
      checkVerification(() => {
        import('../scanReceipt.js').then(m => m.openScanReceiptModal());
      });
    });
  });

  document.getElementById('qa-wishlist')?.addEventListener('click', () => {
    animateCloseModal(container, () => {
      import('../../router.js').then(m => m.navigateTo('/tabungan'));
    });
  });

  document.getElementById('qa-calculator')?.addEventListener('click', () => {
    animateCloseModal(container, () => {
      import('../calculator.js').then(m => m.openCalculator());
    });
  });
}
