import { store, formatRupiah } from '../store.js';
import { showLoading, hideLoading } from '../utils.js';
import { showToast } from '../components/notifications.js';
import { initCustomSelects } from '../ui/select.js';

let currentViewDate = new Date();

export function renderAnggaran() {
  const container = document.getElementById('page-content');
  
  const currentMonth = currentViewDate.getMonth();
  const currentYear = currentViewDate.getFullYear();
  const periodKey = currentViewDate.toISOString().slice(0, 7); // Format "YYYY-MM"
  
  const spendingByCategory = {};
  store.transactions.forEach(tx => {
    const d = new Date(tx.tanggal);
    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear && tx.type === 'expense') {
      spendingByCategory[tx.kategori] = (spendingByCategory[tx.kategori] || 0) + Math.abs(tx.harga);
    }
  });

  // Gabungkan dengan data budget dari store
  const budgetList = store.budgets.map(b => {
    const spent = spendingByCategory[b.category] || 0;
    const percent = b.amount > 0 ? (spent / b.amount) * 100 : 0;
    return { ...b, spent, percent };
  });

  // Kategori yang mungkin belum ada budget-nya
  const categories = ["Makanan & Minuman", "Transportasi", "Belanja", "Tagihan", "Hiburan", "Lainnya"];
  
  container.innerHTML = `
    <div class="budget-section">
      <div class="section-header" style="flex-wrap: wrap; gap: 1rem;">
        <div style="display: flex; align-items: center; gap: 1.5rem;">
          <div>
            <h3>Anggaran Bulanan</h3>
            <div style="display: flex; align-items: center; gap: 12px; margin-top: 4px;">
              <button class="icon-btn" id="prev-month" style="width: 32px; height: 32px; background: var(--bg-color); border-radius: 8px;">
                <i class="ph ph-caret-left"></i>
              </button>
              <span class="font-bold" style="min-width: 120px; text-align: center; color: var(--primary);">
                ${currentViewDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
              </span>
              <button class="icon-btn" id="next-month" style="width: 32px; height: 32px; background: var(--bg-color); border-radius: 8px;">
                <i class="ph ph-caret-right"></i>
              </button>
            </div>
          </div>
        </div>
        <button class="btn btn-primary" id="btn-set-budget">
          <i class="ph ph-plus-circle"></i> Atur Anggaran
        </button>
      </div>

      <div class="budget-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.5rem; margin-top: 1.5rem;">
        ${budgetList.length > 0 ? budgetList.map(b => `
          <div class="stat-card budget-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem;">
              <div>
                <h4 style="font-size: 1.1rem; margin-bottom: 4px;">${b.category}</h4>
                <p class="text-muted text-xs">Target: ${formatRupiah(b.amount)}</p>
              </div>
              <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                <div class="badge-soft ${b.percent > 90 ? 'badge-red' : b.percent > 70 ? 'badge-orange' : 'badge-green'}" style="font-size: 0.7rem;">
                  ${Math.round(b.percent)}% Terpakai
                </div>
                <div style="display: flex; gap: 4px;">
                  <button class="icon-btn btn-edit-budget" data-category="${b.category}" data-amount="${b.amount}" style="width: 28px; height: 28px; font-size: 0.85rem;" title="Edit">
                    <i class="ph ph-pencil-simple"></i>
                  </button>
                  <button class="icon-btn btn-delete-budget" data-id="${b.id}" data-category="${b.category}" style="width: 28px; height: 28px; font-size: 0.85rem; color: var(--red);" title="Hapus">
                    <i class="ph ph-trash"></i>
                  </button>
                </div>
              </div>
            </div>

            <div class="progress-container" style="height: 10px; background: var(--bg-color); border-radius: 10px; overflow: hidden; margin-bottom: 1rem;">
              <div class="progress-bar" style="width: ${Math.min(b.percent, 100)}%; height: 100%; background: ${b.percent > 90 ? 'var(--red)' : b.percent > 70 ? 'var(--orange)' : 'var(--green)'}; transition: width 0.5s ease;"></div>
            </div>

            <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
              <div>
                <span class="text-muted">Terpakai:</span>
                <span class="font-bold" style="margin-left: 4px;">${formatRupiah(b.spent)}</span>
              </div>
              <div>
                <span class="text-muted">Sisa:</span>
                <span class="font-bold ${b.amount - b.spent < 0 ? 'text-red' : 'text-green'}" style="margin-left: 4px;">
                  ${formatRupiah(b.amount - b.spent)}
                </span>
              </div>
            </div>
          </div>
        `).join('') : `
          <div style="grid-column: 1/-1; text-align: center; padding: 4rem; background: var(--card-bg); border-radius: 24px; border: 2px dashed var(--border);">
            <i class="ph ph-chart-pie-slice" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem; display: block;"></i>
            <h4 class="text-muted">Belum ada anggaran yang diatur nih.</h4>
            <p class="text-muted text-sm mb-lg">Klik tombol "Atur Anggaran" di atas buat mulai ngerem pengeluaran.</p>
          </div>
        `}
      </div>
    </div>

    <!-- Modal Set Budget -->
    <div id="budget-modal-container"></div>
  `;

  const openBudgetModal = (existingCategory = '', existingAmount = '') => {
    const modalContainer = document.getElementById('budget-modal-container');
    const isEdit = existingCategory !== '';

    modalContainer.innerHTML = `
      <div class="modal-overlay" id="budget-modal-overlay">
        <div class="modal-content" style="max-width: 450px;">
          <div class="modal-header">
            <h3>${isEdit ? 'Ubah Jatah Bulanan' : 'Setel Jatah Bulanan'}</h3>
            <button class="modal-close" id="close-budget-modal"><i class="ph ph-x"></i></button>
          </div>
          <form id="form-set-budget" style="padding-top: 1rem;">
            <div class="form-group">
              <label>Pilih Kategori</label>
              <select class="form-control" id="budget-category" ${isEdit ? 'disabled' : ''} required>
                ${categories.map(c => `<option value="${c}" ${c === existingCategory ? 'selected' : ''}>${c}</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="margin-top: 1.5rem;">
              <label>Target Nominal (Rp)</label>
              <input type="text" class="form-control" id="budget-amount" placeholder="Contoh: 1.000.000" value="${existingAmount ? new Intl.NumberFormat('id-ID').format(existingAmount) : ''}" required>
            </div>
            <button type="submit" class="btn btn-primary btn-full mt-lg">${isEdit ? 'Update Anggaran' : 'Simpan Anggaran'}</button>
          </form>
        </div>
      </div>
    `;

    initCustomSelects(modalContainer);

    const amountInput = document.getElementById('budget-amount');
    amountInput.oninput = (e) => {
      let val = e.target.value.replace(/\D/g, '');
      if (val) e.target.value = new Intl.NumberFormat('id-ID').format(val);
    };

    document.getElementById('close-budget-modal').onclick = () => modalContainer.innerHTML = '';
    
    document.getElementById('form-set-budget').onsubmit = async (e) => {
      e.preventDefault();
      const category = document.getElementById('budget-category').value;
      const amount = Number(amountInput.value.replace(/\./g, ''));

      showLoading();
      await store.updateBudget(category, amount, periodKey);
      hideLoading();
      modalContainer.innerHTML = '';
      showToast(`Anggaran ${category} berhasil ${isEdit ? 'diperbarui' : 'disetel'}!`, 'success');
      renderAnggaran();
    };
  };

  // Event Listeners
  document.getElementById('btn-set-budget').onclick = () => openBudgetModal();

  document.getElementById('prev-month').onclick = async () => {
    currentViewDate.setMonth(currentViewDate.getMonth() - 1);
    showLoading();
    await store.fetchBudgets(currentViewDate.toISOString().slice(0, 7));
    hideLoading();
    renderAnggaran();
  };

  document.getElementById('next-month').onclick = async () => {
    currentViewDate.setMonth(currentViewDate.getMonth() + 1);
    showLoading();
    await store.fetchBudgets(currentViewDate.toISOString().slice(0, 7));
    hideLoading();
    renderAnggaran();
  };

  document.querySelectorAll('.btn-edit-budget').forEach(btn => {
    btn.onclick = () => {
      const { category, amount } = btn.dataset;
      openBudgetModal(category, amount);
    };
  });

  document.querySelectorAll('.btn-delete-budget').forEach(btn => {
    btn.onclick = async () => {
      const { id, category } = btn.dataset;
      const { showConfirm } = await import('../components/notifications.js');
      const confirmed = await showConfirm('Hapus Anggaran?', `Yakin mau hapus anggaran untuk kategori "${category}" ini bre?`);
      
      if (confirmed) {
        showLoading();
        const success = await store.deleteBudget(Number(id));
        hideLoading();
        if (success) {
          showToast(`Anggaran ${category} berhasil dihapus!`, 'info');
          renderAnggaran();
        } else {
          showToast('Gagal hapus anggaran bre!', 'error');
        }
      }
    };
  });
}
