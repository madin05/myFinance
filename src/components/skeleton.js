export function getDashboardSkeleton() {
  return `
    <!-- Top Cards -->
    <div class="stats-cards">
      <div class="stat-card skeleton" style="height: 180px; border-radius: 20px; border: none;"></div>
      <div class="stat-card skeleton" style="height: 180px; border-radius: 20px; border: none;"></div>
      <div class="stat-card skeleton" style="height: 180px; border-radius: 20px; border: none;"></div>
    </div>

    <!-- Bottom Section -->
    <div class="bottom-grid">
      <!-- Left: Transaksi Terakhir -->
      <div class="transactions-section skeleton" style="height: 500px; border-radius: 24px; border: none;"></div>
      
      <!-- Right: Widgets -->
      <div class="widgets-section" style="display: flex; flex-direction: column; gap: 1.5rem;">
        <div class="widget-card skeleton" style="height: 240px; border-radius: 20px; border: none;"></div>
        <div class="widget-card skeleton" style="height: 240px; border-radius: 20px; border: none;"></div>
      </div>
    </div>
  `;
}

export function getTableSkeleton() {
  return `
    <div class="transactions-section" style="border-radius: 24px; padding: 2rem;">
      <div class="section-header" style="margin-bottom: 2rem;">
        <div class="skeleton" style="width: 200px; height: 32px; border-radius: 8px;"></div>
        <div style="display: flex; gap: 1rem;">
          <div class="skeleton" style="width: 44px; height: 44px; border-radius: 12px;"></div>
          <div class="skeleton" style="width: 120px; height: 44px; border-radius: 12px;"></div>
        </div>
      </div>
      <div class="table-container">
        <div class="skeleton" style="height: 40px; width: 100%; border-radius: 8px; mb-md"></div>
        <div style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1.5rem;">
          ${Array(6).fill(`<div class="skeleton" style="height: 60px; width: 100%; border-radius: 12px;"></div>`).join('')}
        </div>
      </div>
    </div>
  `;
}
