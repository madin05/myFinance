import { formatRupiah } from "../store.js";
import { getCategoryIconUrl } from "../utils.js";

// Constants & Shared Formatters
export const CATEGORY_COLOR_MAP = {
  "Makanan & Minuman": "#F97316",
  "Transportasi": "#3B82F6",
  "Belanja": "#EC4899",
  "Tagihan & Utilitas": "#06B6D4",
  "Tagihan": "#06B6D4",
  "Hiburan": "#8B5CF6",
  "Kesehatan": "#10B981",
  "Pendidikan": "#6366F1",
  "Investasi & Tabungan": "#EAB308",
  "Investasi": "#EAB308",
  "Gaji & Pendapatan": "#10B981",
  "Gaji": "#10B981",
  "Bonus": "#3B82F6",
  "Lain-lain": "#64748B",
  "Lainnya": "#64748B",
};

const CATEGORY_PALETTE = ["#6366F1", "#EC4899", "#8B5CF6", "#06B6D4", "#10B981", "#F97316", "#EF4444", "#3B82F6", "#EAB308"];

export function getCategoryColor(categoryName) {
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

/**
 * Initializes Category Doughnut Chart and Cashflow Line Chart for Laporan Page
 */
export function initReportCharts(sortedCategories, filteredTransactions, totalExpense, textColor, gridColor) {
  if (typeof Chart === "undefined") return;

  const isDark = document.documentElement.getAttribute("data-theme") === "dark";

  // 1. Category Doughnut Chart (1:1 UI design with flush transitions & rounded end caps)
  const categoryCtx = document.getElementById("categoryChart");
  if (categoryCtx && sortedCategories.length > 0) {
    const smoothPillDonutPlugin = {
      id: "smoothPillDonutPlugin",
      afterDraw(chart) {
        const { ctx, chartArea } = chart;
        const meta = chart.getDatasetMeta(0);
        if (!meta || !meta.data || meta.data.length === 0) return;

        const isDarkTheme = document.documentElement.getAttribute("data-theme") === "dark";
        const x = (chartArea.left + chartArea.right) / 2;
        const y = (chartArea.top + chartArea.bottom) / 2;

        const firstArc = meta.data[0];
        const outerRadius = firstArc.outerRadius;
        const innerRadius = firstArc.innerRadius;
        const thickness = outerRadius - innerRadius;
        const radius = innerRadius + thickness / 2;

        ctx.save();
        // Clear chart area so standard default slices are replaced by custom 1:1 pill ring
        ctx.clearRect(chartArea.left - 10, chartArea.top - 10, chartArea.width + 20, chartArea.height + 20);

        // Dynamically position center text element to the mathematical center of the doughnut ring
        const centerEl = document.getElementById("categoryChartCenter");
        if (centerEl && chartArea) {
          const xCenter = (chartArea.left + chartArea.right) / 2;
          const yCenter = (chartArea.top + chartArea.bottom) / 2;
          centerEl.style.left = `${xCenter}px`;
          centerEl.style.top = `${yCenter}px`;
        }

        // 1. Draw Continuous Background Track (Full 360° Ring)
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.strokeStyle = isDarkTheme ? "rgba(255, 255, 255, 0.08)" : "#f1f5f9";
        ctx.lineWidth = thickness;
        ctx.stroke();

        // 2. Draw Colored Arc Segments (Solid 100% opacity, buttery-smooth 60fps hover transition)
        const totalVal = sortedCategories.reduce((sum, c) => sum + c[1], 0);
        if (totalVal > 0) {
          let startAngle = -Math.PI / 2; // Start top center (-90deg)
          const hoveredIdx = chart._hoveredIndex;

          // Track smooth progress for each segment (lerp animation)
          chart._hoverProgresses = chart._hoverProgresses || {};
          let isAnimating = false;

          sortedCategories.forEach((_, idx) => {
            const target = hoveredIdx === idx ? 1 : 0;
            const current = chart._hoverProgresses[idx] || 0;
            const diff = target - current;
            if (Math.abs(diff) > 0.005) {
              chart._hoverProgresses[idx] = current + diff * 0.22;
              isAnimating = true;
            } else {
              chart._hoverProgresses[idx] = target;
            }
          });

          const segments = sortedCategories.map((cat, idx) => {
            const val = cat[1];
            const sliceAngle = (val / totalVal) * (2 * Math.PI);
            const sAngle = startAngle;
            const eAngle = startAngle + sliceAngle;
            startAngle = eAngle;
            return {
              cat,
              idx,
              color: getCategoryColor(cat[0]),
              startAngle: sAngle,
              endAngle: eAngle,
            };
          });

          const drawSegment = (seg) => {
            const { color, startAngle: sAngle, endAngle: eAngle, idx } = seg;
            const progress = chart._hoverProgresses[idx] || 0;
            const currentThickness = thickness + 4 * progress;

            ctx.save();
            ctx.globalAlpha = 1.0;

            if (progress > 0.01) {
              ctx.shadowColor = color;
              ctx.shadowBlur = 12 * progress;
            } else {
              ctx.shadowBlur = 0;
            }

            // Draw segment arc
            ctx.beginPath();
            ctx.arc(x, y, radius, sAngle, eAngle);
            ctx.strokeStyle = color;
            ctx.lineWidth = currentThickness;
            ctx.lineCap = "butt";
            ctx.stroke();

            // Rounded start cap for segment
            const startX = x + radius * Math.cos(sAngle);
            const startY = y + radius * Math.sin(sAngle);

            ctx.beginPath();
            ctx.arc(startX, startY, currentThickness / 2, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();

            // Rounded end cap for EVERY segment
            const endX = x + radius * Math.cos(eAngle);
            const endY = y + radius * Math.sin(eAngle);

            ctx.beginPath();
            ctx.arc(endX, endY, currentThickness / 2, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();

            ctx.restore();
          };

          // Draw segments sorted by progress so active segment transitions on top
          const sortedSegs = [...segments].sort(
            (a, b) => (chart._hoverProgresses[a.idx] || 0) - (chart._hoverProgresses[b.idx] || 0)
          );
          sortedSegs.forEach(drawSegment);

          // Request next animation frame if transition is still interpolating
          if (isAnimating) {
            requestAnimationFrame(() => {
              if (chart && chart.ctx) {
                chart.draw();
              }
            });
          }
        }

        ctx.restore();
      },
    };

    const setCenterDefaultContent = (chart) => {
      const centerEl = document.getElementById("categoryChartCenter");
      if (!centerEl) return;

      if (chart && chart.chartArea) {
        const xCenter = (chart.chartArea.left + chart.chartArea.right) / 2;
        const yCenter = (chart.chartArea.top + chart.chartArea.bottom) / 2;
        centerEl.style.left = `${xCenter}px`;
        centerEl.style.top = `${yCenter}px`;
      }

      centerEl.innerHTML = `
        <span style="font-size: 0.58rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 1px;">TOTAL</span>
        <span style="font-size: 0.76rem; font-weight: 800; color: var(--text-main); font-family: Poppins, sans-serif; white-space: nowrap; max-width: 110px; overflow: hidden; text-overflow: ellipsis;">${formatRupiah(totalExpense)}</span>
      `;
    };

    const catChart = new Chart(categoryCtx, {
      type: "doughnut",
      plugins: [smoothPillDonutPlugin],
      data: {
        labels: sortedCategories.map((c) => c[0]),
        datasets: [
          {
            data: sortedCategories.map((c) => c[1]),
            backgroundColor: sortedCategories.map((c) => getCategoryColor(c[0])),
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onHover: (event, activeElements, chart) => {
          const centerEl = document.getElementById("categoryChartCenter");
          const activeIndex = (activeElements && activeElements.length > 0) ? activeElements[0].index : null;

          if (chart._hoveredIndex !== activeIndex) {
            chart._hoveredIndex = activeIndex;
            chart.draw();
          }

          if (!centerEl) return;

          if (activeIndex !== null) {
            const categoryName = sortedCategories[activeIndex][0];
            const categoryTotal = sortedCategories[activeIndex][1];
            const iconUrl = getCategoryIconUrl(categoryName);

            if (chart.chartArea) {
              const xCenter = (chart.chartArea.left + chart.chartArea.right) / 2;
              const yCenter = (chart.chartArea.top + chart.chartArea.bottom) / 2;

              centerEl.style.left = `${xCenter}px`;
              centerEl.style.top = `${yCenter}px`;
              centerEl.innerHTML = `
                <img src="${iconUrl}" alt="${categoryName}" style="width: 18px; height: 18px; object-fit: contain; margin-bottom: 2px;" />
                <span style="font-size: 0.68rem; font-weight: 700; color: var(--text-main); line-height: 1.2; max-width: 90px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${categoryName}</span>
                <span style="font-size: 0.65rem; font-weight: 600; color: var(--text-muted); margin-top: 1px;">${formatRupiah(categoryTotal)}</span>
              `;
            }
          } else {
            setCenterDefaultContent(chart);
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
              font: { family: "Poppins", size: 10, weight: "500" },
              usePointStyle: true,
              pointStyle: "circle",
              boxWidth: 8,
              boxHeight: 8,
              padding: 12,
            },
          },
        },
        cutout: "75%",
      },
    });

    // Initial center text setup
    setCenterDefaultContent(catChart);

    categoryCtx.addEventListener("mouseleave", () => {
      if (catChart._hoveredIndex !== null) {
        catChart._hoveredIndex = null;
        catChart.draw();
      }
      setCenterDefaultContent(catChart);
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
}
