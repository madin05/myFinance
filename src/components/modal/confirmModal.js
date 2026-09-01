/**
 * @module confirmModal
 * Generic confirmation dialog (e.g. "Hapus Transaksi?").
 */
import { showLoading, hideLoading } from '../../utils.js';
import { checkVerification } from '../notifications.js';
import { getContainer, bindModalEvents } from './modalCore.js';

export function openConfirmModal(title, message, onConfirm) {
  let allowed = false;
  checkVerification(() => { allowed = true; });
  if (!allowed) return;

  const container = getContainer();
  if (!container) return;

  container.innerHTML = `
    <div class="modal-overlay" id="confirm-overlay">
      <div class="modal-content" style="max-width: 420px; text-align: left;">
        <div class="modal-header" style="justify-content: flex-start;">
          <h3 style="display: flex; align-items: center; gap: 10px; font-size: 1.2rem; font-weight: 700; color: var(--text-main); margin: 0 !important;">
            <i class="ph-fill ph-question" style="font-size: 1.4rem;"></i>
            ${title}
          </h3>
        </div>
        <div class="modal-body">
          <p class="text-muted" style="margin-bottom: 2rem; font-size: 0.92rem; line-height: 1.5;">${message}</p>
          <div style="display: flex; gap: 0.75rem;">
            <button class="btn btn-outline" style="flex: 1; justify-content: center; height: 46px; border-radius: 12px; font-weight: 600;" id="btn-cancel-confirm">Batal</button>
            <button class="btn btn-primary" style="flex: 1; justify-content: center; height: 46px; border-radius: 12px; font-weight: 600; background: var(--red); border-color: var(--red); color: white;" id="btn-do-confirm">Ya, Hapus</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const closeModal = bindModalEvents(container, 'confirm-overlay', ['btn-cancel-confirm']);

  document.getElementById('btn-do-confirm').addEventListener('click', () => {
    closeModal();
    showLoading();
    setTimeout(() => {
      onConfirm();
      hideLoading();
    }, 800);
  });
}
