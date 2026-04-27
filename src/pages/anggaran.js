import { store, formatRupiah } from '../store.js';

export function renderAnggaran() {
  const container = document.getElementById('page-content');
  
  // Dummy budget data for now, since it's not in store yet
  const budgets = [
    { name: 'Makanan & Minuman', used: 1500000, total: 2000000, color: 'bg-green' },
    { name: 'Transportasi', used: 920000, total: 1000000, color: 'bg-red' },
    { name: 'Belanja', used: 500000, total: 1500000, color: 'bg-blue' },
    { name: 'Hiburan', used: 300000, total: 500000, color: 'bg-purple' }
  ];

  const budgetHtml = budgets.map(b => {
    const percent = Math.min((b.used / b.total) * 100, 100);
    const remaining = b.total - b.used;
    
    return `
      <div class="stat-card budget-card-full">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem;">
          <div>
            <h3 style="margin-bottom: 0.25rem;">${b.name}</h3>
            <p class="text-muted text-sm">Target bulanan: ${formatRupiah(b.total)}</p>
          </div>
          <div class="badge ${percent > 90 ? 'badge-red' : 'badge-green'}">${percent.toFixed(0)}% Terpakai</div>
        </div>

        <div class="progress-bar-container" style="height: 12px; margin-bottom: 1rem;">
          <div class="progress-bar ${b.color}" style="width: ${percent}%;"></div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div class="text-sm">
            <span class="text-muted">Terpakai:</span>
            <span class="font-bold">${formatRupiah(b.used)}</span>
          </div>
          <div class="text-sm">
            <span class="text-muted">Sisa:</span>
            <span class="font-bold ${remaining < 0 ? 'text-red' : 'text-green'}">${formatRupiah(remaining)}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="section-header">
      <div>
        <h3>Anggaran Bulanan</h3>
        <p class="text-muted">Kelola jatah pengeluaran kamu biar gak boncos bre.</p>
      </div>
      <button class="btn btn-primary"><i class="ph ph-plus"></i> Atur Anggaran</button>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 1.5rem; margin-top: 1.5rem;">
      ${budgetHtml}
    </div>
  `;
}
