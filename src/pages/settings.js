import { store } from '../store.js';
import { showLoading, hideLoading } from '../utils.js';
import { showToast, checkVerification } from '../components/notifications.js';
import { initCustomSelect } from '../components/customSelect.js';

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
            <!-- Mode Tampilan / Tema -->
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; border-bottom: 1px dashed var(--border); padding-bottom: 1rem;">
              <div>
                <p class="font-bold text-sm" style="margin: 0;">Tema Aplikasi</p>
                <p class="text-muted text-xs" style="margin: 0;">Pilih mode tampilan terang, gelap, atau ikuti perangkat.</p>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <button type="button" class="btn btn-outline ${localStorage.getItem('theme') === 'light' || (!localStorage.getItem('theme') && document.documentElement.getAttribute('data-theme') === 'light') ? 'active' : ''}" id="btn-theme-light" style="padding: 0.4rem 0.75rem; font-size: 0.78rem; border-radius: 8px; gap: 4px;">
                  <i class="ph ph-sun"></i> Terang
                </button>
                <button type="button" class="btn btn-outline ${localStorage.getItem('theme') === 'dark' ? 'active' : ''}" id="btn-theme-dark" style="padding: 0.4rem 0.75rem; font-size: 0.78rem; border-radius: 8px; gap: 4px;">
                  <i class="ph ph-moon"></i> Gelap
                </button>
                <button type="button" class="btn btn-outline ${localStorage.getItem('theme') === 'system' ? 'active' : ''}" id="btn-theme-sys" style="padding: 0.4rem 0.75rem; font-size: 0.78rem; border-radius: 8px; gap: 4px;">
                  <i class="ph ph-desktop-tower"></i> Otomatis
                </button>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <p class="font-bold text-sm" style="margin: 0;">Mode Hemat Kinerja</p>
                <p class="text-muted text-xs">Matikan semua animasi &amp; efek blur kaca.</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="toggle-performance-mode"
                  ${localStorage.getItem('disable-animations') === 'true' ? 'checked' : ''}>
                <span class="slider round"></span>
              </label>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed var(--border); padding-top: 1rem;">
              <div>
                <p class="font-bold text-sm" style="margin: 0;">Tata Letak Ringkas</p>
                <p class="text-muted text-xs">Kurangi tinggi baris tabel &amp; padding kartu.</p>
              </div>
              <label class="switch">
                <input type="checkbox" id="toggle-compact-mode"
                  ${localStorage.getItem('layout-density') === 'compact' ? 'checked' : ''}>
                <span class="slider round"></span>
              </label>
            </div>
          </div>
        </div>

      </div><!-- end grid -->
    </div><!-- end outer -->
  `;

  // Init custom select mata uang
  const currencySelect = document.getElementById('user-currency');
  if (currencySelect) initCustomSelect(currencySelect);

  // Theme selection buttons
  const btnLight = document.getElementById('btn-theme-light');
  const btnDark = document.getElementById('btn-theme-dark');
  const btnSys = document.getElementById('btn-theme-sys');

  const updateThemeBtnState = (activeTheme) => {
    btnLight?.classList.toggle('active', activeTheme === 'light');
    btnDark?.classList.toggle('active', activeTheme === 'dark');
    btnSys?.classList.toggle('active', activeTheme === 'system');
  };

  if (btnLight) {
    btnLight.addEventListener('click', () => {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
      updateThemeBtnState('light');
      showToast('Mode Terang diaktifkan', 'info');
    });
  }

  if (btnDark) {
    btnDark.addEventListener('click', () => {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      updateThemeBtnState('dark');
      showToast('Mode Gelap diaktifkan', 'info');
    });
  }

  if (btnSys) {
    btnSys.addEventListener('click', () => {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
      localStorage.setItem('theme', 'system');
      updateThemeBtnState('system');
      showToast('Mode Otomatis diaktifkan', 'info');
    });
  }

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

  // Toggle Tata Letak Ringkas
  const toggleCompact = document.getElementById('toggle-compact-mode');
  if (toggleCompact) {
    toggleCompact.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      document.body.classList.toggle('layout-compact', isChecked);
      localStorage.setItem('layout-density', isChecked ? 'compact' : 'cozy');
      showToast(isChecked ? 'Tata letak ringkas diaktifkan.' : 'Tata letak nyaman diaktifkan.', isChecked ? 'info' : 'success');
    });
  }
}
