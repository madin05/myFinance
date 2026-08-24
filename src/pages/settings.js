import { store } from '../store.js';
import { showLoading, hideLoading } from '../utils.js';
import { showToast, checkVerification } from '../components/notifications.js';
import { initCustomSelect } from '../components/customSelect.js';
import { openEnable2FAModal, openConfirmPasswordModal } from '../components/modal.js';
import { auth, EmailAuthProvider, reauthenticateWithCredential } from '../firebase-config.js';

const SUPPORTED_CURRENCIES = ['IDR', 'USD', 'EUR', 'SGD', 'MYR', 'JPY'];

/**
 * Renders the Settings Page
 */
export function renderSettings() {
  const container = document.getElementById('page-content');
  if (!container) return;

  const user = store.user || {};
  const currentStartDay = Math.min(Math.max(parseInt(user.financialStartDay) || 1, 1), 31);
  const currentCurrency = SUPPORTED_CURRENCIES.includes(user.currency) ? user.currency : 'IDR';

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.5rem; padding-bottom: 2rem;">

      <!-- Header -->
      <div>
        <h2 style="margin: 0 0 4px; font-size: 1.4rem; color: var(--text-main); display: flex; align-items: center; gap: 10px;">
          Pengaturan
        </h2>
        <p class="text-muted" style="font-size: 0.85rem; margin: 0;">Kelola preferensi keuangan dan tampilan aplikasi.</p>
      </div>

      <!-- Grid 2 kolom -->
      <div class="settings-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; align-items: start;">

        <!-- Preferensi Keuangan -->
        <div class="stat-card" style="padding: 1.5rem;">
          <h4 style="margin-bottom: 1.25rem; font-size: 1rem; display: flex; align-items: center; gap: 10px;">
            <i class="ph ph-gear" style="font-size: 1.4rem;"></i>
            Preferensi Keuangan
          </h4>
          <div style="display: flex; flex-direction: column; gap: 1.25rem;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="text-xs text-muted mb-xs block" style="display: block; margin-bottom: 4px;">Tanggal Mulai Periode (Gajian)</label>
              <div style="display: flex; gap: 10px; align-items: center;">
                <input type="number" id="financial-start-day" class="form-control" min="1" max="31"
                  value="${currentStartDay}" style="width: 80px; height: 38px;">
                <span class="text-xs text-muted">Tiap bulan</span>
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="text-xs text-muted mb-xs block" style="display: block; margin-bottom: 4px;">Mata Uang Default</label>
              <select id="user-currency" class="form-control" style="height: 38px; font-size: 0.85rem; padding: 0 10px;">
                <option value="IDR" ${currentCurrency === 'IDR' ? 'selected' : ''}>IDR - Rupiah</option>
                <option value="USD" ${currentCurrency === 'USD' ? 'selected' : ''}>USD - US Dollar</option>
                <option value="EUR" ${currentCurrency === 'EUR' ? 'selected' : ''}>EUR - Euro</option>
                <option value="SGD" ${currentCurrency === 'SGD' ? 'selected' : ''}>SGD - Singapore Dollar</option>
                <option value="MYR" ${currentCurrency === 'MYR' ? 'selected' : ''}>MYR - Malaysian Ringgit</option>
                <option value="JPY" ${currentCurrency === 'JPY' ? 'selected' : ''}>JPY - Japanese Yen</option>
              </select>
            </div>

            <div style="border-top: 1px dashed var(--border); margin-top: 0.5rem; padding-top: 1rem;">
              <button class="btn btn-primary btn-full" id="btn-save-financial-start"
                style="height: 38px; font-size: 0.85rem; border-radius: 8px;">
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>

        <!-- Tampilan & Kinerja -->
        <div class="stat-card" style="padding: 1.5rem;">
          <h4 style="margin-bottom: 1.25rem; font-size: 1rem; display: flex; align-items: center; gap: 10px;">
            <i class="ph ph-monitor" style="font-size: 1.4rem;"></i>
            Tampilan &amp; Kinerja
          </h4>
          <div style="display: flex; flex-direction: column; gap: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <p class="font-bold text-sm" style="margin: 0;">Mode Hemat Kinerja</p>
                <p class="text-muted text-xs" style="margin: 0;">Matikan semua animasi &amp; efek blur kaca.</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="toggle-performance-mode"
                  ${localStorage.getItem('disable-animations') === 'true' ? 'checked' : ''}>
                <span class="slider round"></span>
              </label>
            </div>
          </div>
        </div>

        <!-- Keamanan & Autentikasi 2-Langkah (2FA) -->
        <div class="stat-card" style="padding: 1.5rem; grid-column: span 2;">
          <h4 style="margin-bottom: 1.25rem; font-size: 1rem; display: flex; align-items: center; gap: 10px;">
            <i class="ph ph-shield-check" style="font-size: 1.4rem; color: var(--primary, #6366f1);"></i>
            Keamanan &amp; Autentikasi 2-Langkah (2FA)
          </h4>
          <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-hover, #f8fafc); padding: 1rem; border-radius: 8px;">
            <div>
              <p class="font-bold text-sm" style="margin: 0;">Autentikasi OTP Email (2FA)</p>
              <p class="text-muted text-xs" style="margin: 4px 0 0;">Minta kode OTP 6-digit yang dikirim ke email setiap kali melakukan login.</p>
            </div>
            <label class="switch">
              <input type="checkbox" id="toggle-2fa-setting" ${user.is2FAEnabled || user.twoFactorEmailEnabled ? 'checked' : ''}>
              <span class="slider round"></span>
            </label>
          </div>
        </div>

      </div><!-- end grid -->
    </div><!-- end outer -->
  `;

  // Init custom select mata uang
  const currencySelect = document.getElementById('user-currency');
  if (currencySelect) initCustomSelect(currencySelect);

  // Simpan preferensi keuangan
  const btnSave = document.getElementById('btn-save-financial-start');
  if (btnSave) {
    btnSave.addEventListener('click', () => {
      checkVerification(async () => {
        const dayInput = document.getElementById('financial-start-day');
        const currencyInput = document.getElementById('user-currency');
        const rawDay = parseInt(dayInput?.value || '1', 10);
        const validatedDay = Math.min(Math.max(isNaN(rawDay) ? 1 : rawDay, 1), 31);
        const selectedCurrency = SUPPORTED_CURRENCIES.includes(currencyInput?.value) ? currencyInput.value : 'IDR';

        showLoading();
        try {
          await store.updateProfile({
            financialStartDay: validatedDay,
            currency: selectedCurrency
          });
          showToast('Preferensi berhasil disimpan!', 'success');
        } catch (err) {
          showToast('Gagal menyimpan preferensi: ' + (err?.message || err), 'error');
        } finally {
          hideLoading();
        }
      });
    });
  }

  // Toggle Mode Hemat Kinerja
  const togglePerformance = document.getElementById('toggle-performance-mode');
  if (togglePerformance) {
    togglePerformance.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      document.body.classList.toggle('disable-animations', isChecked);
      localStorage.setItem('disable-animations', isChecked ? 'true' : 'false');
      showToast(isChecked ? 'Mode Hemat Kinerja diaktifkan.' : 'Animasi & efek visual diaktifkan.', isChecked ? 'info' : 'success');
    });
  }

  // Toggle 2FA Setting
  const toggle2FA = document.getElementById('toggle-2fa-setting');
  if (toggle2FA) {
    toggle2FA.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      checkVerification(async () => {
        const userFirebase = auth.currentUser;
        if (isChecked) {
          toggle2FA.checked = false;
          openEnable2FAModal(
            () => {
              toggle2FA.checked = true;
            },
            () => {
              toggle2FA.checked = false;
            }
          );
        } else {
          const providerId = userFirebase?.providerData[0]?.providerId || "password";
          if (providerId === "password") {
            openConfirmPasswordModal(
              async (password) => {
                showLoading();
                try {
                  if (userFirebase) {
                    const credential = EmailAuthProvider.credential(userFirebase.email, password);
                    await reauthenticateWithCredential(userFirebase, credential);
                  }
                  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                  const API_URL = isLocalhost ? 'http://localhost:5000/api' : '/api';
                  
                  const freshToken = userFirebase ? await userFirebase.getIdToken(true) : store.user?.token;
                  const res = await fetch(`${API_URL}/auth/2fa/toggle`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${freshToken}`
                    },
                    body: JSON.stringify({ enabled: false, password })
                  });

                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || 'Gagal menonaktifkan 2FA.');

                  hideLoading();
                  toggle2FA.checked = false;
                  if (store.user) {
                    store.user.is2FAEnabled = false;
                    store.user.twoFactorEmailEnabled = false;
                    store.save();
                  }
                  showToast(data.message || 'Autentikasi 2FA berhasil dinonaktifkan.', 'success');
                } catch (err) {
                  hideLoading();
                  toggle2FA.checked = true;
                  showToast(err.message || 'Gagal menonaktifkan 2FA.', 'error');
                }
              },
              () => {
                toggle2FA.checked = true;
              }
            );
          } else {
            showLoading();
            try {
              const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
              const API_URL = isLocalhost ? 'http://localhost:5000/api' : '/api';
              
              const freshToken = userFirebase ? await userFirebase.getIdToken(true) : store.user?.token;
              const res = await fetch(`${API_URL}/auth/2fa/toggle`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${freshToken}`
                },
                body: JSON.stringify({ enabled: false })
              });

              const data = await res.json();
              if (!res.ok) throw new Error(data.error || 'Gagal menonaktifkan 2FA.');

              hideLoading();
              toggle2FA.checked = false;
              if (store.user) {
                store.user.is2FAEnabled = false;
                store.user.twoFactorEmailEnabled = false;
                store.save();
              }
              showToast(data.message || 'Autentikasi 2FA berhasil dinonaktifkan.', 'success');
            } catch (err) {
              hideLoading();
              toggle2FA.checked = true;
              showToast(err.message || 'Gagal menonaktifkan 2FA.', 'error');
            }
          }
        }
      });
    });
  }
}
