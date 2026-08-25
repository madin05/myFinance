import { getFinancialRange } from "../utils.js";

/**
 * Calculates date bounds based on preset filter and financial start day
 */
export function calculateDateRange(preset, baseDate, startDay = 1) {
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
export function renderEmptyChartState(message) {
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
