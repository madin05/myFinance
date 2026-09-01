/**
 * @module deleteAccountModal
 * Destructive account deletion modal with password/keyword verification.
 */
import { showToast } from '../notifications.js';
import { getContainer, bindModalEvents } from './modalCore.js';

export function openDeleteAccountModal(authProvider, onConfirm) {
  const container = getContainer();
  if (!container) return;

  const isGoogle = authProvider === 'google.com';

  container.innerHTML = `
    <div class="modal-overlay" id="delete-acc-overlay">
      <div class="modal-content" style="max-width: 440px;">
        <div class="modal-header">
          <h3 style="color: var(--red); font-size: 1.15rem; margin: 0;">Hapus Akun &amp; Data Permanen</h3>
        </div>
        <div class="modal-body" style="padding: 1.25rem 1.5rem 1.5rem;">
          <div style="margin: 0 auto 1.25rem; display: flex; justify-content: center; align-items: center;">
            <img src="/assets/warning_delete_light.svg" class="delete-warning-img-light" alt="Peringatan Hapus Akun" style="width: 160px; height: auto; max-height: 160px; object-fit: contain;" />
            <img src="/assets/warning_delete_dark.svg" class="delete-warning-img-dark" alt="Peringatan Hapus Akun" style="width: 160px; height: auto; max-height: 160px; object-fit: contain;" />
          </div>

          <p style="margin-bottom: 1.25rem; font-size: 0.88rem; color: var(--text-muted); line-height: 1.6; text-align: center;">Tindakan ini tidak dapat dibatalkan. Semua transaksi, anggaran, dan wishlist Anda akan terhapus selamanya.</p>
          
          <form id="form-delete-acc" style="text-align: left;">
            <div class="form-group" style="margin-bottom: 1.25rem;">
              <label style="font-size: 0.85rem; font-weight: 600; margin-bottom: 6px; display: block;">${isGoogle ? 'Ketik "HAPUS" untuk konfirmasi' : 'Masukkan Password Anda'}</label>
              <input type="${isGoogle ? 'text' : 'password'}" class="form-control" id="delete-verify-input" required autocomplete="off" placeholder="${isGoogle ? 'HAPUS' : 'Password...'}" style="height: 44px; border-radius: 10px;">
            </div>
            
            <div style="display: flex; gap: 0.75rem; margin-top: 1.5rem;">
              <button type="button" class="btn btn-outline" style="flex: 1; height: 46px; border-radius: 12px; font-weight: 600;" id="btn-cancel-delete">Batal</button>
              <button type="submit" class="btn btn-primary" style="flex: 1; height: 46px; border-radius: 12px; font-weight: 600; background: var(--red); border-color: var(--red); color: white;">Hapus Permanen</button>
            </div>
          </form>
        </div>
      </div>
    </div>
    <style>
      .delete-warning-img-dark { display: none; }
      .delete-warning-img-light { display: block; }
      [data-theme="light"] .delete-warning-img-dark { display: none !important; }
      [data-theme="light"] .delete-warning-img-light { display: block !important; }
      [data-theme="dark"] .delete-warning-img-light { display: none !important; }
      [data-theme="dark"] .delete-warning-img-dark { display: block !important; }
    </style>
  `;

  // Ghost fix: removed non-existent 'btn-close-delete-x' from closeBtnIds
  const closeModal = bindModalEvents(container, 'delete-acc-overlay', ['btn-cancel-delete']);
  requestAnimationFrame(() => {
    document.getElementById('delete-acc-overlay')?.classList.add('active');
  });

  document.getElementById('form-delete-acc').addEventListener('submit', (e) => {
    e.preventDefault();
    const val = document.getElementById('delete-verify-input').value;
    
    if (isGoogle && val !== 'HAPUS') {
      // Security fix: use static import instead of redundant dynamic import
      showToast('Ketik kata HAPUS dengan huruf kapital', 'error');
      return;
    }
    
    closeModal();
    if (onConfirm) onConfirm(isGoogle ? null : val);
  });
  
  setTimeout(() => document.getElementById('delete-verify-input')?.focus(), 50);
}
