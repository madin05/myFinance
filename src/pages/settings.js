import { store } from '../store.js';
import { showLoading, hideLoading } from '../utils.js';
import { showToast } from '../components/notifications.js';
import { initCustomSelect } from '../components/customSelect.js';

export function renderSettings() {
  const container = document.getElementById('page-content');
  const user = store.user || {};

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
            <i class="ph-fill ph-gear" style="color: var(--primary);"></i>
            Preferensi Keuangan
          </h4>
          <div style="display: flex; flex-direction: column; gap: 1.25rem;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="text-xs text-muted mb-xs block" style="display: block; margin-bottom: 4px;">Tanggal Mulai Periode (Gajian)</label>
              <div style="display: flex; gap: 10px; align-items: center;">
                <input type="number" id="financial-start-day" class="form-control" min="1" max="31"
                  value="${user.financialStartDay || 1}" style="width: 80px; height: 38px;">
                <span class="text-xs text-muted">Tiap bulan</span>
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="text-xs text-muted mb-xs block" style="display: block; margin-bottom: 4px;">Mata Uang Default</label>
              <select id="user-currency" class="form-control" style="height: 38px; font-size: 0.85rem; padding: 0 10px;">
                <option value="IDR" ${user.currency === 'IDR' || !user.currency ? 'selected' : ''}>IDR - Rupiah</option>
                <option value="USD" ${user.currency === 'USD' ? 'selected' : ''}>USD - US Dollar</option>
                <option value="EUR" ${user.currency === 'EUR' ? 'selected' : ''}>EUR - Euro</option>
                <option value="SGD" ${user.currency === 'SGD' ? 'selected' : ''}>SGD - Singapore Dollar</option>
                <option value="MYR" ${user.currency === 'MYR' ? 'selected' : ''}>MYR - Malaysian Ringgit</option>
                <option value="JPY" ${user.currency === 'JPY' ? 'selected' : ''}>JPY - Japanese Yen</option>
              </select>
            </div>

            <div style="border-top: 1px dashed var(--border); margin-top: 0.5rem; padding-top: 1rem;">
              <p class="text-xs text-muted" style="margin-bottom: 0.75rem;">Laporan &amp; Anggaran akan mengikuti siklus dan mata uang ini.</p>
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
            <i class="ph-fill ph-monitor" style="color: var(--primary);"></i>
            Tampilan &amp; Kinerja
          </h4>
          <div style="display: flex; flex-direction: column; gap: 1.25rem;">
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

    <style>
      .switch { position: relative; display: inline-block; width: 44px; height: 24px; }
      .switch input { opacity: 0; width: 0; height: 0; }
      .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
        background-color: var(--border); transition: .4s; border-radius: 34px; }
      .slider:before { position: absolute; content: ""; height: 18px; width: 18px;
        left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
      input:checked + .slider { background-color: var(--primary); }
      input:checked + .slider:before { transform: translateX(20px); }
      @media (max-width: 768px) {
        .settings-grid { grid-template-columns: 1fr !important; }
      }
    </style>
  `;

  // Init custom select mata uang
  const currencySelect = document.getElementById('user-currency');
  if (currencySelect) initCustomSelect(currencySelect);

  // Simpan preferensi keuangan
  document.getElementById('btn-save-financial-start').onclick = async () => {
    const newDay = document.getElementById('financial-start-day').value;
    const newCurrency = document.getElementById('user-currency').value;
    showLoading();
    try {
      await store.updateProfile({
        financialStartDay: parseInt(newDay),
        currency: newCurrency
      });
      showToast('Preferensi berhasil disimpan!', 'success');
    } catch (err) {
      showToast('Gagal menyimpan preferensi.', 'error');
    } finally {
      hideLoading();
    }
  };

  // Toggle Mode Hemat Kinerja
  const togglePerformance = document.getElementById('toggle-performance-mode');
  if (togglePerformance) {
    togglePerformance.onchange = (e) => {
      if (e.target.checked) {
        document.body.classList.add('disable-animations');
        localStorage.setItem('disable-animations', 'true');
        showToast('Mode Hemat Kinerja diaktifkan.', 'info');
      } else {
        document.body.classList.remove('disable-animations');
        localStorage.setItem('disable-animations', 'false');
        showToast('Animasi & efek visual diaktifkan.', 'success');
      }
    };
  }

  // Toggle Tata Letak Ringkas
  const toggleCompact = document.getElementById('toggle-compact-mode');
  if (toggleCompact) {
    toggleCompact.onchange = (e) => {
      if (e.target.checked) {
        document.body.classList.add('layout-compact');
        localStorage.setItem('layout-density', 'compact');
        showToast('Tata letak ringkas diaktifkan.', 'info');
      } else {
        document.body.classList.remove('layout-compact');
        localStorage.setItem('layout-density', 'cozy');
        showToast('Tata letak nyaman diaktifkan.', 'success');
      }
    };
  }
}
