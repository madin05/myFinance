import { store, formatRupiah } from '../store.js';
import { showLoading, hideLoading } from '../utils.js';
import { showToast, checkVerification } from '../components/notifications.js';
import { initCustomSelects } from '../ui/select.js';
import { initKebabs, cleanupKebabs } from '../ui/kebab.js';
import { animateCloseModal, bindModalEvents } from '../components/modal.js';

let currentViewDate = new Date();

export function renderAnggaran() {
  const container = document.getElementById('page-content');
  if (!container) return;
  
  const currentMonth = currentViewDate.getMonth();
  const currentYear = currentViewDate.getFullYear();
  const periodKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
  
  const spendingByCategory = {};
  store.transactions.forEach(tx => {
    const d = new Date(tx.tanggal);
    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear && (tx.type === 'expense' || !tx.type)) {
      const amount = Math.abs(Number(tx.harga !== undefined ? tx.harga : tx.amount || 0));
      const catKey = (tx.kategori || tx.category || 'Lainnya').trim().toLowerCase();
      spendingByCategory[catKey] = (spendingByCategory[catKey] || 0) + amount;
    }
  });

  // Filter budgets for the current selected period (or unassigned period)
  const periodBudgets = store.budgets.filter(b => !b.period || b.period === periodKey);

  // Map spending to budget list with case-insensitive category matching
  const budgetList = periodBudgets.map(b => {
    const catKey = (b.category || '').trim().toLowerCase();
    const spent = spendingByCategory[catKey] || 0;
    const percent = b.amount > 0 ? (spent / b.amount) * 100 : 0;
    return { ...b, spent, percent };
  });

  // Kategori yang mungkin belum ada budget-nya
  const categories = ["Makanan & Minuman", "Transportasi", "Belanja", "Tagihan", "Hiburan", "Lainnya"];
  
  container.innerHTML = `
    <div class="transactions-section">
      <div class="section-header anggaran-header">
        <div>
          <h3 style="margin:0;">Anggaran Bulanan</h3>
        </div>
        <div class="section-header-controls anggaran-controls" style="display: flex; align-items: center; gap: 12px;">
          <div class="month-selector" style="display: flex; align-items: center; gap: 8px;">
            <button class="icon-btn" id="prev-month" style="width: 32px; height: 32px; background: var(--bg-color); border-radius: 8px; cursor: pointer;">
              <i class="ph ph-caret-left"></i>
            </button>
            <span class="font-bold month-label" style="min-width: 130px; text-align: center; color: var(--primary); font-size: 0.95rem;">
              ${currentViewDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
            </span>
            <button class="icon-btn" id="next-month" style="width: 32px; height: 32px; background: var(--bg-color); border-radius: 8px; cursor: pointer;">
              <i class="ph ph-caret-right"></i>
            </button>
          </div>
          <button class="btn btn-primary" id="btn-set-budget">
            <i class="ph ph-plus"></i> Atur Anggaran
          </button>
        </div>
      </div>

      <div class="table-container">
        <table class="transactions-table">
          <thead>
            <tr>
              <th>Kategori</th>
              <th>Progress</th>
              <th>Terpakai</th>
              <th>Target</th>
              <th>Sisa</th>
              <th class="text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${budgetList.length > 0 ? budgetList.map(b => `
            <tr>
              <td>
                <div style="display:flex; flex-direction:column; gap:4px;">
                  <span class="font-bold" style="font-size:0.9rem;">${b.category}</span>
                  <span class="badge-soft ${b.percent > 90 ? 'badge-red' : b.percent > 70 ? 'badge-orange' : 'badge-green'}" style="font-size:0.65rem; width:fit-content;">
                    ${Math.round(b.percent)}% Terpakai
                  </span>
                </div>
              </td>
              <td style="min-width:160px;">
                <div style="height:8px; background:var(--bg-color); border-radius:99px; overflow:hidden;">
                  <div style="width:${Math.min(b.percent, 100)}%; height:100%; background:${b.percent > 90 ? 'var(--red)' : b.percent > 70 ? 'var(--orange)' : 'var(--green)'}; border-radius:99px; transition:width 0.5s ease;"></div>
                </div>
              </td>
              <td class="font-bold" style="font-size:0.85rem;">${formatRupiah(b.spent)}</td>
              <td class="text-muted" style="font-size:0.85rem;">${formatRupiah(b.amount)}</td>
              <td class="font-bold ${b.amount - b.spent < 0 ? 'text-red' : 'text-green'}" style="font-size:0.85rem;">${formatRupiah(b.amount - b.spent)}</td>
              <td class="text-right">
                <div class="kebab-wrapper" style="display:inline-block;">
                  <button class="kebab-trigger" data-id="${b.id}" title="Opsi lainnya">
                    <i class="ph-bold ph-dots-three"></i>
                  </button>
                  <div class="kebab-dropdown" data-kebab-for="${b.id}">
                    <button class="kebab-item kebab-edit" data-id="${b.id}">
                      <i class="ph ph-pencil-simple"></i> Edit
                    </button>
                    <div class="kebab-divider"></div>
                    <button class="kebab-item danger kebab-delete" data-id="${b.id}">
                      <i class="ph ph-trash"></i> Hapus
                    </button>
                  </div>
                </div>
              </td>
            </tr>
            `).join('') : `
              <tr><td colspan="6" style="text-align:center; padding: 3rem; color: var(--text-muted);">
                <i class="ph ph-chart-pie-slice" style="font-size: 2.5rem; display:block; margin-bottom:0.75rem; opacity:0.5;"></i>
                Belum ada anggaran nih
              </td></tr>
            `}
          </tbody>
        </table>
      </div>
    </div>

  `;

  const openBudgetModal = (existingCategory = '', existingAmount = '') => {
    checkVerification(() => {
      const modalContainer = document.getElementById('modal-container');
      const isEdit = existingCategory !== '';

      modalContainer.innerHTML = `
        <div class="modal-overlay" id="budget-modal-overlay">
          <div class="modal-content" style="max-width: 450px;">
            <div class="modal-header">
              <h3 style="margin: 0;">${isEdit ? 'Ubah Jatah Bulanan' : 'Setel Jatah Bulanan'}</h3>
            </div>
            <div class="modal-body">
              <form id="form-set-budget">
                <div class="form-group">
                  <label>Pilih Kategori</label>
                  <select class="form-control" id="budget-category" ${isEdit ? 'disabled' : ''} required>
                    ${categories.map(c => `<option value="${c}" ${c === existingCategory ? 'selected' : ''}>${c}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group" style="margin-top: 1.25rem;">
                  <label>Target Nominal (Rp)</label>
                  <input type="text" class="form-control" id="budget-amount" placeholder="Contoh: 1.000.000" value="${existingAmount ? new Intl.NumberFormat('id-ID').format(existingAmount) : ''}" required>
                </div>
                <button type="submit" class="btn btn-primary btn-full mt-lg">${isEdit ? 'Update Anggaran' : 'Simpan Anggaran'}</button>
              </form>
            </div>
          </div>
        </div>
      `;

      initCustomSelects(modalContainer);
      const closeBudgetModal = bindModalEvents(modalContainer, 'budget-modal-overlay', []);

      const amountInput = document.getElementById('budget-amount');
      amountInput.oninput = (e) => {
        let val = e.target.value.replace(/\D/g, '');
        if (val) e.target.value = new Intl.NumberFormat('id-ID').format(val);
      };
      
      document.getElementById('form-set-budget').onsubmit = async (e) => {
        e.preventDefault();
        const category = document.getElementById('budget-category').value;
        const amount = Number(amountInput.value.replace(/\./g, ''));

        showLoading();
        await store.updateBudget(category, amount, periodKey);
        hideLoading();
        closeBudgetModal();
        showToast(`Anggaran ${category} berhasil ${isEdit ? 'diperbarui' : 'ditambahkan'}!`, 'success');
        renderAnggaran();
      };
    });
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

  // --- Kebab Menu Logic (via shared utility) ---
  cleanupKebabs();
  initKebabs(
    container,
    // onEdit
    (id) => {
      const budget = budgetList.find(b => String(b.id) === id);
      if (budget) openBudgetModal(budget.category, budget.amount);
    },
    // onDelete
    (id) => {
      checkVerification(async () => {
        const budget = budgetList.find(b => String(b.id) === id);
        const category = budget?.category || '';
        const { showConfirm } = await import('../components/notifications.js');
        const confirmed = await showConfirm('Hapus Anggaran?', `Apakah Anda yakin ingin menghapus anggaran untuk kategori "${category}" ini?`);
        if (confirmed) {
          showLoading();
          const success = await store.deleteBudget(Number(id));
          hideLoading();
          if (success) {
            showToast(`Anggaran ${category} berhasil dihapus!`, 'info');
            renderAnggaran();
          } else {
            showToast('Gagal menghapus anggaran.', 'error');
          }
        }
      });
    }
  );
}
