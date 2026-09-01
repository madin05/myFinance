import { store, formatRupiah } from "../store.js";
import { showLoading, hideLoading } from "../utils.js";
import { exportService } from "../services/exportService.js";
import { showToast } from "../components/notifications.js";
import { calculateDateRange, renderEmptyChartState } from "../utils/laporanHelpers.js";
import { getCategoryColor, initReportCharts } from "../charts/reportCharts.js";

// Module State
let currentReportDate = new Date();
let filterPreset = "bulan"; // 'minggu', 'bulan', '3bulan', 'tahun'
let selectedFormat = "pdf"; // 'pdf', 'excel'
let activeClickListener = null;

export function renderLaporan() {
  const container = document.getElementById("page-content");
  if (!container) return;

  const startDay = store.user?.financialStartDay || 1;
  const { startDate, endDate } = calculateDateRange(filterPreset, currentReportDate, startDay);

  // Filter transactions within selected range
  const filteredTransactions = store.transactions.filter((tx) => {
    const d = new Date(tx.tanggal);
    return d >= startDate && d <= endDate;
  });

  let totalIncome = 0;
  let totalExpense = 0;
  const categoryTotals = {};

  filteredTransactions.forEach((tx) => {
    const amount = Math.abs(tx.harga || 0);
    if (tx.type === "income") {
      totalIncome += amount;
    } else {
      totalExpense += amount;
      categoryTotals[tx.kategori] = (categoryTotals[tx.kategori] || 0) + amount;
    }
  });

  const sortedCategories = Object.entries(categoryTotals).sort(
    (a, b) => b[1] - a[1]
  );
  const maxVal = sortedCategories[0]?.[1] || 1;

  const breakdownHtml = sortedCategories
    .map(([name, total]) => {
      const percent = (total / maxVal) * 100;
      const catColor = getCategoryColor(name);
      return `
        <div style="margin-bottom: 1.15rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem; align-items: center;">
            <span class="font-bold text-xs" style="display: flex; align-items: center; gap: 8px;">
              <span style="width: 7px; height: 7px; border-radius: 50%; background: ${catColor}; display: inline-block; flex-shrink: 0;"></span>
              ${name}
            </span>
            <span class="text-xs font-bold">${formatRupiah(total)}</span>
          </div>
          <div class="progress-bar-container" style="height: 7px; background: var(--bg-color); border-radius: 10px; overflow: hidden; border: 1px solid var(--border-light);">
            <div class="progress-bar" style="width: ${percent}%; height: 100%; background: ${catColor}; border-radius: 10px; transition: width 0.5s ease;"></div>
          </div>
        </div>
      `;
    })
    .join("");

  container.innerHTML = `
    <div class="section-header" style="margin-bottom: 2rem;">
      <div>
        <h3>Laporan Keuangan</h3>
        <p class="text-muted text-sm">
          Periode: <span class="font-bold text-main">${startDate.toLocaleDateString("id-ID")} - ${endDate.toLocaleDateString("id-ID")}</span>
        </p>
      </div>

      <div class="section-header-controls" style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
        <div class="filter-tabs" style="display: flex; background: var(--bg-color); padding: 4px; border-radius: 12px; border: 1px solid var(--border);">
          <button class="tab-btn ${filterPreset === "minggu" ? "active" : ""}" data-preset="minggu">Minggu</button>
          <button class="tab-btn ${filterPreset === "bulan" ? "active" : ""}" data-preset="bulan">Bulan</button>
          <button class="tab-btn ${filterPreset === "3bulan" ? "active" : ""}" data-preset="3bulan">3 Bulan</button>
          <button class="tab-btn ${filterPreset === "tahun" ? "active" : ""}" data-preset="tahun">Tahun</button>
        </div>
        
        ${
          filterPreset === "bulan"
            ? `
        <div class="date-preset-nav" style="display: flex; align-items: center; gap: 8px; background: var(--card-bg); padding: 4px; border-radius: 12px; border: 1px solid var(--border);">
          <button class="icon-btn" id="prev-report" style="width: 32px; height: 32px;"><i class="ph ph-caret-left"></i></button>
          <span class="font-bold text-xs" style="min-width: 100px; text-align: center;">
            ${currentReportDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
          </span>
          <button class="icon-btn" id="next-report" style="width: 32px; height: 32px;"><i class="ph ph-caret-right"></i></button>
        </div>
        `
            : ""
        }

        <div class="download-group">
          <button class="download-main" id="btn-main-download">
            <i class="ph-bold ${selectedFormat === "pdf" ? "ph-file-pdf" : "ph-file-xls"}"></i>
            <span>Export ${selectedFormat.toUpperCase()}</span>
          </button>
          <button class="download-toggle" id="btn-toggle-export-menu">
            <i class="ph-bold ph-caret-down"></i>
          </button>
          
          <div class="download-menu" id="export-menu">
            <button class="menu-item ${selectedFormat === "pdf" ? "active" : ""}" data-format="pdf">
              <i class="ph-bold ph-file-pdf text-red"></i> PDF
            </button>
            <button class="menu-item ${selectedFormat === "excel" ? "active" : ""}" data-format="excel">
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
        <div style="height: 250px; position: relative;" id="categoryChartContainer">
          ${
            sortedCategories.length > 0
              ? `<canvas id="categoryChart"></canvas>
                 <div id="categoryChartCenter" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; transition: all 0.22s ease; z-index: 5;"></div>`
              : renderEmptyChartState("Belum ada pengeluaran")
          }
        </div>
      </div>
      <div class="stat-card" style="padding: 1.5rem;">
        <h4 style="margin-bottom: 1.5rem; font-size: 1rem; display: flex; align-items: center; gap: 10px;">
          Tren Arus Kas
        </h4>
        <div style="height: 250px; position: relative;">
          ${
            filteredTransactions.length > 0
              ? `<canvas id="cashflowChart"></canvas>`
              : renderEmptyChartState("Belum ada data transaksi")
          }
        </div>
      </div>
    </div>

    <div class="bottom-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; align-items: start;">
      <div class="stat-card" style="padding: 2rem;">
        <h4 style="margin-bottom: 2rem; font-size: 1.1rem; display: flex; align-items: center; gap: 10px;">
          Ringkasan Periode
        </h4>
        <div style="display: flex; flex-direction: column; gap: 2rem;">
          <div style="display: flex; align-items: center; gap: 1.5rem;">
            <div class="text-red" style="font-size: 1.5rem; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
              <i class="ph ph-trend-down"></i>
            </div>
            <div>
              <p class="text-muted text-xs font-bold mb-xs">PENGELUARAN</p>
              <h3 class="text-red">${formatRupiah(totalExpense)}</h3>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 1.5rem;">
            <div class="text-green" style="font-size: 1.5rem; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
              <i class="ph ph-trend-up"></i>
            </div>
            <div>
              <p class="text-muted text-xs font-bold mb-xs">PEMASUKAN</p>
              <h3 class="text-green">${formatRupiah(totalIncome)}</h3>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 1.5rem; padding-top: 1.5rem; border-top: 1px dashed var(--border);">
            <div style="font-size: 1.5rem; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; color: var(--text-muted);">
              <i class="ph ph-wallet"></i>
            </div>
            <div>
              <p class="text-muted text-xs font-bold mb-xs">SISA SALDO</p>
              <h3 class="text-main font-bold">${formatRupiah(totalIncome - totalExpense)}</h3>
            </div>
          </div>
        </div>
      </div>

      <div class="stat-card" style="padding: 2rem;">
        <h4 style="margin-bottom: 2rem; font-size: 1.1rem; display: flex; align-items: center; gap: 10px;">
          Rincian Kategori
        </h4>
        <div style="max-height: 350px; overflow-y: auto; padding-right: 8px;">
          ${breakdownHtml || '<div style="text-align: center; padding: 3rem 0;"><p class="text-muted text-sm">Tidak ada data untuk periode ini.</p></div>'}
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

  // Attach Filter Handlers
  container.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.onclick = () => {
      filterPreset = btn.dataset.preset;
      renderLaporan();
    };
  });

  const prevBtn = document.getElementById("prev-report");
  if (prevBtn) {
    prevBtn.onclick = () => {
      currentReportDate.setMonth(currentReportDate.getMonth() - 1);
      renderLaporan();
    };
  }

  const nextBtn = document.getElementById("next-report");
  if (nextBtn) {
    nextBtn.onclick = () => {
      currentReportDate.setMonth(currentReportDate.getMonth() + 1);
      renderLaporan();
    };
  }

  // Export Action Handler
  const handleExport = async (format) => {
    if (filteredTransactions.length === 0) {
      return showToast("Tidak ada data untuk diekspor.", "warning");
    }

    showLoading();
    try {
      const metadata = {
        periode:
          filterPreset === "bulan"
            ? currentReportDate.toLocaleDateString("id-ID", {
                month: "long",
                year: "numeric",
              })
            : `${startDate.toLocaleDateString("id-ID")} - ${endDate.toLocaleDateString("id-ID")}`,
        username: store.user?.name || "User",
        totalIncome,
        totalExpense,
        categories: sortedCategories.map(([name, total]) => ({ name, total })),
      };

      if (format === "pdf") {
        await exportService.exportToPDF(filteredTransactions, metadata);
      } else {
        exportService.exportToExcel(filteredTransactions, metadata);
      }

      showToast(
        `Laporan ${format.toUpperCase()} berhasil didownload!`,
        "success"
      );
    } catch (err) {
      console.error("Export Error:", err);
      showToast("Gagal mengekspor data.", "error");
    } finally {
      hideLoading();
    }
  };

  const mainDownloadBtn = document.getElementById("btn-main-download");
  const toggleBtn = document.getElementById("btn-toggle-export-menu");
  const exportMenu = document.getElementById("export-menu");

  if (mainDownloadBtn) {
    mainDownloadBtn.onclick = (e) => {
      e.preventDefault();
      handleExport(selectedFormat);
    };
  }

  if (toggleBtn && exportMenu) {
    toggleBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      exportMenu.classList.toggle("active");
    };

    container.querySelectorAll(".menu-item").forEach((item) => {
      item.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        selectedFormat = item.dataset.format;
        exportMenu.classList.remove("active");
        renderLaporan();
      };
    });
  }

  // Init Charts
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const textColor = isDark ? "#a1a1aa" : "#6b7280";
  const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";

  initReportCharts(sortedCategories, filteredTransactions, totalExpense, textColor, gridColor);

  // Outside click listener setup
  if (activeClickListener) {
    document.removeEventListener("click", activeClickListener);
  }

  activeClickListener = (e) => {
    const group = document.querySelector(".download-group");
    const menu = document.getElementById("export-menu");
    if (
      menu &&
      menu.classList.contains("active") &&
      group &&
      !group.contains(e.target)
    ) {
      menu.classList.remove("active");
    }
  };

  document.addEventListener("click", activeClickListener);
}
