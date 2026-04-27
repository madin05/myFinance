import { store, formatRupiah } from '../store.js';

export function renderLaporan() {
  const container = document.getElementById('page-content');
  const stats = store.getStats();
  
  // Calculate category breakdown
  const categoryTotals = {};
  store.transactions.filter(tx => tx.type === 'expense').forEach(tx => {
    categoryTotals[tx.kategori] = (categoryTotals[tx.kategori] || 0) + Math.abs(tx.harga);
  });

  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const maxVal = sortedCategories[0]?.[1] || 1;

  const breakdownHtml = sortedCategories.map(([name, total]) => {
    const percent = (total / maxVal) * 100;
    return `
      <div style="margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
          <span class="font-bold">${name}</span>
          <span>${formatRupiah(total)}</span>
        </div>
        <div class="progress-bar-container" style="height: 8px;">
          <div class="progress-bar bg-primary" style="width: ${percent}%;"></div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="section-header">
      <div>
        <h3>Laporan Keuangan</h3>
        <p class="text-muted">Analisis pengeluaran kamu biar makin pinter ngatur duit bre.</p>
      </div>
      <div style="display: flex; gap: 1rem;">
        <button class="btn btn-outline"><i class="ph ph-export"></i> Export PDF</button>
        <button class="btn btn-primary"><i class="ph ph-calendar"></i> April 2024</button>
      </div>
    </div>

    <div class="bottom-grid mt-lg">
      <!-- Left: Summary Stats -->
      <div class="transactions-section">
        <h4 class="mb-lg">Ringkasan Pengeluaran</h4>
        <div style="display: flex; flex-direction: column; gap: 2rem; padding: 1rem 0;">
          <div style="display: flex; align-items: center; gap: 1.5rem;">
            <div class="icon-box bg-red-light text-red" style="width: 56px; height: 56px; font-size: 1.5rem;">
              <i class="ph ph-arrow-down-left"></i>
            </div>
            <div>
              <p class="text-muted text-sm">Total Pengeluaran</p>
              <h2 class="text-red">${formatRupiah(stats.expense)}</h2>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 1.5rem;">
            <div class="icon-box bg-green-light text-green" style="width: 56px; height: 56px; font-size: 1.5rem;">
              <i class="ph ph-arrow-up-right"></i>
            </div>
            <div>
              <p class="text-muted text-sm">Rata-rata Harian</p>
              <h2>${formatRupiah(stats.expense / 30)}</h2>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 1.5rem;">
            <div class="icon-box bg-blue-light text-blue" style="width: 56px; height: 56px; font-size: 1.5rem;">
              <i class="ph ph-piggy-bank"></i>
            </div>
            <div>
              <p class="text-muted text-sm">Potensi Tabungan</p>
              <h2 class="text-blue">${formatRupiah(stats.balance * 0.4)}</h2>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Category Breakdown -->
      <div class="transactions-section">
        <h4 class="mb-lg">Berdasarkan Kategori</h4>
        <div style="padding: 0.5rem 0;">
          ${breakdownHtml || '<p class="text-muted">Belum ada data pengeluaran</p>'}
        </div>
      </div>
    </div>
  `;
}
