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

export function getTransaksiSkeleton() {
  return `
    <div class="transactions-section">
      <div class="section-header" style="flex-wrap: wrap; gap: 1rem;">
        <div class="skeleton" style="width: 220px; height: 32px; border-radius: 10px;"></div>
        <div style="display: flex; gap: 1rem; align-items: center;">
          <div class="skeleton" style="width: 44px; height: 44px; border-radius: 12px;"></div>
          <div class="skeleton" style="width: 120px; height: 44px; border-radius: 12px;"></div>
        </div>
      </div>

      <div class="table-container">
        <div class="skeleton" style="height: 40px; width: 100%; border-radius: 10px;"></div>
        <div style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1.5rem;">
          ${Array(8).fill(`<div class="skeleton" style="height: 64px; width: 100%; border-radius: 14px;"></div>`).join('')}
        </div>
      </div>
    </div>
  `;
}

export function getAnggaranSkeleton() {
  return `
    <div class="budget-section">
      <div class="section-header">
        <div>
          <div class="skeleton" style="width: 220px; height: 32px; border-radius: 10px; margin-bottom: 10px;"></div>
          <div class="skeleton" style="width: 240px; height: 18px; border-radius: 8px;"></div>
        </div>
        <div class="skeleton" style="width: 160px; height: 44px; border-radius: 12px;"></div>
      </div>

      <div class="budget-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.5rem; margin-top: 1.5rem;">
        ${Array(6).fill(`
          <div class="stat-card skeleton" style="height: 190px; border-radius: 24px; border: none;"></div>
        `).join('')}
      </div>
    </div>
  `;
}

export function getTabunganSkeleton(viewMode = 'grid') {
  const safeMode = viewMode === 'list' ? 'list' : 'grid';

  return `
    <div class="section-header">
      <div>
        <div class="skeleton" style="width: 240px; height: 32px; border-radius: 10px; margin-bottom: 10px;"></div>
        <div class="skeleton" style="width: 320px; height: 18px; border-radius: 8px;"></div>
      </div>
      <div style="display: flex; gap: 1rem; align-items: center;">
        <div class="skeleton" style="width: 90px; height: 40px; border-radius: 12px;"></div>
        <div class="skeleton" style="width: 170px; height: 44px; border-radius: 12px;"></div>
      </div>
    </div>

    ${
      safeMode === 'grid'
        ? `
          <div class="wishlist-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.5rem; margin-top: 1.5rem;">
            ${Array(6).fill(`<div class="stat-card skeleton" style="height: 220px; border-radius: 24px; border: none;"></div>`).join('')}
          </div>
        `
        : `
          <div class="wishlist-list" style="display: flex; flex-direction: column; gap: 1.25rem; margin-top: 1.5rem;">
            ${Array(8).fill(`
              <div class="stat-card" style="padding: 1.5rem 2rem; border-radius: 24px;">
                <div style="display: flex; align-items: center; gap: 1.25rem;">
                  <div class="skeleton" style="width: 60px; height: 60px; border-radius: 16px;"></div>
                  <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; gap: 1rem; margin-bottom: 10px;">
                      <div class="skeleton" style="width: 220px; height: 18px; border-radius: 9px;"></div>
                      <div class="skeleton" style="width: 56px; height: 18px; border-radius: 9px;"></div>
                    </div>
                    <div class="skeleton" style="width: 260px; height: 14px; border-radius: 8px; margin-bottom: 14px;"></div>
                    <div class="skeleton" style="height: 12px; width: 100%; border-radius: 999px;"></div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <div class="skeleton" style="width: 90px; height: 36px; border-radius: 12px;"></div>
                    <div class="skeleton" style="width: 36px; height: 36px; border-radius: 12px;"></div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        `
    }
  `;
}

export function getLaporanSkeleton() {
  return `
    <div class="section-header">
      <div>
        <div class="skeleton" style="width: 220px; height: 32px; border-radius: 10px; margin-bottom: 10px;"></div>
        <div class="skeleton" style="width: 360px; height: 18px; border-radius: 8px;"></div>
      </div>
      <div style="display: flex; gap: 1rem;">
        <div class="skeleton" style="width: 140px; height: 44px; border-radius: 12px;"></div>
        <div class="skeleton" style="width: 140px; height: 44px; border-radius: 12px;"></div>
      </div>
    </div>

    <div class="bottom-grid mt-lg">
      <div class="transactions-section" style="border-radius: 24px;">
        <div class="skeleton" style="width: 240px; height: 22px; border-radius: 8px; margin-bottom: 1.5rem;"></div>
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          ${Array(3).fill(`
            <div style="display: flex; align-items: center; gap: 1.25rem;">
              <div class="skeleton" style="width: 56px; height: 56px; border-radius: 16px;"></div>
              <div style="flex: 1;">
                <div class="skeleton" style="width: 180px; height: 16px; border-radius: 8px; margin-bottom: 10px;"></div>
                <div class="skeleton" style="width: 220px; height: 28px; border-radius: 10px;"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="transactions-section" style="border-radius: 24px;">
        <div class="skeleton" style="width: 220px; height: 22px; border-radius: 8px; margin-bottom: 1.5rem;"></div>
        <div style="display: flex; flex-direction: column; gap: 1.25rem;">
          ${Array(6).fill(`
            <div>
              <div style="display: flex; justify-content: space-between; gap: 1rem; margin-bottom: 0.6rem;">
                <div class="skeleton" style="width: 160px; height: 16px; border-radius: 8px;"></div>
                <div class="skeleton" style="width: 120px; height: 16px; border-radius: 8px;"></div>
              </div>
              <div class="skeleton" style="height: 8px; width: 100%; border-radius: 999px;"></div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

export function getAkunSkeleton() {
  return `
    <div class="account-settings">
      <div class="section-header">
        <div>
          <div class="skeleton" style="width: 260px; height: 32px; border-radius: 10px; margin-bottom: 10px;"></div>
          <div class="skeleton" style="width: 340px; height: 18px; border-radius: 8px;"></div>
        </div>
      </div>

      <div class="account-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 1.5rem; margin-top: 1.5rem;">
        <!-- Left Column Skeletons -->
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          <div class="stat-card skeleton" style="height: 320px; border-radius: 24px; border: none;"></div>
          <div class="stat-card skeleton" style="height: 140px; border-radius: 24px; border: none;"></div>
        </div>

        <!-- Right Column Skeletons -->
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          <div class="stat-card skeleton" style="height: 380px; border-radius: 24px; border: none;"></div>
          <div class="stat-card skeleton" style="height: 160px; border-radius: 24px; border: none;"></div>
        </div>
      </div>
    </div>
  `;
}
