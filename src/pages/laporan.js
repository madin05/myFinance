import { store, formatRupiah } from '../store.js';
import { showLoading, hideLoading, getFinancialRange } from '../utils.js';
import { exportService } from '../services/exportService.js';
import { showToast } from '../components/notifications.js';

let currentReportDate = new Date();
let filterPreset = 'bulan'; // 'minggu', 'bulan', '3bulan', 'tahun'
let selectedFormat = 'pdf'; // 'pdf', 'excel'

export function renderLaporan() {
  const container = document.getElementById('page-content');
  const startDay = store.user?.financialStartDay || 1;
  
  let startDate, endDate;

  if (filterPreset === 'minggu') {
    const now = new Date();
    startDate = new Date(now.setDate(now.getDate() - now.getDay()));
    startDate.setHours(0,0,0,0);
    endDate = new Date();
    endDate.setHours(23,59,59,999);
  } else if (filterPreset === 'bulan') {
    const range = getFinancialRange(currentReportDate, startDay);
    startDate = range.start;
    endDate = range.end;
  } else if (filterPreset === '3bulan') {
    endDate = new Date();
    startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);
  } else if (filterPreset === 'tahun') {
    const now = new Date();
    startDate = new Date(now.getFullYear(), 0, 1);
    endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
  }

  // Filter transactions
  const filteredTransactions = store.transactions.filter(tx => {
    const d = new Date(tx.tanggal);
    return d >= startDate && d <= endDate;
  });

  let totalIncome = 0;
  let totalExpense = 0;
  const categoryTotals = {};

  filteredTransactions.forEach(tx => {
    const amount = Math.abs(tx.harga);
    if (tx.type === 'income') {
      totalIncome += amount;
    } else {
      totalExpense += amount;
      categoryTotals[tx.kategori] = (categoryTotals[tx.kategori] || 0) + amount;
    }
  });

  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const maxVal = sortedCategories[0]?.[1] || 1;

  const breakdownHtml = sortedCategories.map(([name, total]) => {
    const percent = (total / maxVal) * 100;
    return `
      <div style="margin-bottom: 1.5rem;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
          <span class="font-bold text-sm">${name}</span>
          <span class="text-sm">${formatRupiah(total)}</span>
        </div>
        <div class="progress-bar-container" style="height: 10px; background: var(--bg-color); border-radius: 10px; overflow: hidden;">
          <div class="progress-bar" style="width: ${percent}%; height: 100%; background: var(--primary); transition: width 0.5s ease;"></div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="section-header" style="flex-wrap: wrap; gap: 1.5rem; margin-bottom: 2rem;">
      <div>
        <h3>Laporan Keuangan</h3>
        <p class="text-muted text-sm">
          Periode: <span class="font-bold text-main">${startDate.toLocaleDateString('id-ID')} - ${endDate.toLocaleDateString('id-ID')}</span>
        </p>
      </div>
      <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
        <div class="filter-tabs" style="display: flex; background: var(--bg-color); padding: 4px; border-radius: 12px; border: 1px solid var(--border);">
          <button class="tab-btn ${filterPreset === 'minggu' ? 'active' : ''}" data-preset="minggu">Minggu</button>
          <button class="tab-btn ${filterPreset === 'bulan' ? 'active' : ''}" data-preset="bulan">Bulan</button>
          <button class="tab-btn ${filterPreset === '3bulan' ? 'active' : ''}" data-preset="3bulan">3 Bulan</button>
          <button class="tab-btn ${filterPreset === 'tahun' ? 'active' : ''}" data-preset="tahun">Tahun</button>
        </div>
        
        ${filterPreset === 'bulan' ? `
        <div style="display: flex; align-items: center; gap: 8px; background: var(--card-bg); padding: 4px; border-radius: 12px; border: 1px solid var(--border);">
          <button class="icon-btn" id="prev-report" style="width: 32px; height: 32px;"><i class="ph ph-caret-left"></i></button>
          <span class="font-bold text-xs" style="min-width: 100px; text-align: center;">
            ${currentReportDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
          </span>
          <button class="icon-btn" id="next-report" style="width: 32px; height: 32px;"><i class="ph ph-caret-right"></i></button>
        </div>
        ` : ''}

        <div class="download-group">
          <button class="download-main" id="btn-main-download">
            <i class="ph-bold ${selectedFormat === 'pdf' ? 'ph-file-pdf' : 'ph-file-xls'}"></i>
            <span>Export ${selectedFormat.toUpperCase()}</span>
          </button>
          <button class="download-toggle" id="btn-toggle-export-menu">
            <i class="ph-bold ph-caret-down"></i>
          </button>
          
          <div class="download-menu" id="export-menu">
            <button class="menu-item ${selectedFormat === 'pdf' ? 'active' : ''}" data-format="pdf">
              <i class="ph-bold ph-file-pdf text-red"></i> PDF
            </button>
            <button class="menu-item ${selectedFormat === 'excel' ? 'active' : ''}" data-format="excel">
              <i class="ph-bold ph-file-xls text-green"></i> Excel
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="visual-analysis" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
      <div class="stat-card" style="padding: 1.5rem;">
        <h4 style="margin-bottom: 1.5rem; font-size: 1rem; display: flex; align-items: center; gap: 10px;">
          <i class="ph-fill ph-pie-chart" style="color: var(--primary);"></i>
          Analisis Pengeluaran
        </h4>
        <div style="height: 250px; position: relative;">
          <canvas id="categoryChart"></canvas>
        </div>
      </div>
      <div class="stat-card" style="padding: 1.5rem;">
        <h4 style="margin-bottom: 1.5rem; font-size: 1rem; display: flex; align-items: center; gap: 10px;">
          <i class="ph-fill ph-chart-line" style="color: var(--primary);"></i>
          Tren Arus Kas
        </h4>
        <div style="height: 250px; position: relative;">
          <canvas id="cashflowChart"></canvas>
        </div>
      </div>
    </div>

    <div class="bottom-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem;">
      <div class="stat-card" style="padding: 2rem;">
        <h4 style="margin-bottom: 2rem; font-size: 1.1rem; display: flex; align-items: center; gap: 10px;">
          <i class="ph-fill ph-chart-line-up" style="color: var(--primary);"></i>
          Ringkasan Periode
        </h4>
        <div style="display: flex; flex-direction: column; gap: 2rem;">
          <div style="display: flex; align-items: center; gap: 1.5rem;">
            <div class="icon-box bg-red-light text-red" style="width: 52px; height: 52px; font-size: 1.3rem; border-radius: 14px;">
              <i class="ph ph-trend-down"></i>
            </div>
            <div>
              <p class="text-muted text-xs font-bold mb-xs">PENGELUARAN</p>
              <h3 class="text-red">${formatRupiah(totalExpense)}</h3>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 1.5rem;">
            <div class="icon-box bg-green-light text-green" style="width: 52px; height: 52px; font-size: 1.3rem; border-radius: 14px;">
              <i class="ph ph-trend-up"></i>
            </div>
            <div>
              <p class="text-muted text-xs font-bold mb-xs">PEMASUKAN</p>
              <h3 class="text-green">${formatRupiah(totalIncome)}</h3>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 1.5rem; padding-top: 1.5rem; border-top: 1px dashed var(--border);">
            <div class="icon-box bg-blue-light text-blue" style="width: 52px; height: 52px; font-size: 1.3rem; border-radius: 14px;">
              <i class="ph ph-wallet"></i>
            </div>
            <div>
              <p class="text-muted text-xs font-bold mb-xs">SISA SALDO</p>
              <h3 class="text-blue">${formatRupiah(totalIncome - totalExpense)}</h3>
            </div>
          </div>
        </div>
      </div>

      <div class="stat-card" style="padding: 2rem;">
        <h4 style="margin-bottom: 2rem; font-size: 1.1rem; display: flex; align-items: center; gap: 10px;">
          <i class="ph-fill ph-list-numbers" style="color: var(--primary);"></i>
          Rincian Kategori
        </h4>
        <div style="max-height: 350px; overflow-y: auto; padding-right: 8px;">
          ${breakdownHtml || '<div style="text-align: center; padding: 3rem 0;"><p class="text-muted text-sm">Gak ada data buat periode ini bre.</p></div>'}
        </div>
      </div>
    </div>

    <style>
      .tab-btn {
        padding: 8px 16px;
        border: none;
        background: transparent;
        color: var(--text-muted);
        font-size: 0.75rem;
        font-weight: 700;
        cursor: pointer;
        border-radius: 10px;
        transition: all 0.2s ease;
      }
      .tab-btn.active {
        background: var(--white);
        color: var(--primary);
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }
      .tab-btn:hover:not(.active) {
        color: var(--text-main);
      }
    </style>
  `;

  // Handlers
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
      filterPreset = btn.dataset.preset;
      renderLaporan();
    };
  });

  const prevBtn = document.getElementById('prev-report');
  if (prevBtn) {
    prevBtn.onclick = () => {
      currentReportDate.setMonth(currentReportDate.getMonth() - 1);
      renderLaporan();
    };
  }

  const nextBtn = document.getElementById('next-report');
  if (nextBtn) {
    nextBtn.onclick = () => {
      currentReportDate.setMonth(currentReportDate.getMonth() + 1);
      renderLaporan();
    };
  }

  const handleExport = (format) => {
    if (filteredTransactions.length === 0) {
      return showToast('Gak ada data buat diexport bre!', 'warning');
    }

    showLoading();
    try {
      const metadata = {
        periode: filterPreset === 'bulan' 
          ? currentReportDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
          : `${startDate.toLocaleDateString('id-ID')} - ${endDate.toLocaleDateString('id-ID')}`,
        username: store.user?.name || 'User',
        totalIncome,
        totalExpense,
        categories: sortedCategories.map(([name, total]) => ({ name, total }))
      };

      if (format === 'pdf') {
        exportService.exportToPDF(filteredTransactions, metadata);
      } else {
        exportService.exportToExcel(filteredTransactions, metadata);
      }
      
      showToast(`Laporan ${format.toUpperCase()} berhasil didownload!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal export data bre.', 'error');
    } finally {
      hideLoading();
    }
  };

  const mainDownloadBtn = document.getElementById('btn-main-download');
  const toggleBtn = document.getElementById('btn-toggle-export-menu');
  const exportMenu = document.getElementById('export-menu');

  if (mainDownloadBtn) {
    mainDownloadBtn.onclick = (e) => {
      e.preventDefault();
      console.log('📥 Downloading as:', selectedFormat);
      handleExport(selectedFormat);
    };
  }

  if (toggleBtn && exportMenu) {
    toggleBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      exportMenu.classList.toggle('active');
    };

    container.querySelectorAll('.menu-item').forEach(item => {
      item.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectedFormat = item.dataset.format;
        exportMenu.classList.remove('active');
        renderLaporan();
      };
    });
  }

  // --- Chart Initialization ---
  const initCharts = () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#a1a1aa' : '#6b7280';
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

    // 1. Category Doughnut Chart
    const categoryCtx = document.getElementById('categoryChart');
    if (categoryCtx) {
      new Chart(categoryCtx, {
        type: 'doughnut',
        data: {
          labels: sortedCategories.map(c => c[0]),
          datasets: [{
            data: sortedCategories.map(c => c[1]),
            backgroundColor: [
              '#6366f1', '#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'
            ],
            borderWidth: 0,
            hoverOffset: 20
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: textColor, font: { family: 'Poppins', size: 10 }, usePointStyle: true, padding: 15 }
            }
          },
          cutout: '70%'
        }
      });
    }

    // 2. Cashflow Trend Chart (Grouped by Date)
    const cashflowCtx = document.getElementById('cashflowChart');
    if (cashflowCtx) {
      const dailyData = {};
      filteredTransactions.forEach(tx => {
        const dateStr = new Date(tx.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        if (!dailyData[dateStr]) dailyData[dateStr] = { income: 0, expense: 0 };
        if (tx.type === 'income') dailyData[dateStr].income += Math.abs(tx.harga);
        else dailyData[dateStr].expense += Math.abs(tx.harga);
      });

      const labels = Object.keys(dailyData);
      const incomeData = labels.map(l => dailyData[l].income);
      const expenseData = labels.map(l => dailyData[l].expense);

      new Chart(cashflowCtx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Pemasukan',
              data: incomeData,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              fill: true,
              tension: 0.4,
              pointRadius: 0
            },
            {
              label: 'Pengeluaran',
              data: expenseData,
              borderColor: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              fill: true,
              tension: 0.4,
              pointRadius: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: textColor, font: { size: 10 } }
            },
            y: {
              beginAtZero: true,
              grid: { color: gridColor },
              ticks: { 
                color: textColor, 
                font: { size: 10 },
                callback: (val) => val >= 1000000 ? (val/1000000).toFixed(1) + 'M' : val >= 1000 ? (val/1000) + 'k' : val
              }
            }
          }
        }
      });
    }
  };

  initCharts();

  // Robust click outside handler
  const handleOutsideClick = (e) => {
    const group = document.querySelector('.download-group');
    const menu = document.getElementById('export-menu');
    if (menu && menu.classList.contains('active') && group && !group.contains(e.target)) {
      menu.classList.remove('active');
    }
  };
  
  // Clean up old listeners and add new one
  document.removeEventListener('click', handleOutsideClick);
  document.addEventListener('click', handleOutsideClick);
}
