import { store, formatRupiah, formatDate } from '../store.js';
import { openAdjustBalanceModal } from '../components/modal.js';
import { navigateTo } from '../router.js';

let currentSavingIndex = 0;
let savingInterval = null;

export function renderDashboard() {
  const container = document.getElementById('page-content');
  if (!container) return;
  
  const stats = store.getStats();

  const getBadge = (diff, type) => {
    const isPositive = diff >= 0;
    const absDiff = Math.abs(diff).toFixed(1);
    const icon = isPositive ? 'ph-caret-up' : 'ph-caret-down';
    // Income up = green(up), Income down = red(down)
    // Expense up = red(down), Expense down = green(up)
    const badgeClass = type === 'income' ? (isPositive ? 'up' : 'down') : (isPositive ? 'down' : 'up');
    return `<div class="stat-badge ${badgeClass}"><i class="ph-bold ${icon}"></i> ${absDiff}%</div>`;
  };
  
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

  const getDayPhase = () => {
    const hrs = new Date().getHours();
    if (hrs >= 5 && hrs < 11) return 'morning';
    if (hrs >= 11 && hrs < 18) return 'afternoon';
    if (hrs >= 18 && hrs < 21) return 'evening';
    return 'night';
  };

  const getGreeting = () => {
    const phase = getDayPhase();
    if (phase === 'morning') return 'Selamat Pagi';
    if (phase === 'afternoon') {
      const hrs = new Date().getHours();
      return hrs < 15 ? 'Selamat Siang' : 'Selamat Sore';
    }
    return 'Selamat Malam';
  };

  const getFormattedTimeParts = () => {
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return {
      time: `${hours}:${minutes}`,
      ampm
    };
  };

  const getFormattedDayText = () => {
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    const text = new Date().toLocaleDateString('en-US', options);
    const day = new Date().getDate();
    let suffix = 'th';
    if (day === 1 || day === 21 || day === 31) suffix = 'st';
    else if (day === 2 || day === 22) suffix = 'nd';
    else if (day === 3 || day === 23) suffix = 'rd';
    return `${text}${suffix}`;
  };

  const getWeatherIcon = () => {
    const phase = getDayPhase();
    if (phase === 'night') {
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="weather-moon-svg">
          <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"></path>
          <path d="M10.794 3.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387a1.734 1.734 0 0 0-1.097 1.097l-.387 1.162a.217.217 0 0 1-.412 0l-.387-1.162A1.734 1.734 0 0 0 9.31 6.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387a1.734 1.734 0 0 0 1.097-1.097l.387-1.162zM13.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.156 1.156 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.156 1.156 0 0 0-.732-.732l-.774-.258a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732L13.863.1z"></path>
        </svg>
      `;
    }
    return `
      <span class="weather-sun sunshine"></span>
      <span class="weather-sun"></span>
    `;
  };

  const timeParts = getFormattedTimeParts();

  container.innerHTML = `
    <!-- Greeting Section -->
    <div class="dashboard-greeting ${getDayPhase()}">
      <div class="greeting-content">
        <h1 class="greeting-title">${getGreeting()}, <span class="text-primary font-bold">${store.user?.name || 'Tamu'}</span>! 👋</h1>
        <p class="greeting-subtitle text-muted">Selamat datang kembali. Pantau keuanganmu hari ini yuk!</p>
      </div>
      
      <!-- Unified Weather & Time Block -->
      <div class="greeting-widget-container">
        <!-- Premium Time & Day Block -->
        <div class="greeting-time-block">
          <p class="greeting-time-text"><span>${timeParts.time}</span><span class="greeting-time-sub-text">${timeParts.ampm}</span></p>
          <p class="greeting-day-text">${getFormattedDayText()}</p>
        </div>
        
        <!-- Animated Sun & Moon Object -->
        <div class="greeting-weather-object ${getDayPhase()}">
          <div class="weather-cloud front">
            <span class="weather-left-front"></span>
            <span class="weather-right-front"></span>
          </div>
          ${getWeatherIcon()}
          <div class="weather-cloud back">
            <span class="weather-left-back"></span>
            <span class="weather-right-back"></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Top Cards -->
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-header">
          <div class="icon-box bg-green-light text-green"><i class="ph-bold ph-trend-up"></i></div>
          ${getBadge(stats.incomeDiff, 'income')}
        </div>
        <div class="stat-body">
          <p class="stat-label">Pemasukan (4 Minggu)</p>
          <h2 class="stat-value">${formatRupiah(stats.income)}</h2>
        </div>
        <div class="stat-footer">
          <div class="stat-line"><div class="stat-line-fill bg-green" style="width: ${Math.min((stats.income / (stats.income + stats.expense || 1)) * 100, 100)}%"></div></div>
        </div>
        <i class="ph-fill ph-trend-up stat-watermark"></i>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <div class="icon-box bg-red-light text-red"><i class="ph-bold ph-trend-down"></i></div>
          ${getBadge(stats.expenseDiff, 'expense')}
        </div>
        <div class="stat-body">
          <p class="stat-label">Pengeluaran (4 Minggu)</p>
          <h2 class="stat-value">${formatRupiah(stats.expense)}</h2>
        </div>
        <div class="stat-footer">
          <div class="stat-line"><div class="stat-line-fill bg-red" style="width: ${Math.min((stats.expense / (stats.income + stats.expense || 1)) * 100, 100)}%"></div></div>
        </div>
        <i class="ph-fill ph-trend-down stat-watermark"></i>
      </div>

      <div class="stat-card">
        <div class="stat-header">
          <div class="icon-box bg-blue-light text-blue"><i class="ph-fill ph-bank"></i></div>
          <button id="btn-adjust-balance" title="Sesuaikan saldo riil" style="background:transparent;border:1px solid var(--border);border-radius:10px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-muted);transition:all 0.2s;" onmouseenter="this.style.color='var(--primary)';this.style.borderColor='var(--primary)'" onmouseleave="this.style.color='var(--text-muted)';this.style.borderColor='var(--border)'">
            <i class="ph ph-pencil-simple" style="font-size:1rem;"></i>
          </button>
        </div>
        <div class="stat-body">
          <p class="stat-label">Saldo Saat Ini</p>
          <h2 class="stat-value">${formatRupiah(stats.balance)}</h2>
        </div>
        <div class="stat-footer">
          <div class="stat-line"><div class="stat-line-fill bg-blue" style="width: 100%"></div></div>
        </div>
        <i class="ph-fill ph-bank stat-watermark"></i>
      </div>
    </div>

    <!-- Bottom Section -->
    <div class="bottom-grid">
      <div class="transactions-section">
        <div class="section-header">
          <h3>Transaksi Terakhir</h3>
          <a href="/transaksi" class="link">Lihat Semua</a>
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
              ${txHtml || `
                <tr>
                  <td colspan="5" style="text-align: center; padding: 3rem 1.5rem;">
                    <style>
                      [data-theme="light"] .tx-illustration-dark { display: none !important; }
                      [data-theme="dark"] .tx-illustration-light { display: none !important; }
                    </style>
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem;">
                      <img class="tx-illustration-light" src="/assets/transactions-empty-light.svg" alt="No Transactions" style="width: 130px; height: 130px;" />
                      <img class="tx-illustration-dark" src="/assets/transactions-empty-dark.svg" alt="No Transactions" style="width: 130px; height: 130px;" />
                      <p class="text-muted text-xs" style="margin: 0; font-size: 0.85rem;">Belum ada transaksi</p>
                    </div>
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>

      <div class="widgets-section">
        <div class="widget-card">
          <h3 class="mb-lg">Anggaran Bulan Ini</h3>
          <div id="budget-widget-content" style="min-height: 100px;">
            <!-- Content injected by JS -->
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

  // Init Saving & Budget Widgets
  renderBudgetWidget();
  updateSavingWidget();
  if (savingInterval) clearInterval(savingInterval);
  savingInterval = setInterval(updateSavingWidget, 4000);

  // Event Listeners
  document.getElementById('btn-manage-budget').addEventListener('click', () => {
    navigateTo('/anggaran');
  });

  document.getElementById('btn-go-to-wishlist').addEventListener('click', () => {
    navigateTo('/tabungan');
  });

  document.getElementById('btn-adjust-balance').addEventListener('click', () => {
    openAdjustBalanceModal(stats.balance, () => renderDashboard());
  });
}

function renderBudgetWidget() {
  const container = document.getElementById('budget-widget-content');
  if (!container) return;

  if (store.budgets.length === 0) {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1rem 0; opacity: 0.7;">
        <i class="ph ph-wallet" style="font-size: 2.5rem; margin-bottom: 0.5rem; color: var(--text-muted);"></i>
        <p class="text-sm text-muted text-center">Belum ada anggaran.</p>
      </div>
    `;
    return;
  }

  // Hitung pengeluaran bulan ini (seperti di anggaran.js)
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const spendingByCategory = {};
  store.transactions.forEach(tx => {
    const d = new Date(tx.tanggal);
    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear && tx.type === 'expense') {
      spendingByCategory[tx.kategori] = (spendingByCategory[tx.kategori] || 0) + Math.abs(tx.harga);
    }
  });

  // Tampilkan max 3 anggaran
  const topBudgets = store.budgets.slice(0, 3);
  
  let html = '';
  topBudgets.forEach((b, index) => {
    const spent = spendingByCategory[b.category] || 0;
    const percent = b.amount > 0 ? (spent / b.amount) * 100 : 0;
    const roundedPercent = Math.round(percent);
    
    // Tentukan warna progress bar
    let colorClass = 'bg-green';
    if (percent > 90) colorClass = 'bg-red';
    else if (percent > 70) colorClass = 'bg-orange';

    html += `
      <div class="budget-item ${index > 0 ? 'mt-md' : ''}">
        <div class="budget-header">
          <span class="budget-name">${b.category}</span>
          <span class="budget-percent" style="color: ${percent > 90 ? 'var(--red)' : percent > 70 ? 'var(--orange)' : 'var(--text-main)'}">${roundedPercent}%</span>
        </div>
        <div class="progress-bar-container bg-gray-light">
          <div class="progress-bar ${colorClass}" style="width: ${Math.min(percent, 100)}%;"></div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function updateSavingWidget() {
  const container = document.getElementById('saving-widget-content');
  if (!container) {
    if (savingInterval) clearInterval(savingInterval);
    return;
  }
  
  if (store.savings.length === 0) {
    container.innerHTML = `
      <p class="text-white-dim mb-lg">Belum ada wishlist. Mari buat target baru!</p>
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
