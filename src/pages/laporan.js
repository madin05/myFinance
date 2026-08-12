import { store, formatRupiah } from "../store.js";
import { showLoading, hideLoading, getFinancialRange, getCategoryIconUrl } from "../utils.js";
import { exportService } from "../services/exportService.js";
import { showToast } from "../components/notifications.js";

// Constants & Shared Formatters
const CATEGORY_COLOR_MAP = {
  "Makanan": "#F97316",
  "Makanan & Minuman": "#F97316",
  "Transportasi": "#3B82F6",
  "Belanja": "#EC4899",
  "Tagihan": "#06B6D4",
  "Tagihan & Utilitas": "#06B6D4",
  "Hiburan": "#8B5CF6",
  "Kesehatan": "#10B981",
  "Pendidikan": "#6366F1",
  "Investasi": "#EAB308",
  "Gaji": "#10B981",
  "Bonus": "#3B82F6",
  "Lainnya": "#64748B",
};

const CATEGORY_PALETTE = ["#6366F1", "#EC4899", "#8B5CF6", "#06B6D4", "#10B981", "#F97316", "#EF4444", "#3B82F6", "#EAB308"];

function getCategoryColor(categoryName) {
  if (CATEGORY_COLOR_MAP[categoryName]) {
    return CATEGORY_COLOR_MAP[categoryName];
  }
  let hash = 0;
  for (let i = 0; i < (categoryName || "").length; i++) {
    hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CATEGORY_PALETTE[Math.abs(hash) % CATEGORY_PALETTE.length];
}

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

// Module State
let currentReportDate = new Date();
let filterPreset = "bulan"; // 'minggu', 'bulan', '3bulan', 'tahun'
let selectedFormat = "pdf"; // 'pdf', 'excel'
let activeClickListener = null;

/**
 * Calculates date bounds based on preset filter and financial start day
 */
function calculateDateRange(preset, baseDate, startDay = 1) {
  let startDate, endDate;
  const now = new Date();

  switch (preset) {
    case "minggu": {
      startDate = new Date(now.setDate(now.getDate() - now.getDay()));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      break;
    }
    case "bulan": {
      const range = getFinancialRange(baseDate, startDay);
      startDate = range.start;
      endDate = range.end;
      break;
    }
    case "3bulan": {
      endDate = new Date();
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    }
    case "tahun": {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      break;
    }
    default: {
      const range = getFinancialRange(baseDate, startDay);
      startDate = range.start;
      endDate = range.end;
    }
  }

  return { startDate, endDate };
}

/**
 * Helper to render empty illustration state for charts
 */
function renderEmptyChartState(message) {
  return `
    <div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;">
      <style>
        [data-theme="light"] .report-illustration-dark { display: none !important; }
        [data-theme="dark"] .report-illustration-light { display: none !important; }
      </style>
      <img class="report-illustration-light" src="/assets/transactions-empty-light.svg" alt="No Data" style="width: 120px; height: 120px;" />
      <img class="report-illustration-dark" src="/assets/transactions-empty-dark.svg" alt="No Data" style="width: 120px; height: 120px;" />
      <p class="text-muted text-xs" style="margin-top: 0.5rem; font-size: 0.8rem;">${message}</p>
    </div>
  `;
}

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
                 <div id="categoryChartCenter" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.85); pointer-events: none; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; transition: opacity 0.22s ease, transform 0.22s ease; opacity: 0; z-index: 5;"></div>`
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

  // --- Chart Initialization ---
  const initCharts = () => {
    if (typeof Chart === "undefined") return;

    const isDark =
      document.documentElement.getAttribute("data-theme") === "dark";
    const textColor = isDark ? "#a1a1aa" : "#6b7280";
    const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";

    // 1. Category Doughnut Chart
    const categoryCtx = document.getElementById("categoryChart");
    if (categoryCtx && sortedCategories.length > 0) {
      const catChart = new Chart(categoryCtx, {
        type: "doughnut",
        data: {
          labels: sortedCategories.map((c) => c[0]),
          datasets: [
            {
              data: sortedCategories.map((c) => c[1]),
              backgroundColor: sortedCategories.map((c) => getCategoryColor(c[0])),
              borderWidth: 0,
              hoverOffset: 12,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          onHover: (event, activeElements, chart) => {
            const centerEl = document.getElementById("categoryChartCenter");
            if (!centerEl) return;

            if (activeElements && activeElements.length > 0) {
              const index = activeElements[0].index;
              const categoryName = sortedCategories[index][0];
              const categoryTotal = sortedCategories[index][1];
              const iconUrl = getCategoryIconUrl(categoryName);

              if (chart.chartArea) {
                const xCenter = (chart.chartArea.left + chart.chartArea.right) / 2;
                const yCenter = (chart.chartArea.top + chart.chartArea.bottom) / 2;

                centerEl.style.left = `${xCenter}px`;
                centerEl.style.top = `${yCenter}px`;
                centerEl.style.opacity = "1";
                centerEl.style.transform = "translate(-50%, -50%) scale(1)";
                centerEl.innerHTML = `
                  <img src="${iconUrl}" alt="${categoryName}" style="width: 30px; height: 30px; object-fit: contain; margin-bottom: 2px;" />
                  <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-main); line-height: 1.2; max-width: 110px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${categoryName}</span>
                  <span style="font-size: 0.72rem; font-weight: 600; color: var(--text-muted); margin-top: 1px;">${formatRupiah(categoryTotal)}</span>
                `;
              }
            } else {
              centerEl.style.opacity = "0";
              centerEl.style.transform = "translate(-50%, -50%) scale(0.85)";
            }
          },
          layout: {
            padding: {
              top: 16,
              bottom: 10,
              left: 12,
              right: 12,
            },
          },
          plugins: {
            tooltip: {
              enabled: false,
            },
            legend: {
              position: "bottom",
              labels: {
                color: textColor,
                font: { family: "Poppins", size: 10 },
                usePointStyle: true,
                padding: 15,
              },
            },
          },
          cutout: "70%",
        },
      });

      categoryCtx.addEventListener("mouseleave", () => {
        const centerEl = document.getElementById("categoryChartCenter");
        if (centerEl) {
          centerEl.style.opacity = "0";
          centerEl.style.transform = "translate(-50%, -50%) scale(0.85)";
        }
      });
    }

    // 2. Cashflow Trend Chart (Grouped by Date)
    const cashflowCtx = document.getElementById("cashflowChart");
    if (cashflowCtx && filteredTransactions.length > 0) {
      const dailyData = {};
      filteredTransactions.forEach((tx) => {
        const dateStr = new Date(tx.tanggal).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
        });
        if (!dailyData[dateStr]) dailyData[dateStr] = { income: 0, expense: 0 };
        if (tx.type === "income") {
          dailyData[dateStr].income += Math.abs(tx.harga || 0);
        } else {
          dailyData[dateStr].expense += Math.abs(tx.harga || 0);
        }
      });

      const labels = Object.keys(dailyData);
      const incomeData = labels.map((l) => dailyData[l].income);
      const expenseData = labels.map((l) => dailyData[l].expense);

      const crosshairPlugin = {
        id: "cashflowCrosshair",
        afterDraw(chart) {
          if (!chart._crosshairX) return;
          const { ctx, chartArea } = chart;
          const x = chart._crosshairX;
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(x, chartArea.top);
          ctx.lineTo(x, chartArea.bottom);
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = isDark
            ? "rgba(255,255,255,0.2)"
            : "rgba(0,0,0,0.12)";
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.restore();
        },
      };

      const cashflowChart = new Chart(cashflowCtx, {
        type: "line",
        plugins: [crosshairPlugin],
        data: {
          labels: labels,
          datasets: [
            {
              label: "Pemasukan",
              data: incomeData,
              borderColor: "#3B82F6",
              backgroundColor: "rgba(59, 130, 246, 0.08)",
              fill: true,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 6,
              pointHoverBackgroundColor: "#3B82F6",
              pointHoverBorderColor: "#fff",
              pointHoverBorderWidth: 2,
              borderWidth: 2,
            },
            {
              label: "Pengeluaran",
              data: expenseData,
              borderColor: "#ef4444",
              backgroundColor: "rgba(239, 68, 68, 0.08)",
              fill: true,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 6,
              pointHoverBackgroundColor: "#ef4444",
              pointHoverBorderColor: "#fff",
              pointHoverBorderWidth: 2,
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: "index",
            intersect: false,
          },
          hover: {
            mode: "index",
            intersect: false,
          },
          onHover: (event, elements, chart) => {
            if (elements && elements.length > 0) {
              chart._crosshairX = elements[0].element.x;
            } else {
              chart._crosshairX = null;
            }
            chart.draw();
          },
          plugins: {
            legend: {
              display: true,
              position: "top",
              align: "end",
              labels: {
                color: textColor,
                font: { family: "Poppins", size: 11, weight: "500" },
                usePointStyle: false,
                boxWidth: 12,
                boxHeight: 12,
                useBorderRadius: true,
                borderRadius: 6,
                padding: 16,
                generateLabels(chart) {
                  const defaults =
                    Chart.defaults.plugins.legend.labels.generateLabels(chart);
                  defaults.forEach((label) => {
                    const dataset = chart.data.datasets[label.datasetIndex];
                    const isHidden = chart.getDatasetMeta(
                      label.datasetIndex
                    ).hidden;

                    label.fontStyle = "normal";
                    label.textDecoration = "none";
                    label.hidden = false;

                    if (isHidden) {
                      label.fillStyle = "transparent";
                      label.strokeStyle = dataset.borderColor;
                      label.lineWidth = 2;
                    } else {
                      label.fillStyle = dataset.borderColor;
                      label.strokeStyle = dataset.borderColor;
                      label.lineWidth = 0;
                    }
                  });
                  return defaults;
                },
              },
            },
            tooltip: {
              enabled: true,
              mode: "index",
              intersect: false,
              backgroundColor: isDark
                ? "rgba(20, 18, 30, 0.92)"
                : "rgba(255, 255, 255, 0.96)",
              titleColor: isDark ? "#f4f4f5" : "#111827",
              bodyColor: isDark ? "#a1a1aa" : "#4b5563",
              borderColor: isDark
                ? "rgba(255,255,255,0.12)"
                : "rgba(0,0,0,0.08)",
              borderWidth: 1,
              padding: { x: 14, y: 12 },
              boxPadding: 6,
              cornerRadius: 12,
              usePointStyle: true,
              caretSize: 0,
              caretPadding: 12,
              displayColors: true,
              titleFont: { family: "Poppins", size: 11, weight: "700" },
              bodyFont: { family: "Poppins", size: 12, weight: "600" },
              callbacks: {
                title(contexts) {
                  return contexts[0]?.label || "";
                },
                labelColor(context) {
                  return {
                    borderColor: context.dataset.borderColor,
                    backgroundColor: context.dataset.borderColor,
                    borderWidth: 0,
                    borderRadius: 6,
                  };
                },
                label(context) {
                  const val = context.parsed.y;
                  return `  ${context.dataset.label}: ${currencyFormatter.format(val)}`;
                },
                afterBody(contexts) {
                  const income =
                    contexts.find((c) => c.dataset.label === "Pemasukan")
                      ?.parsed.y || 0;
                  const expense =
                    contexts.find((c) => c.dataset.label === "Pengeluaran")
                      ?.parsed.y || 0;
                  const net = income - expense;
                  const sign = net >= 0 ? "+" : "";
                  return [``, `  Net: ${sign}${currencyFormatter.format(net)}`];
                },
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: {
                color: textColor,
                font: { family: "Poppins", size: 10 },
              },
            },
            y: {
              beginAtZero: true,
              grid: { color: gridColor },
              ticks: {
                color: textColor,
                font: { family: "Poppins", size: 10 },
                callback: (val) =>
                  val >= 1000000
                    ? (val / 1000000).toFixed(1) + "M"
                    : val >= 1000
                    ? val / 1000 + "k"
                    : val,
              },
            },
          },
        },
      });

      cashflowCtx.addEventListener("mouseleave", () => {
        cashflowChart._crosshairX = null;
        cashflowChart.draw();
      });
    }
  };

  initCharts();

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

