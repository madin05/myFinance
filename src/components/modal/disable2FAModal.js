/**
 * @module disable2FAModal
 * 2FA deactivation modal — sends OTP to email, verifies 6-digit code before disabling.
 */
import { store } from '../../store.js';
import { showLoading, hideLoading } from '../../utils.js';
import { showToast } from '../notifications.js';
import { API_URL, getAuthHeaders } from '../../services/apiClient.js';
import { getContainer, bindModalEvents } from './modalCore.js';

function buildOtpInputsHtml() {
  const style = 'width: 44px; height: 52px; text-align: center; font-size: 1.3rem; font-weight: 700; border-radius: 10px; border: 1.5px solid var(--border-color); background: var(--bg-color); color: var(--text-main);';
  return Array.from({ length: 6 }, () =>
    `<input type="text" class="otp-box-digit" maxlength="1" inputmode="numeric" pattern="[0-9]*" autocomplete="off" required style="${style}" />`
  ).join('\n');
}

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

export function openDisable2FAModal(onSuccess, onCancel, confirmPassword = null) {
  const container = getContainer();
  if (!container) return;

  showLoading();

  const token = store.user?.token;
  fetch(`${API_URL}/auth/2fa/disable-request`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ password: confirmPassword })
  })
  .then(async (res) => {
    let data;
    try {
      data = await res.json();
    } catch {
      data = { error: 'Sistem sedang bermasalah. Coba lagi nanti ya!' };
    }
    return { ok: res.ok, data };
  })
  .then(({ ok, data }) => {
    hideLoading();
    if (!ok) {
      showToast(data.error || 'Gagal mengirim kode verifikasi penonaktifan 2FA.', 'error');
      if (onCancel) onCancel();
      return;
    }

    const preAuthToken = data.preAuthToken;

    container.innerHTML = `
      <div class="modal-overlay" id="disable-2fa-overlay">
        <div class="modal-content" style="max-width: 440px; text-align: center;">
          <div class="modal-header" style="justify-content: center; border-bottom: none; padding-bottom: 0;">
            <div style="width: 52px; height: 52px; border-radius: 50%; background: rgba(239, 68, 68, 0.1); display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
              <i class="ph-bold ph-shield-slash" style="font-size: 28px; color: var(--red, #ef4444);"></i>
            </div>
          </div>
          <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">Verifikasi Penonaktifan 2FA</h3>
          <p style="font-size: 0.88rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 1.5rem; padding: 0 10px;">
            ${data.message || 'Kami telah mengirimkan 6-digit kode verifikasi ke email Anda untuk mengonfirmasi penonaktifan 2FA.'}
          </p>

          <form id="form-disable-2fa-otp">
            <div class="otp-grid" style="display: flex; gap: 8px; justify-content: center; margin-bottom: 1.25rem;">
              ${buildOtpInputsHtml()}
            </div>

            <p id="disable-2fa-error" style="color: var(--red); font-size: 0.82rem; margin-bottom: 1rem; display: none; font-weight: 600;"></p>

            <div style="display: flex; gap: 0.75rem; margin-top: 1rem;">
              <button type="button" class="btn btn-outline" style="flex: 1; height: 46px; border-radius: 12px; font-weight: 600;" id="btn-cancel-disable-2fa">Batal</button>
              <button type="submit" class="btn btn-danger" style="flex: 1; height: 46px; border-radius: 12px; font-weight: 600; background: var(--red, #ef4444); color: white; border: none;" id="btn-submit-disable-2fa">Nonaktifkan 2FA</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const closeModal = bindModalEvents(container, 'disable-2fa-overlay', ['btn-cancel-disable-2fa'], () => {
      if (onCancel) onCancel();
    });

    const form = document.getElementById('form-disable-2fa-otp');
    const digits = container.querySelectorAll('.otp-box-digit');
    const errEl = document.getElementById('disable-2fa-error');
    const submitBtn = document.getElementById('btn-submit-disable-2fa');

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
        const verifyRes = await fetch(`${API_URL}/auth/2fa/disable-confirm`, {
          method: 'POST',
          headers: getAuthHeaders(preAuthToken),
          body: JSON.stringify({ otp: otpCode })
        });

        let verifyData;
        try {
          verifyData = await verifyRes.json();
        } catch {
          verifyData = { error: 'Sistem sedang bermasalah. Coba lagi nanti ya!' };
        }
        if (!verifyRes.ok) throw new Error(verifyData.error || 'Verifikasi OTP penonaktifan gagal.');

        if (store.user) {
          store.user.is2FAEnabled = false;
          store.user.twoFactorEmailEnabled = false;
          store.save();
        }

        closeModal();
        showToast(verifyData.message || 'Autentikasi 2-Langkah berhasil dinonaktifkan.', 'success');
        if (onSuccess) onSuccess(verifyData);
      } catch (err) {
        if (errEl) {
          errEl.textContent = err.message || 'Gagal memverifikasi OTP.';
          errEl.style.display = 'block';
        }
        submitBtn.disabled = false;
        submitBtn.textContent = 'Nonaktifkan 2FA';
        digits.forEach(d => { d.value = ''; });
        digits[0]?.focus();
      }
    });
  })
  .catch(err => {
    hideLoading();
    showToast(err.message || 'Gagal meminta kode verifikasi 2FA.', 'error');
    if (onCancel) onCancel();
  });
}
