/**
 * @module deleteAccountModal
 * Destructive account deletion modal with email 6-digit OTP verification flow.
 */
import { showToast } from '../notifications.js';
import { getContainer, bindModalEvents } from './modalCore.js';

export function openDeleteAccountModal({ email, onRequestOtp, onVerifyOtp }) {
  const container = getContainer();
  if (!container) return;

  let currentStep = 1;
  let timerInterval = null;
  let countdown = 30;

  function renderModal() {
    container.innerHTML = `
      <div class="modal-overlay" id="delete-acc-overlay">
        <div class="modal-content" style="max-width: 440px; border-radius: 16px;">
          <div class="modal-header" style="border-bottom: 1px solid var(--border); padding: 1.25rem 1.5rem;">
            <h3 style="color: var(--red); font-size: 1.15rem; margin: 0; font-weight: 700; display: flex; align-items: center; gap: 0.5rem;">
              <i class="ph ph-warning-circle" style="font-size: 1.3rem;"></i>
              ${currentStep === 1 ? 'Hapus Akun & Data Permanen' : 'Verifikasi OTP Hapus Akun'}
            </h3>
          </div>
          <div class="modal-body" style="padding: 1.5rem;">
            <div style="margin: 0 auto 1.25rem; display: flex; justify-content: center; align-items: center; min-height: 140px; width: 100%;">
              <img src="/assets/warning_delete_light.svg" class="delete-warning-img-light" alt="Peringatan Hapus Akun" decoding="sync" fetchpriority="high" style="width: 140px; height: 140px; object-fit: contain;" />
              <img src="/assets/warning_delete_dark.svg" class="delete-warning-img-dark" alt="Peringatan Hapus Akun" decoding="sync" fetchpriority="high" style="width: 140px; height: 140px; object-fit: contain;" />
            </div>

            ${currentStep === 1 ? `
              <p style="margin-bottom: 1.25rem; font-size: 0.88rem; color: var(--text-muted); line-height: 1.6; text-align: center;">
                Tindakan ini <strong>tidak dapat dibatalkan</strong>. Seluruh data transaksi, anggaran, dan saldo Anda akan terhapus selamanya.<br><br>
                Kami akan mengirimkan <strong>6-digit kode OTP</strong> ke email <strong style="color: var(--text-main);">${email || 'Anda'}</strong> untuk mengonfirmasi tindakan ini.
              </p>
              
              <div style="display: flex; gap: 0.75rem; margin-top: 1.5rem;">
                <button type="button" class="btn btn-outline" style="flex: 1; height: 44px; border-radius: 10px; font-weight: 600;" id="btn-cancel-delete">Batal</button>
                <button type="button" class="btn btn-primary" style="flex: 1; height: 44px; border-radius: 10px; font-weight: 600; background: var(--red); border-color: var(--red); color: white;" id="btn-send-delete-otp">
                  Kirim Kode OTP
                </button>
              </div>
            ` : `
              <p style="margin-bottom: 1.25rem; font-size: 0.88rem; color: var(--text-muted); line-height: 1.6; text-align: center;">
                Masukkan 6-digit kode OTP yang telah dikirim ke email <strong style="color: var(--text-main);">${email || 'Anda'}</strong>.
              </p>
              
              <form id="form-delete-otp" style="text-align: left;">
                <div class="form-group" style="margin-bottom: 1rem;">
                  <label style="font-size: 0.85rem; font-weight: 600; margin-bottom: 6px; display: block; text-align: center;">Kode OTP 6-Digit</label>
                  <input type="text" class="form-control" id="delete-otp-input" maxlength="6" inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" required placeholder="000000" style="height: 48px; border-radius: 10px; font-size: 1.4rem; font-weight: 700; letter-spacing: 8px; text-align: center;">
                </div>

                <div style="text-align: center; margin-bottom: 1.25rem;">
                  <button type="button" id="btn-resend-delete-otp" style="background: none; border: none; font-size: 0.82rem; color: var(--primary); cursor: pointer; text-decoration: underline; font-weight: 600;" ${countdown > 0 ? 'disabled' : ''}>
                    ${countdown > 0 ? `Kirim ulang OTP dalam (${countdown}s)` : 'Kirim Ulang Kode OTP'}
                  </button>
                </div>
                
                <div style="display: flex; gap: 0.75rem; margin-top: 1.25rem;">
                  <button type="button" class="btn btn-outline" style="flex: 1; height: 44px; border-radius: 10px; font-weight: 600;" id="btn-cancel-delete">Batal</button>
                  <button type="submit" class="btn btn-primary" style="flex: 1; height: 44px; border-radius: 10px; font-weight: 600; background: var(--red); border-color: var(--red); color: white;" id="btn-submit-delete-confirm">Hapus Permanen</button>
                </div>
              </form>
            `}
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

    const closeModal = bindModalEvents(container, 'delete-acc-overlay', ['btn-cancel-delete']);
    requestAnimationFrame(() => {
      document.getElementById('delete-acc-overlay')?.classList.add('active');
    });

    if (currentStep === 1) {
      document.getElementById('btn-send-delete-otp')?.addEventListener('click', async () => {
        const btn = document.getElementById('btn-send-delete-otp');
        if (btn) {
          btn.disabled = true;
          btn.textContent = 'Mengirim...';
        }
        try {
          if (onRequestOtp) await onRequestOtp();
          currentStep = 2;
          renderModal();
          startResendTimer();
          showToast('Kode OTP berhasil dikirim ke email kamu!', 'success');
        } catch (err) {
          if (btn) {
            btn.disabled = false;
            btn.textContent = 'Kirim Kode OTP';
          }
          showToast(err.message || 'Gagal mengirim kode OTP.', 'error');
        }
      });
    } else {
      setTimeout(() => document.getElementById('delete-otp-input')?.focus(), 50);

      document.getElementById('btn-resend-delete-otp')?.addEventListener('click', async () => {
        if (countdown > 0) return;
        try {
          if (onRequestOtp) await onRequestOtp();
          startResendTimer();
          showToast('Kode OTP baru telah dikirim ke email kamu!', 'success');
        } catch (err) {
          showToast(err.message || 'Gagal mengirim ulang OTP.', 'error');
        }
      });

      document.getElementById('form-delete-otp')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const otpVal = document.getElementById('delete-otp-input')?.value?.trim();

        if (!otpVal || otpVal.length !== 6) {
          showToast('Masukkan 6-digit kode OTP dengan benar.', 'error');
          return;
        }

        const btnSubmit = document.getElementById('btn-submit-delete-confirm');
        if (btnSubmit) {
          btnSubmit.disabled = true;
          btnSubmit.textContent = 'Memproses...';
        }

        try {
          if (onVerifyOtp) await onVerifyOtp(otpVal);
          if (timerInterval) clearInterval(timerInterval);
          closeModal();
        } catch (err) {
          if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Hapus Permanen';
          }
          showToast(err.message || 'Kode OTP tidak valid atau kadaluarsa.', 'error');
        }
      });
    }
  }

  function startResendTimer() {
    countdown = 30;
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      countdown -= 1;
      const resendBtn = document.getElementById('btn-resend-delete-otp');
      if (resendBtn) {
        if (countdown > 0) {
          resendBtn.disabled = true;
          resendBtn.textContent = `Kirim ulang OTP dalam (${countdown}s)`;
        } else {
          resendBtn.disabled = false;
          resendBtn.textContent = 'Kirim Ulang Kode OTP';
          clearInterval(timerInterval);
        }
      } else {
        clearInterval(timerInterval);
      }
    }, 1000);
  }

  renderModal();
}
