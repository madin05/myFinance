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
    <div class="transactions-section">
      <div class="section-header" style="flex-wrap: wrap; gap: 1rem;">
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
        <button class="btn btn-primary" id="btn-set-budget">
          <i class="ph ph-plus"></i> Atur Anggaran
        </button>
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
                  <div class="kebab-dropdown" data-kebab-for="budget-${b.id}">
                    <button class="kebab-item kebab-edit-budget" data-category="${b.category}" data-amount="${b.amount}">
                      <i class="ph ph-pencil-simple"></i> Edit
                    </button>
                    <div class="kebab-divider"></div>
                    <button class="kebab-item danger kebab-delete-budget" data-id="${b.id}" data-category="${b.category}">
                      <i class="ph ph-trash"></i> Hapus
                    </button>
                  </div>
                </div>
              </td>
            </tr>
            `).join('') : `
              <tr><td colspan="6" style="text-align:center; padding: 3rem; color: var(--text-muted);">
                <i class="ph ph-chart-pie-slice" style="font-size: 2.5rem; display:block; margin-bottom:0.75rem; opacity:0.5;"></i>
                Belum ada anggaran. Klik "Atur Anggaran" untuk mulai.
              </td></tr>
            `}
          </tbody>
        </table>
      </div>
    </div>

  `;

  const openBudgetModal = (existingCategory = '', existingAmount = '') => {
    const modalContainer = document.getElementById('modal-container');
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
    
    document.getElementById('budget-modal-overlay').onclick = (e) => {
      if (e.target.id === 'budget-modal-overlay') {
        modalContainer.innerHTML = '';
      }
    };
    
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

  // --- Kebab Menu Logic for Budget Cards ---
  const closeAllBudgetKebabs = () => {
    document.querySelectorAll('.kebab-dropdown.open').forEach(d => d.classList.remove('open'));
    document.querySelectorAll('.kebab-trigger.active').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.budget-row').forEach(row => row.style.zIndex = '');
  };

  document.querySelectorAll('.kebab-trigger').forEach(trigger => {
    trigger.onclick = (e) => {
      e.stopPropagation();
      const dropdown = trigger.nextElementSibling;
      const row = trigger.closest('tr');

      // Close others
      document.querySelectorAll('.kebab-dropdown.open').forEach(d => {
        if (d !== dropdown) {
          d.classList.remove('open');
          const otherRow = d.closest('tr');
          if (otherRow) otherRow.style.zIndex = '';
        }
      });
      document.querySelectorAll('.kebab-trigger.active').forEach(t => {
        if (t !== trigger) t.classList.remove('active');
      });

      const isOpen = dropdown.classList.toggle('open');
      trigger.classList.toggle('active');

      // Lift row above others so dropdown isn't clipped
      if (row) row.style.zIndex = isOpen ? '10' : '';
    };
  });

  document.addEventListener('click', closeAllBudgetKebabs);

  document.querySelectorAll('.kebab-edit-budget').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      closeAllBudgetKebabs();
      const { category, amount } = btn.dataset;
      openBudgetModal(category, amount);
    };
  });

  document.querySelectorAll('.kebab-delete-budget').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      closeAllBudgetKebabs();
      const { id, category } = btn.dataset;
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
    };
  });
}
