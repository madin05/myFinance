import { store, formatRupiah, formatDate } from '../store.js';

let currentSavingIndex = 0;
let savingInterval = null;

export function renderDashboard() {
  const container = document.getElementById('page-content');
  if (!container) return;
  
  const stats = store.getStats();
  
  // Sortir terbaru: Tanggal desc, lalu ID desc
  const sortedTxs = [...store.transactions].sort((a, b) => {
    const dateDiff = new Date(b.tanggal) - new Date(a.tanggal);
    if (dateDiff !== 0) return dateDiff;
    return (b.id || 0) - (a.id || 0);
  });
  
  const topTransactions = sortedTxs.slice(0, 4);
  const txHtml = topTransactions.map(tx => {
    const isIncome = tx.type === 'income';
    const colorClass = isIncome ? 'text-green' : 'text-red';
    const sign = isIncome ? '+ ' : '- ';
    
    let badgeClass = 'badge-blue';
    const lowerKategori = tx.kategori.toLowerCase();
    if(lowerKategori.includes('gaji')) badgeClass = 'badge-green';
    else if(lowerKategori.includes('makan')) badgeClass = 'badge-orange';
    else if(lowerKategori.includes('belanja')) badgeClass = 'badge-purple';

    return `
      <tr>
        <td>${formatDate(tx.tanggal)}</td>
        <td><span class="badge-soft ${badgeClass}">${tx.kategori}</span></td>
        <td>${tx.metode}</td>
        <td>${tx.keterangan}</td>
        <td class="text-right ${colorClass} font-bold">${sign}${formatRupiah(Math.abs(tx.harga))}</td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <!-- Top Cards -->
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-header">
          <div class="icon-box bg-green-light text-green"><i class="ph-bold ph-trend-up"></i></div>
          <div class="stat-badge up"><i class="ph-bold ph-caret-up"></i> 12.5%</div>
        </div>
        <div class="stat-body">
          <p class="stat-label">Total Pemasukan</p>
          <h2 class="stat-value">${formatRupiah(stats.income)}</h2>
        </div>
        <div class="stat-footer">
          <div class="stat-line"><div class="stat-line-fill bg-green" style="width: 70%"></div></div>
        </div>
        <i class="ph-fill ph-trend-up stat-watermark"></i>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <div class="icon-box bg-red-light text-red"><i class="ph-bold ph-trend-down"></i></div>
          <div class="stat-badge down"><i class="ph-bold ph-caret-down"></i> 4.2%</div>
        </div>
        <div class="stat-body">
          <p class="stat-label">Total Pengeluaran</p>
          <h2 class="stat-value">${formatRupiah(stats.expense)}</h2>
        </div>
        <div class="stat-footer">
          <div class="stat-line"><div class="stat-line-fill bg-red" style="width: 45%"></div></div>
        </div>
        <i class="ph-fill ph-trend-down stat-watermark"></i>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <div class="icon-box bg-blue-light text-blue"><i class="ph-fill ph-bank"></i></div>
        </div>
        <div class="stat-body">
          <p class="stat-label">Saldo Saat Ini</p>
          <h2 class="stat-value">${formatRupiah(stats.balance)}</h2>
        </div>
        <div class="stat-footer">
          <div class="stat-line"><div class="stat-line-fill bg-blue" style="width: 85%"></div></div>
        </div>
        <i class="ph-fill ph-bank stat-watermark"></i>
      </div>
    </div>

    <!-- Bottom Section -->
    <div class="bottom-grid">
      <div class="transactions-section">
        <div class="section-header">
          <h3>Transaksi Terakhir</h3>
          <a href="#transaksi" class="link">Lihat Semua</a>
        </div>
        <div class="table-container">
          <table class="transactions-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Kategori</th>
                <th>Metode</th>
                <th>Keterangan</th>
                <th class="text-right">Harga</th>
              </tr>
            </thead>
            <tbody>
              ${txHtml || '<tr><td colspan="5" class="text-center text-muted">Belum ada transaksi</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>

      <div class="widgets-section">
        <div class="widget-card">
          <h3 class="mb-lg">Anggaran Bulan Ini</h3>
          <div class="budget-item">
            <div class="budget-header"><span class="budget-name">Makanan</span><span class="budget-percent">75%</span></div>
            <div class="progress-bar-container bg-gray-light"><div class="progress-bar bg-green" style="width: 75%;"></div></div>
          </div>
          <div class="budget-item mt-md">
            <div class="budget-header"><span class="budget-name">Transportasi</span><span class="budget-percent">92%</span></div>
            <div class="progress-bar-container bg-gray-light"><div class="progress-bar bg-red" style="width: 92%;"></div></div>
          </div>
          <button class="btn btn-outline btn-full mt-lg" id="btn-manage-budget">Kelola Anggaran</button>
        </div>

        <div class="widget-card widget-primary">
          <button class="btn-icon-absolute" id="btn-go-to-wishlist" data-tooltip="Tambah Wishlist"><i class="ph ph-plus"></i></button>
          <h3 class="text-white mb-xs">Target Wishlist</h3>
          <div id="saving-widget-content" style="transition: all 0.5s ease; min-height: 100px;">
            <!-- Content injected by cycling function -->
          </div>
        </div>
      </div>
    </div>
  `;

  // Init Saving Widget
  updateSavingWidget();
  if (savingInterval) clearInterval(savingInterval);
  savingInterval = setInterval(updateSavingWidget, 4000);

  // Event Listeners
  document.getElementById('btn-manage-budget').addEventListener('click', () => {
    window.location.hash = '#anggaran';
  });

  document.getElementById('btn-go-to-wishlist').addEventListener('click', () => {
    window.location.hash = '#tabungan';
  });
}

function updateSavingWidget() {
  const container = document.getElementById('saving-widget-content');
  if (!container) {
    if (savingInterval) clearInterval(savingInterval);
    return;
  }
  
  if (store.savings.length === 0) {
    container.innerHTML = `
      <p class="text-white-dim mb-lg">Belum ada wishlist bre. Yuk buat target baru!</p>
      <div class="progress-bar-container bg-white-dim mb-lg" style="height: 8px; opacity: 0.3;">
        <div class="progress-bar bg-white" style="width: 0%;"></div>
      </div>
    `;
    return;
  }
  
  const saving = store.savings[currentSavingIndex];
  const percent = Math.min((saving.current / saving.target) * 100, 100);
  
  container.style.opacity = '0';
  container.style.transform = 'translateY(10px)';
  
  setTimeout(() => {
    container.innerHTML = `
      <p class="text-white-dim mb-lg">${saving.name}</p>
      <h2 class="text-white mb-md" style="display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px; font-size: 1.2rem; line-height: 1.2;">
        ${formatRupiah(saving.current)} 
        <span class="text-xs text-white-dim font-normal" style="opacity: 0.7; white-space: nowrap;">/ ${formatRupiah(saving.target)}</span>
      </h2>
      <div class="progress-bar-container bg-white-dim mb-lg" style="height: 8px; margin-top: 0.5rem;">
        <div class="progress-bar bg-white" style="width: ${percent}%;"></div>
      </div>
    `;
    container.style.opacity = '1';
    container.style.transform = 'translateY(0)';
  }, 300);
  
  currentSavingIndex = (currentSavingIndex + 1) % store.savings.length;
}
