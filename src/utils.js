export function showLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
  }
}

export function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.style.display = 'none';
  }
}

/**
 * Sticky header dinonaktifkan atas permintaan user (header tetap di atas saat scroll).
 * Fungsi dipertahankan untuk kompatibilitas panggilan di main.js & halaman lain.
 */
export function initStickyHeader() {
  const header = document.querySelector('.header');
  if (header) {
    if (header._stickyScrollHandler) {
      window.removeEventListener('scroll', header._stickyScrollHandler);
      header._stickyScrollHandler = null;
    }
    header.classList.remove('scrolled');
  }
}


/**
 * Mendapatkan rentang tanggal periode keuangan berdasarkan tanggal gajian
 * @param {Date} date - Tanggal acuan (biasanya New Date())
 * @param {number} startDay - Tanggal mulai periode (1-31)
 */
export function getFinancialRange(date, startDay = 1) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();

  let start, end;

  if (startDay <= 1) {
    // Standar: Tanggal 1 sampai akhir bulan
    start = new Date(year, month, 1, 0, 0, 0);
    end = new Date(year, month + 1, 0, 23, 59, 59);
  } else {
    // Custom: Misal tanggal 25
    if (day < startDay) {
      // Masuk ke periode yang mulai bulan lalu
      start = new Date(year, month - 1, startDay, 0, 0, 0);
      end = new Date(year, month, startDay - 1, 23, 59, 59);
    } else {
      // Masuk ke periode yang mulai bulan ini
      start = new Date(year, month, startDay, 0, 0, 0);
      end = new Date(year, month + 1, startDay - 1, 23, 59, 59);
    }
  }

  return { start, end };
}

/**
 * Mencegah fungsi dipanggil berturut-turut dalam waktu singkat (Debounce).
 * Sangat berguna untuk optimasi input search atau tombol submit.
 * 
 * @param {Function} func - Fungsi yang ingin dieksekusi.
 * @param {number} delay - Waktu penundaan dalam milidetik (ms). default: 300ms.
 * @returns {Function} - Fungsi yang sudah di-debounce.
 */
export function debounce(func, delay = 300) {
  let timeoutId;
  return function (...args) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

/**
 * Sanitisasi string HTML untuk mencegah XSS (Cross-Site Scripting).
 * @param {string} str - Text mentah dari user/API
 * @returns {string} - Text tersanitasi aman dipasang ke innerHTML
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Mendapatkan URL icon SVG berdasarkan nama kategori transaksi dan tipe (income/expense)
 * @param {string} kategori - Nama kategori transaksi
 * @param {string} [type] - Tipe transaksi ('income' / 'expense')
 * @returns {string} - Path URL icon SVG
 */
export function getCategoryIconUrl(kategori, type = null) {
  const k = (kategori || '').toLowerCase();

  // Check Transfer Antar Akun
  if (type === 'transfer' || k.includes('transfer') || k.includes('pindah')) {
    return '/assets/investment.svg';
  }

  // Check Investasi lebih awal jika ada kata kunci investasi/dividen
  if (k.includes('invest') || k.includes('saham') || k.includes('reksa') || k.includes('kripto') || k.includes('crypto') || k.includes('emas') || k.includes('tabungan') || k.includes('dividen') || k.includes('profit')) {
    return '/assets/investment.svg';
  }

  // Check Gaji / Pendapatan / Salary / Income
  if (type === 'income' || k.includes('gaji') || k.includes('salary') || k.includes('income') || k.includes('masuk') || k.includes('pendapatan') || k.includes('pemasukan') || k.includes('bonus') || k.includes('freelance') || k.includes('thr') || k.includes('upah') || k.includes('proyek') || k.includes('hadiah')) {
    return '/assets/salary.svg';
  }

  // Check Makanan & Minuman
  if (k.includes('makan') || k.includes('minum') || k.includes('food') || k.includes('kuliner') || k.includes('resto') || k.includes('jajan') || k.includes('cafe') || k.includes('kopi')) {
    return '/assets/food.svg';
  }

  // Check Transportasi
  if (k.includes('transport') || k.includes('bensin') || k.includes('ojek') || k.includes('grab') || k.includes('gojek') || k.includes('parkir') || k.includes('kendaraan') || k.includes('tol') || k.includes('servis') || k.includes('bbm')) {
    return '/assets/transport.svg';
  }

  // Check Tagihan
  if (k.includes('tagihan') || k.includes('bill') || k.includes('listrik') || k.includes('air') || k.includes('wifi') || k.includes('internet') || k.includes('pulsa') || k.includes('sewa') || k.includes('kos') || k.includes('pajak') || k.includes('cicilan') || k.includes('angsuran') || k.includes('denda') || k.includes('bpjs')) {
    return '/assets/bill.svg';
  }

  // Check Belanja
  if (k.includes('belanja') || k.includes('shop') || k.includes('baju') || k.includes('groceries') || k.includes('supermarket') || k.includes('mall') || k.includes('toko') || k.includes('pakaian')) {
    return '/assets/shopping.svg';
  }

  // Check Hiburan
  if (k.includes('hiburan') || k.includes('entertain') || k.includes('bioskop') || k.includes('game') || k.includes('nonton') || k.includes('liburan') || k.includes('rekreasi') || k.includes('hobi') || k.includes('film') || k.includes('musik')) {
    return '/assets/entertaint.svg';
  }

  // Check Kesehatan
  if (k.includes('sehat') || k.includes('healthy') || k.includes('obat') || k.includes('dokter') || k.includes('rumah sakit') || k.includes('apotek') || k.includes('skincare') || k.includes('kesehatan') || k.includes('fitnes') || k.includes('gym')) {
    return '/assets/healthy.svg';
  }

  // Check Pendidikan
  if (k.includes('didik') || k.includes('edukasi') || k.includes('education') || k.includes('sekolah') || k.includes('kuliah') || k.includes('kursus') || k.includes('buku') || k.includes('spp') || k.includes('pendidikan') || k.includes('les')) {
    return '/assets/education.svg';
  }

  // Default fallback berdasarkan type
  if (type === 'income') return '/assets/salary.svg';
  return '/assets/shopping.svg';
}

/**
 * Mengaktifkan gesture geser ke bawah (swipe-down to dismiss) pada bottom sheet modal di mobile.
 * Dipanggil secara otomatis via observer saat modal muncul di DOM.
 */
export function initBottomSheetSwipe() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;

        let sheet = null;
        let overlay = null;

        if (node.classList?.contains('modal-content') || node.classList?.contains('detail-tx-content') || node.classList?.contains('custom-alert-card') || node.classList?.contains('quick-action-card')) {
          sheet = node;
          overlay = node.closest('.modal-overlay, .detail-tx-overlay, .custom-alert-overlay') || node.parentElement;
        } else {
          sheet = node.querySelector?.('.modal-content, .detail-tx-content, .custom-alert-card, .quick-action-card');
          overlay = node.classList?.contains('modal-overlay') || node.classList?.contains('detail-tx-overlay') || node.classList?.contains('custom-alert-overlay') ? node : node.querySelector?.('.modal-overlay, .detail-tx-overlay, .custom-alert-overlay');
        }

        if (sheet && !sheet._swipeInit) {
          sheet._swipeInit = true;
          attachSwipeDownToSheet(sheet, overlay);
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

function attachSwipeDownToSheet(sheet, overlay) {
  let startY = 0;
  let currentY = 0;
  let isDragging = false;

  const getCloseBtn = () => {
    return sheet.querySelector('.modal-close, #close-quick-action, #btn-cancel-modal, #btn-cancel-confirm, #btn-cancel-adjust, #btn-cancel-edit-name, #btn-cancel-delete, #btn-close-detail-tx-footer, #btn-cancel-pwd, #close-detail-tx, #close-saldo-modal, #close-anggaran-modal, #close-wishlist-modal, #btn-close-calc') ||
           overlay?.querySelector('.modal-close, #close-quick-action, #btn-cancel-modal, #btn-cancel-confirm, #btn-cancel-adjust, #btn-cancel-edit-name, #btn-cancel-delete, #btn-close-detail-tx-footer, #btn-cancel-pwd, #close-detail-tx, #close-saldo-modal, #close-anggaran-modal, #close-wishlist-modal, #btn-close-calc');
  };

  const getScrollableEl = () => {
    const el = sheet.querySelector('.modal-body, form');
    return (el && el.scrollHeight > el.clientHeight + 5) ? el : sheet;
  };

  const onTouchStart = (e) => {
    if (window.innerWidth > 768) return;
    const scrollEl = getScrollableEl();
    if (scrollEl && scrollEl.scrollTop > 5) return;

    const touch = e.touches[0];
    startY = touch.clientY;
    currentY = startY;
    isDragging = true;
    sheet.style.transition = 'none';
  };

  const onTouchMove = (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const deltaY = touch.clientY - startY;

    if (deltaY > 0) {
      currentY = touch.clientY;
      sheet.style.transform = `translateY(${deltaY}px)`;
      if (e.cancelable) e.preventDefault();
    } else {
      isDragging = false;
      sheet.style.transform = '';
    }
  };

  const onTouchEnd = () => {
    if (!isDragging) return;
    isDragging = false;

    const deltaY = currentY - startY;
    if (deltaY > 70) {
      sheet.style.transition = 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)';
      sheet.style.transform = 'translateY(100%)';
      if (overlay) {
        overlay.style.transition = 'opacity 0.28s ease';
        overlay.style.opacity = '0';
      }

      const closeBtn = getCloseBtn();
      setTimeout(() => {
        if (closeBtn) {
          closeBtn.click();
        } else if (overlay) {
          overlay.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        } else {
          sheet.remove();
        }
      }, 280);
    } else {
      sheet.style.transition = 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)';
      sheet.style.transform = '';
    }
  };

  sheet.addEventListener('touchstart', onTouchStart, { passive: true });
  sheet.addEventListener('touchmove', onTouchMove, { passive: false });
  sheet.addEventListener('touchend', onTouchEnd);
}
