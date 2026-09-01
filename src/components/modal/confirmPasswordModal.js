/**
 * @module confirmPasswordModal
 * Password re-entry modal for 2FA deactivation.
 */
import { getContainer, bindModalEvents } from './modalCore.js';

export function openConfirmPasswordModal(onConfirm, onCancel) {
  const container = getContainer();
  if (!container) return;

  container.innerHTML = `
    <div class="modal-overlay" id="pwd-confirm-overlay" style="z-index: 9999;">
      <div class="modal-content" style="max-width: 400px; padding: 2rem; border-radius: 20px;">
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <div style="width: 56px; height: 56px; background: rgba(239, 68, 68, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; color: #ef4444; font-size: 1.75rem;">
            <i class="ph ph-shield-warning"></i>
          </div>
          <h3 style="font-size: 1.2rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.5rem;">Konfirmasi Menonaktifkan 2FA</h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.5;">Masukkan kata sandi akun Anda untuk memverifikasi tindakan ini.</p>
        </div>

        <form id="form-confirm-pwd" style="display: flex; flex-direction: column; gap: 1rem;">
          <div class="form-group" style="margin-bottom: 0;">
            <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-bottom: 0.4rem; display: block;">Kata Sandi Saat Ini</label>
            <input type="password" id="input-confirm-pwd" class="form-control" placeholder="••••••••" required style="height: 48px; border-radius: 12px;">
          </div>
          
          <div style="display: flex; gap: 10px; margin-top: 0.5rem;">
            <button type="button" id="btn-cancel-pwd" class="btn btn-outline" style="flex: 1; height: 48px; border-radius: 12px; font-weight: 600;">Batal</button>
            <button type="submit" class="btn" style="flex: 1; height: 48px; border-radius: 12px; font-weight: 600; background: var(--red); color: white; border: none;">Nonaktifkan</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const closeModal = bindModalEvents(container, 'pwd-confirm-overlay', ['btn-cancel-pwd'], onCancel);

  document.getElementById('form-confirm-pwd').onsubmit = (e) => {
    e.preventDefault();
    const pwd = document.getElementById('input-confirm-pwd').value.trim();
    if (!pwd) return;
    closeModal();
    if (onConfirm) onConfirm(pwd);
  };
}
