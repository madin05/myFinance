import { store, formatRupiah, formatDate } from "../store.js";
import { openAdjustBalanceModal } from "../components/modal/index.js";
import { navigateTo } from "../router.js";
import { initStickyHeader, escapeHtml, getCategoryIconUrl } from "../utils.js";
import { getSmartAiInputHtml, initSmartAiInputEvents } from "../components/smartAiInput.js";

let currentSavingIndex = 0;
let savingInterval = null;

export function renderDashboard() {
  const container = document.getElementById("page-content");
  if (!container) return;

  const stats = store.getStats();

  const getBadge = (diff, type) => {
    const isPositive = diff >= 0;
    const absDiff = Math.abs(diff).toFixed(1);
    const icon = isPositive ? "ph-caret-up" : "ph-caret-down";
    // Income: positive = up (green), negative = down (red)
    // Expense: always red badge (down)
    const badgeClass =
      type === "income" ? (isPositive ? "up" : "down") : "down";
    return `<div class="stat-badge ${badgeClass}"><i class="ph-bold ${icon}"></i> ${absDiff}%</div>`;
  };

  // Sortir terbaru: Tanggal desc, lalu ID desc
  const sortedTxs = [...store.transactions].sort((a, b) => {
    const dateDiff = new Date(b.tanggal) - new Date(a.tanggal);
    if (dateDiff !== 0) return dateDiff;
    return (b.id || 0) - (a.id || 0);
  });

  const topTransactions = sortedTxs.slice(0, 4);
  const txHtml = topTransactions
    .map((tx) => {
      const isIncome = tx.type === "income";
      const colorClass = isIncome ? "text-green" : "text-red";
      const sign = isIncome ? "+" : "-";

      let badgeClass = "badge-blue";
      const lowerKategori = tx.kategori.toLowerCase();
      if (lowerKategori.includes("gaji")) badgeClass = "badge-green";
      else if (lowerKategori.includes("makan")) badgeClass = "badge-orange";
      else if (lowerKategori.includes("belanja")) badgeClass = "badge-purple";

      return `
      <tr>
        <td>${formatDate(tx.tanggal)}</td>
        <td><span class="badge-soft ${badgeClass}"><img src="${getCategoryIconUrl(tx.kategori, tx.type)}" class="tx-cat-icon" alt="" /><span>${tx.kategori}</span></span></td>
        <td>${tx.metode}</td>
        <td>${tx.keterangan}</td>
        <td class="text-right ${colorClass} font-bold" style="white-space: nowrap;">${sign} ${formatRupiah(Math.abs(tx.harga))}</td>
      </tr>
    `;
    })
    .join("");

  const getDayPhase = () => {
    const hrs = new Date().getHours();
    if (hrs >= 5 && hrs < 11) return "morning";
    if (hrs >= 11 && hrs < 18) return "afternoon";
    if (hrs >= 18 && hrs < 21) return "evening";
    return "night";
  };

  const getGreeting = () => {
    const phase = getDayPhase();
    if (phase === "morning") return "Selamat Pagi";
    if (phase === "afternoon") {
      const hrs = new Date().getHours();
      return hrs < 15 ? "Selamat Siang" : "Selamat Sore";
    }
    return "Selamat Malam";
  };

  const getFormattedTimeParts = () => {
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    return {
      time: `${hours}:${minutes}`,
      ampm,
    };
  };

  const getFormattedDayText = () => {
    const options = { weekday: "long", month: "long", day: "numeric" };
    const text = new Date().toLocaleDateString("en-US", options);
    const day = new Date().getDate();
    let suffix = "th";
    if (day === 1 || day === 21 || day === 31) suffix = "st";
    else if (day === 2 || day === 22) suffix = "nd";
    else if (day === 3 || day === 23) suffix = "rd";
    return `${text}${suffix}`;
  };

  const getWeatherIcon = () => {
    const phase = getDayPhase();
    if (phase === "night") {
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
  const isSaldoHidden = localStorage.getItem("myfinance_hide_saldo") === "true";
  const displayBalanceText = isSaldoHidden ? "Rp ••••••••" : formatRupiah(stats.balance);

  container.innerHTML = `
    <!-- Greeting Section (Minimal & Simple) -->
    <div class="dashboard-greeting-simple">
      <h1 class="greeting-title-simple">${getGreeting()}, <span class="font-bold">${escapeHtml(store.user?.name || "Tamu")}</span>! 👋</h1>
      <p class="greeting-date-simple">${getFormattedDayText()} &bull; ${timeParts.time} ${timeParts.ampm}</p>
    </div>

    <!-- Top Cards (Total Saldo -> Pemasukan -> Pengeluaran) -->
    <div class="stats-cards">
      <div class="stat-card" id="card-total-saldo" style="cursor: pointer;">
        <div class="stat-header" style="display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:8px;">
            <p class="stat-label" style="margin:0;">${stats.hasAccounts ? `Total Saldo` : "Saldo Saat Ini"}</p>
            <button id="btn-toggle-hide-saldo" title="${isSaldoHidden ? 'Tampilkan Saldo' : 'Sembunyikan Saldo'}" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; padding:2px 4px; display:inline-flex; align-items:center; justify-content:center; border-radius:4px; transition:all 0.2s;" onmouseenter="this.style.color='var(--primary)'" onmouseleave="this.style.color='var(--text-muted)'">
              <i class="ph ${isSaldoHidden ? 'ph-eye-slash' : 'ph-eye'}" style="font-size:1.05rem;"></i>
            </button>
          </div>
          ${
            stats.hasAccounts
              ? `
          <a href="/saldo" id="btn-goto-saldo" title="Lihat detail saldo akun" style="width:34px;height:34px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-muted);transition:all 0.2s;text-decoration:none;" onmouseenter="this.style.color='var(--primary)'" onmouseleave="this.style.color='var(--text-muted)'">
            <i class="ph ph-arrow-right" style="font-size:1rem;"></i>
          </a>
          `
              : `
          <button id="btn-adjust-balance" title="Sesuaikan saldo riil" style="background:transparent;border:none;width:34px;height:34px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-muted);transition:all 0.2s;" onmouseenter="this.style.color='var(--primary)'" onmouseleave="this.style.color='var(--text-muted)'">
            <i class="ph ph-arrow-right" style="font-size:1rem;"></i>
          </button>
          `
          }
        </div>
        <div class="stat-body">
          <h2 class="stat-value text-main">${displayBalanceText}</h2>
        </div>
        <div class="stat-footer">
          <div class="stat-line"><div class="stat-line-fill" style="width: 100%; background: var(--text-muted); opacity: 0.4;"></div></div>
        </div>
        <i class="ph ph-bank stat-watermark"></i>
      </div>

      <div class="stats-cards-slider-container">
        <div class="stat-card" id="card-pemasukan" style="cursor: pointer;" title="Lihat Laporan Pemasukan">
          <div class="stat-header">
            <p class="stat-label">Pemasukan bulan ini</p>
            ${getBadge(stats.incomeDiff, "income")}
          </div>
          <div class="stat-body">
            <h2 class="stat-value text-green">${formatRupiah(stats.income)}</h2>
          </div>
          <div class="stat-footer">
            <div class="stat-line"><div class="stat-line-fill bg-green" style="width: ${Math.min((stats.income / (stats.income + stats.expense || 1)) * 100, 100)}%"></div></div>
          </div>
          <i class="ph ph-trend-up stat-watermark"></i>
        </div>

        <div class="stat-card" id="card-pengeluaran" style="cursor: pointer;" title="Lihat Laporan Pengeluaran">
          <div class="stat-header">
            <p class="stat-label">Pengeluaran bulan ini</p>
            ${getBadge(stats.expenseDiff, "expense")}
          </div>
          <div class="stat-body">
            <h2 class="stat-value text-red">${formatRupiah(stats.expense)}</h2>
          </div>
          <div class="stat-footer">
            <div class="stat-line"><div class="stat-line-fill bg-red" style="width: ${Math.min((stats.expense / (stats.income + stats.expense || 1)) * 100, 100)}%"></div></div>
          </div>
          <i class="ph ph-trend-down stat-watermark"></i>
        </div>
      </div>
    </div>

    <!-- Slider Dots Indicator (Mobile Only) -->
    <div class="slider-dots mobile-only" id="stats-slider-dots">
      <span class="dot active" data-index="0"></span>
      <span class="dot" data-index="1"></span>
      <span class="dot" data-index="2"></span>
    </div>

    <!-- Quick Access Feature Navigation Grid (Migrated from Sidebar) -->
    <div class="dashboard-quick-access">
      <a href="/ai" class="quick-access-card" data-route="/ai">
        <div class="quick-access-icon icon-ai">
          <img src="/assets/technical-support.svg" class="quick-access-img" alt="Asisten AI" />
        </div>
        <span class="quick-access-title">Asisten AI</span>
      </a>
      <a href="/anggaran" class="quick-access-card" data-route="/anggaran">
        <div class="quick-access-icon icon-anggaran">
          <img src="/assets/anggaran.svg" class="quick-access-img" alt="Anggaran" />
        </div>
        <span class="quick-access-title">Anggaran</span>
      </a>
      <a href="/tabungan" class="quick-access-card" data-route="/tabungan">
        <div class="quick-access-icon icon-wishlist">
          <img src="/assets/wishlist.svg" class="quick-access-img" alt="Wishlist" />
        </div>
        <span class="quick-access-title">Wishlist</span>
      </a>
      <a href="/laporan" class="quick-access-card" data-route="/laporan">
        <div class="quick-access-icon icon-laporan">
          <img src="/assets/laporan.svg" class="quick-access-img" alt="Laporan" />
        </div>
        <span class="quick-access-title">Laporan</span>
      </a>
    </div>

    <!-- Bottom Section -->
    <div class="bottom-grid">
      <div class="transactions-section">
        <div class="section-header row-header">
          <h3>Transaksi Terbaru</h3>
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
              ${
                txHtml ||
                `
                <tr class="empty-row">
                  <td colspan="5" class="empty-td" style="text-align: center; padding: 2rem 1.5rem;">
                    <style>
                      [data-theme="light"] .tx-illustration-dark { display: none !important; }
                      [data-theme="dark"] .tx-illustration-light { display: none !important; }
                    </style>
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem;">
                      <img class="tx-illustration-light" src="/assets/transactions-empty-light.svg" alt="No Transactions" style="width: 120px; height: 120px;" />
                      <img class="tx-illustration-dark" src="/assets/transactions-empty-dark.svg" alt="No Transactions" style="width: 120px; height: 120px;" />
                      <p class="text-muted text-xs" style="margin: 0; font-size: 0.85rem;">Belum ada transaksi</p>
                    </div>
                  </td>
                </tr>
              `
              }
            </tbody>
          </table>
        </div>
        ${getSmartAiInputHtml()}
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
          <button class="btn-icon-absolute" id="btn-go-to-wishlist"><i class="ph ph-plus"></i></button>
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
  container.querySelectorAll(".quick-access-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      e.preventDefault();
      const route = card.getAttribute("data-route");
      if (route) navigateTo(route);
    });
  });

  document.getElementById("btn-manage-budget").addEventListener("click", () => {
    navigateTo("/anggaran");
  });

  document
    .getElementById("btn-go-to-wishlist")
    .addEventListener("click", () => {
      navigateTo("/tabungan");
    });

  // Tombol pensil hanya muncul jika belum ada akun saldo
  const btnAdjust = document.getElementById("btn-adjust-balance");
  if (btnAdjust) {
    btnAdjust.addEventListener("click", () => {
      openAdjustBalanceModal(stats.balance, () => renderDashboard());
    });
  }

  // Link ke halaman saldo (SPA navigation)
  const btnGotoSaldo = document.getElementById("btn-goto-saldo");
  if (btnGotoSaldo) {
    btnGotoSaldo.addEventListener("click", (e) => {
      e.preventDefault();
      navigateTo("/saldo");
    });
  }

  // Toggle sembunyikan / tampilkan Total Saldo
  const btnToggleHideSaldo = document.getElementById("btn-toggle-hide-saldo");
  if (btnToggleHideSaldo) {
    btnToggleHideSaldo.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      const currentHidden = localStorage.getItem("myfinance_hide_saldo") === "true";
      localStorage.setItem("myfinance_hide_saldo", String(!currentHidden));
      renderDashboard();
    });
  }

  // Touch/Click seluruh card Total Saldo
  const cardTotalSaldo = document.getElementById("card-total-saldo");
  if (cardTotalSaldo) {
    cardTotalSaldo.addEventListener("click", (e) => {
      if (e.target.closest('#btn-adjust-balance') || e.target.closest('#btn-goto-saldo') || e.target.closest('#btn-toggle-hide-saldo')) return;
      if (stats.hasAccounts) {
        navigateTo("/saldo");
      } else {
        openAdjustBalanceModal(stats.balance, () => renderDashboard());
      }
    });
  }

  // Touch/Click card Pemasukan & Pengeluaran -> Navigasi ke Halaman Laporan
  const cardPemasukan = document.getElementById("card-pemasukan");
  if (cardPemasukan) {
    cardPemasukan.addEventListener("click", () => {
      navigateTo("/laporan");
    });
  }

  const cardPengeluaran = document.getElementById("card-pengeluaran");
  if (cardPengeluaran) {
    cardPengeluaran.addEventListener("click", () => {
      navigateTo("/laporan");
    });
  }

  // Init Smart AI Input Component
  initSmartAiInputEvents(() => renderDashboard());

  // Aktifkan sticky header di mobile
  initStickyHeader();

  // Init Slider Dots untuk Mobile Stats Cards
  initStatsCardsSliderDots();
}

function initStatsCardsSliderDots() {
  const slider = document.querySelector(".stats-cards");
  const dotsContainer = document.getElementById("stats-slider-dots");
  if (!slider || !dotsContainer) return;

  const dots = dotsContainer.querySelectorAll(".dot");
  const cards = [
    document.getElementById("card-total-saldo"),
    document.getElementById("card-pemasukan"),
    document.getElementById("card-pengeluaran"),
  ].filter(Boolean);

  if (!dots.length || !cards.length) return;

  const updateDots = () => {
    const sliderRect = slider.getBoundingClientRect();
    const sliderCenter = sliderRect.left + sliderRect.width / 2;
    let activeIndex = 0;
    let minDistance = Infinity;

    cards.forEach((card, i) => {
      const cardRect = card.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      const distance = Math.abs(sliderCenter - cardCenter);
      if (distance < minDistance) {
        minDistance = distance;
        activeIndex = i;
      }
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === activeIndex);
    });
  };

  slider.addEventListener("scroll", updateDots, { passive: true });
  updateDots();

  dots.forEach((dot, i) => {
    dot.addEventListener("click", () => {
      if (cards[i]) {
        cards[i].scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    });
  });
}

function renderBudgetWidget() {
  const container = document.getElementById("budget-widget-content");
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
  store.transactions.forEach((tx) => {
    const d = new Date(tx.tanggal);
    if (
      d.getMonth() === currentMonth &&
      d.getFullYear() === currentYear &&
      tx.type === "expense"
    ) {
      spendingByCategory[tx.kategori] =
        (spendingByCategory[tx.kategori] || 0) + Math.abs(tx.harga);
    }
  });

  // Tampilkan max 3 anggaran
  const topBudgets = store.budgets.slice(0, 3);

  let html = "";
  topBudgets.forEach((b, index) => {
    const spent = spendingByCategory[b.category] || 0;
    const percent = b.amount > 0 ? (spent / b.amount) * 100 : 0;
    const roundedPercent = Math.round(percent);

    // Tentukan warna progress bar
    let colorClass = "bg-green";
    if (percent > 90) colorClass = "bg-red";
    else if (percent > 70) colorClass = "bg-orange";

    html += `
      <div class="budget-item ${index > 0 ? "mt-md" : ""}">
        <div class="budget-header">
          <span class="budget-name">${b.category}</span>
          <span class="budget-percent" style="color: ${percent > 90 ? "var(--red)" : percent > 70 ? "var(--orange)" : "var(--text-main)"}">${roundedPercent}%</span>
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
  const container = document.getElementById("saving-widget-content");
  if (!container) {
    if (savingInterval) clearInterval(savingInterval);
    return;
  }

  const activeSavings = store.savings.filter((s) => !s.isDone);

  if (activeSavings.length === 0) {
    container.innerHTML = `
      <div style="height: 105px; display: flex; flex-direction: column; justify-content: center;">
        <p class="text-white-dim mb-0" style="font-size: 0.875rem;">Belum ada wishlist. Mari buat target baru!</p>
      </div>
    `;
    return;
  }

  // Guard: reset index if out of bounds after deletion/completion
  if (currentSavingIndex >= activeSavings.length) {
    currentSavingIndex = 0;
  }

  const saving = activeSavings[currentSavingIndex];
  const percent = Math.min((saving.current / saving.target) * 100, 100);

  container.style.opacity = "0";
  container.style.transform = "translateY(6px)";

  setTimeout(() => {
    container.innerHTML = `
      <div style="height: 105px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <p class="text-white-dim" style="font-size: 0.875rem; margin-bottom: 0.25rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 82%;" title="${escapeHtml(saving.name)}">${escapeHtml(saving.name)}</p>
          <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 8px; flex-wrap: nowrap;">
            <h2 class="text-white" style="font-size: clamp(1rem, 2.5vw, 1.25rem); font-weight: 700; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${formatRupiah(saving.current)}
            </h2>
            <span class="text-xs text-white-dim font-normal" style="opacity: 0.85; white-space: nowrap; flex-shrink: 0;">
              / ${formatRupiah(saving.target)}
            </span>
          </div>
        </div>
        <div style="margin-top: 0.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; font-size: 0.75rem;">
            <span class="text-white-dim" style="opacity: 0.8;">Terkumpul</span>
            <span class="text-white font-bold">${Math.round(percent)}%</span>
          </div>
          <div class="progress-bar-container bg-white-dim" style="height: 7px; margin: 0;">
            <div class="progress-bar bg-white" style="width: ${percent}%;"></div>
          </div>
        </div>
      </div>
    `;
    container.style.opacity = "1";
    container.style.transform = "translateY(0)";
  }, 250);

  currentSavingIndex = (currentSavingIndex + 1) % activeSavings.length;
}
