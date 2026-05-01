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
