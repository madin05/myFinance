/**
 * @module adjustBalanceModal
 * Balance display adjustment modal — modifies visual offset only, no transaction created.
 */
import { store } from '../../store.js';
import { showLoading, hideLoading } from '../../utils.js';
import { showToast, checkVerification } from '../notifications.js';
import { getContainer, bindModalEvents, parseIDRInput, formatIDRInput } from './modalCore.js';

export function openAdjustBalanceModal(currentBalance, onSuccess) {
  let allowed = false;
  checkVerification(() => { allowed = true; });
  if (!allowed) return;

  const container = getContainer();
  if (!container) return;

  const existingOffset = Number(store.user?.balanceOffset || 0);
  const displayedBalance = currentBalance;
  const formattedBalance = new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 2
  }).format(displayedBalance);

  container.innerHTML = `
    <div class="modal-overlay" id="adjust-balance-overlay">
      <div class="modal-content" style="max-width: 420px;">
        <div class="modal-header">
          <h3 style="display:flex;align-items:center;gap:10px;">
            <i class="ph-fill ph-scales" style="color:var(--primary);"></i>
            Sesuaikan Tampilan Saldo
          </h3>
        </div>

        <div style="background:var(--bg-color);border-radius:14px;padding:1rem 1.25rem;margin-bottom:1.5rem;">
          <p style="font-size:0.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.35rem;">Saldo Tampil Sekarang</p>
          <p style="font-size:1.4rem;font-weight:800;color:var(--text-main);">${formattedBalance}</p>
          <p style="font-size:0.75rem;color:var(--text-muted);margin-top:0.25rem;">
            Ini hanya mengubah <strong>tampilan saldo</strong>. Tidak ada transaksi yang dibuat.
          </p>
        </div>

        <form id="form-adjust-balance">
          <div class="form-group">
            <label style="font-weight:700;">Saldo Riilmu Sekarang (Rp)</label>
            <div style="position: relative; width: 100%;">
              <input type="text" class="form-control" id="input-real-balance" placeholder="Contoh: 598.334,82" inputmode="decimal" autocomplete="off" required style="padding-right: 40px;">
              <button type="button" id="btn-clear-balance" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-muted); cursor: pointer; display: none; align-items: center; justify-content: center; font-size: 1.25rem; padding: 0;">
                <i class="ph ph-x-circle"></i>
              </button>
            </div>
          </div>

          <div id="adjust-preview" style="display:none;border-radius:14px;padding:1rem 1.25rem;margin-bottom:1.25rem;"></div>

          <div style="display:flex;gap:1rem;">
            <button type="button" class="btn btn-outline" style="flex:1;justify-content:center;" id="btn-cancel-adjust">Batal</button>
            <button type="submit" class="btn btn-primary" style="flex:1;justify-content:center;" id="btn-submit-adjust" disabled>
              <i class="ph ph-check-circle"></i> Terapkan
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Ghost fix: removed non-existent 'btn-close-adjust' from closeBtnIds
  const closeModal = bindModalEvents(container, 'adjust-balance-overlay', ['btn-cancel-adjust']);

  const input = document.getElementById('input-real-balance');
  const preview = document.getElementById('adjust-preview');
  const submitBtn = document.getElementById('btn-submit-adjust');
  const clearBtn = document.getElementById('btn-clear-balance');

  if (clearBtn) {
    clearBtn.onclick = () => {
      input.value = '';
      clearBtn.style.display = 'none';
      preview.style.display = 'none';
      submitBtn.disabled = true;
      input.focus();
    };
  }

  input.addEventListener('input', (e) => {
    const rawValue = e.target.value;
    if (clearBtn) clearBtn.style.display = rawValue ? 'flex' : 'none';
    if (!rawValue.endsWith(',')) e.target.value = formatIDRInput(rawValue);

    const realBalance = parseIDRInput(e.target.value);
    const diff = realBalance - displayedBalance;

    if (e.target.value && diff !== 0) {
      const isDeficit = diff < 0;
      const formattedDiff = new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 2
      }).format(Math.abs(diff));

      preview.style.display = 'block';
      preview.style.background = isDeficit ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)';
      preview.style.border = isDeficit ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(16,185,129,0.2)';
      preview.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;">
          <i class="ph-fill ${isDeficit ? 'ph-arrow-circle-down' : 'ph-arrow-circle-up'}" style="font-size:1.4rem;color:${isDeficit ? 'var(--red)' : 'var(--green)'}"></i>
          <div>
            <p style="font-size:0.78rem;font-weight:700;color:${isDeficit ? 'var(--red)' : 'var(--green)'}">
              Saldo akan disesuaikan ${isDeficit ? 'turun' : 'naik'} sebesar
            </p>
            <p style="font-size:1.1rem;font-weight:800;color:var(--text-main);">${formattedDiff}</p>
            <p style="font-size:0.72rem;color:var(--text-muted);">Hanya mengubah tampilan — tidak ada transaksi yang dibuat.</p>
          </div>
        </div>
      `;
      submitBtn.disabled = false;
    } else {
      preview.style.display = 'none';
      submitBtn.disabled = true;
    }
  });

  document.getElementById('form-adjust-balance').addEventListener('submit', async (e) => {
    e.preventDefault();
    const realBalance = parseIDRInput(input.value);
    const rawBalance = currentBalance - existingOffset;
    const newOffset = realBalance - rawBalance;

    closeModal();
    showLoading();
    try {
      store.user.balanceOffset = newOffset;
      store.save();
      await store.updateProfile({ balanceOffset: newOffset });
      showToast('Saldo berhasil disesuaikan!', 'success');
    } finally {
      hideLoading();
      if (onSuccess) onSuccess();
    }
  });

  setTimeout(() => { input.focus(); }, 100);
}
