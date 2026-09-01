/**
 * @module enable2FAModal
 * 2FA activation modal — sends OTP to email, verifies 6-digit code.
 *
 * Security improvements:
 *  - Uses centralized API_URL from apiClient.js (no inline localhost check)
 *  - Uses getAuthHeaders() for consistent Authorization header management
 */
import { store } from '../../store.js';
import { showLoading, hideLoading } from '../../utils.js';
import { showToast } from '../notifications.js';
import { API_URL, getAuthHeaders } from '../../services/apiClient.js';
import { getContainer, bindModalEvents } from './modalCore.js';

// --- OTP HELPERS ---

/** Generates the repeated OTP input HTML (6 digits) */
function buildOtpInputsHtml() {
  const style = 'width: 44px; height: 52px; text-align: center; font-size: 1.3rem; font-weight: 700; border-radius: 10px; border: 1.5px solid var(--border-color); background: var(--bg-color); color: var(--text-main);';
  return Array.from({ length: 6 }, () =>
    `<input type="text" class="otp-box-digit" maxlength="1" inputmode="numeric" pattern="[0-9]*" autocomplete="off" required style="${style}" />`
  ).join('\n');
}

/** Wires up auto-advance, backspace, and paste behavior on OTP digit inputs */
function initOtpDigitBehavior(digits) {
  digits.forEach((digit, idx) => {
    digit.addEventListener('input', (e) => {
      const val = e.target.value.replace(/\D/g, '');
      e.target.value = val;
      if (val && idx < digits.length - 1) {
        digits[idx + 1].focus();
      }
    });

    digit.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !digit.value && idx > 0) {
        digits[idx - 1].focus();
      }
    });

    digit.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
      if (pasteData) {
        pasteData.split('').forEach((char, i) => {
          if (digits[i]) digits[i].value = char;
        });
        const focusIdx = Math.min(pasteData.length, digits.length - 1);
        if (digits[focusIdx]) digits[focusIdx].focus();
      }
    });
  });
}

// --- MODAL ---

export function openEnable2FAModal(onSuccess, onCancel) {
  const container = getContainer();
  if (!container) return;

  showLoading();

  const token = store.user?.token;
  fetch(`${API_URL}/auth/2fa/enable-request`, {
    method: 'POST',
    headers: getAuthHeaders(token)
  })
  .then(res => res.json().then(data => ({ ok: res.ok, data })))
  .then(({ ok, data }) => {
    hideLoading();
    if (!ok) {
      showToast(data.error || 'Gagal mengirim kode verifikasi 2FA.', 'error');
      if (onCancel) onCancel();
      return;
    }

    const preAuthToken = data.preAuthToken;

    container.innerHTML = `
      <div class="modal-overlay" id="enable-2fa-overlay">
        <div class="modal-content" style="max-width: 440px; text-align: center;">
          <div class="modal-header" style="justify-content: center; border-bottom: none; padding-bottom: 0;">
            <div style="width: 52px; height: 52px; border-radius: 50%; background: rgba(2, 132, 199, 0.1); display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
              <i class="ph-bold ph-shield-check" style="font-size: 28px; color: var(--primary);"></i>
            </div>
          </div>
          <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">Verifikasi Aktivasi 2FA</h3>
          <p style="font-size: 0.88rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 1.5rem; padding: 0 10px;">
            ${data.message || 'Kami mengirimkan 6-digit kode verifikasi ke email Anda untuk mengonfirmasi pengaktifan 2FA.'}
          </p>

          <form id="form-enable-2fa-otp">
            <div class="otp-grid" style="display: flex; gap: 8px; justify-content: center; margin-bottom: 1.25rem;">
              ${buildOtpInputsHtml()}
            </div>

            <p id="enable-2fa-error" style="color: var(--red); font-size: 0.82rem; margin-bottom: 1rem; display: none; font-weight: 600;"></p>

            <div style="display: flex; gap: 0.75rem; margin-top: 1rem;">
              <button type="button" class="btn btn-outline" style="flex: 1; height: 46px; border-radius: 12px; font-weight: 600;" id="btn-cancel-enable-2fa">Batal</button>
              <button type="submit" class="btn btn-primary" style="flex: 1; height: 46px; border-radius: 12px; font-weight: 600;" id="btn-submit-enable-2fa">Aktifkan 2FA</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const closeModal = bindModalEvents(container, 'enable-2fa-overlay', ['btn-cancel-enable-2fa'], () => {
      if (onCancel) onCancel();
    });

    const form = document.getElementById('form-enable-2fa-otp');
    const digits = container.querySelectorAll('.otp-box-digit');
    const errEl = document.getElementById('enable-2fa-error');
    const submitBtn = document.getElementById('btn-submit-enable-2fa');

    initOtpDigitBehavior(digits);
    setTimeout(() => { digits[0]?.focus(); }, 100);

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const otpCode = Array.from(digits).map(d => d.value).join('');

      if (otpCode.length !== 6) {
        if (errEl) { errEl.textContent = 'Harap masukkan 6-digit kode OTP.'; errEl.style.display = 'block'; }
        return;
      }

      if (errEl) errEl.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Memverifikasi...';

      try {
        const verifyRes = await fetch(`${API_URL}/auth/2fa/enable-confirm`, {
          method: 'POST',
          headers: getAuthHeaders(preAuthToken),
          body: JSON.stringify({ otp: otpCode })
        });

        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) throw new Error(verifyData.error || 'Verifikasi OTP gagal.');

        if (store.user) {
          store.user.is2FAEnabled = true;
          store.user.twoFactorEmailEnabled = true;
          store.save();
        }

        closeModal();
        showToast(verifyData.message || 'Autentikasi 2FA berhasil diaktifkan!', 'success');
        if (onSuccess) onSuccess(verifyData);
      } catch (err) {
        if (errEl) {
          errEl.textContent = err.message || 'Gagal memverifikasi OTP.';
          errEl.style.display = 'block';
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Aktifkan 2FA';
        digits.forEach(d => { d.value = ''; });
        digits[0]?.focus();
      }
    });
  })
  .catch(err => {
    hideLoading();
    showToast(err.message || 'Gagal meminta kode 2FA.', 'error');
    if (onCancel) onCancel();
  });
}
