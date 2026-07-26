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
 * Mengaktifkan sticky header yang responsif di mobile.
 * Menambahkan class 'scrolled' ke .header saat halaman digulir > threshold.
 * Aman dipanggil berkali-kali saat page re-render (listener lama dibersihkan).
 *
 * @param {number} threshold - Jarak scroll (px) sebelum efek aktif. Default: 10px.
 */
export function initStickyHeader(threshold = 10) {
  // Hanya jalankan di mobile
  if (window.innerWidth > 768) return;

  const header = document.querySelector('.header');
  if (!header) return;

  // Cleanup listener lama agar tidak numpuk saat page re-render
  if (header._stickyScrollHandler) {
    window.removeEventListener('scroll', header._stickyScrollHandler, { passive: true });
  }

  const handler = () => {
    if (window.scrollY > threshold) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  // Simpan referensi ke handler agar bisa di-cleanup nanti
  header._stickyScrollHandler = handler;
  window.addEventListener('scroll', handler, { passive: true });

  // Jalankan sekali untuk state awal (misal user refresh di tengah halaman)
  handler();
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
