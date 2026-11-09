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

export function getSaldoSkeleton() {
  return `
    <div class="saldo-section">
      <div class="section-header">
        <div>
          <div class="skeleton" style="width: 220px; height: 32px; border-radius: 10px; margin-bottom: 10px;"></div>
          <div class="skeleton" style="width: 240px; height: 18px; border-radius: 8px;"></div>
        </div>
        <div class="skeleton" style="width: 160px; height: 44px; border-radius: 12px;"></div>
      </div>

      <div class="saldo-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.5rem; margin-top: 1.5rem;">
        ${Array(4).fill(`
          <div class="stat-card skeleton" style="height: 160px; border-radius: 24px; border: none;"></div>
        `).join('')}
      </div>
    </div>
  `;
}

export function getLaporanSkeleton() {
  return `
    <div class="section-header" style="flex-wrap: wrap; gap: 1.5rem; margin-bottom: 2rem;">
      <div>
        <div class="skeleton" style="width: 220px; height: 32px; border-radius: 10px; margin-bottom: 10px;"></div>
        <div class="skeleton" style="width: 280px; height: 18px; border-radius: 8px;"></div>
      </div>
      <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
        <div class="skeleton" style="width: 240px; height: 44px; border-radius: 12px;"></div>
        <div class="skeleton" style="width: 130px; height: 44px; border-radius: 12px;"></div>
      </div>
    </div>

    <!-- Visual Analysis Grid (Top Charts) -->
    <div class="visual-analysis" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
      <!-- Chart 1: Analisis Pengeluaran -->
      <div class="stat-card" style="padding: 1.5rem;">
        <div class="skeleton" style="width: 180px; height: 24px; border-radius: 8px; margin-bottom: 1.5rem;"></div>
        <div style="height: 250px; display: flex; align-items: center; justify-content: center; position: relative;">
          <div class="skeleton skeleton-circle" style="width: 170px; height: 170px; border-radius: 50%;"></div>
        </div>
      </div>

      <!-- Chart 2: Tren Arus Kas -->
      <div class="stat-card" style="padding: 1.5rem;">
        <div class="skeleton" style="width: 160px; height: 24px; border-radius: 8px; margin-bottom: 1.5rem;"></div>
        <div style="height: 250px; display: flex; flex-direction: column; justify-content: flex-end; gap: 12px; padding: 10px 0;">
          <div class="skeleton" style="height: 40%; width: 100%; border-radius: 12px;"></div>
          <div class="skeleton" style="height: 25%; width: 100%; border-radius: 12px;"></div>
        </div>
      </div>
    </div>

    <!-- Bottom Grid -->
    <div class="bottom-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; align-items: start;">
      <!-- Card 1: Ringkasan Periode -->
      <div class="stat-card" style="padding: 2rem;">
        <div class="skeleton" style="width: 180px; height: 24px; border-radius: 8px; margin-bottom: 2rem;"></div>
        <div style="display: flex; flex-direction: column; gap: 2rem;">
          ${Array(3).fill(`
            <div style="display: flex; align-items: center; gap: 1.5rem;">
              <div class="skeleton" style="width: 52px; height: 52px; border-radius: 50%;"></div>
              <div style="flex: 1;">
                <div class="skeleton" style="width: 120px; height: 14px; border-radius: 6px; margin-bottom: 8px;"></div>
                <div class="skeleton" style="width: 160px; height: 26px; border-radius: 8px;"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Card 2: Rincian Kategori -->
      <div class="stat-card" style="padding: 2rem;">
        <div class="skeleton" style="width: 160px; height: 24px; border-radius: 8px; margin-bottom: 2rem;"></div>
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          ${Array(4).fill(`
            <div>
              <div style="display: flex; justify-content: space-between; gap: 1rem; margin-bottom: 0.6rem;">
                <div class="skeleton" style="width: 130px; height: 16px; border-radius: 6px;"></div>
                <div class="skeleton" style="width: 90px; height: 16px; border-radius: 6px;"></div>
              </div>
              <div class="skeleton" style="height: 10px; width: 100%; border-radius: 999px;"></div>
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
      <!-- Full-Width Hero Header Banner -->
      <div class="profile-hero-banner">
        <div class="profile-hero-glow glow-1"></div>
        <div class="profile-hero-glow glow-2"></div>
        <div class="profile-hero-header">
          <span class="profile-hero-badge" style="border: 1px solid rgba(255, 255, 255, 0.28); background: rgba(255, 255, 255, 0.2);">
            <div class="skeleton" style="width: 100px; height: 12px; border-radius: 100px;"></div>
          </span>
          <div class="skeleton" style="width: 180px; height: 26px; border-radius: 8px; margin-top: 6px;"></div>
        </div>
      </div>

      <div class="account-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(350px, 100%), 1fr)); gap: 1.5rem; margin-top: 1.5rem; align-items: start;">
        
        <!-- Section 1: Profile Preview & Identity Card -->
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          <div class="stat-card profile-card">
            <div class="profile-card-body">
              <div class="avatar-wrapper">
                <div class="avatar-skeleton-circle">
                  <div class="skeleton skeleton-circle" style="width: 100%; height: 100%;"></div>
                </div>
              </div>

              <!-- Username & Edit Icon Skeleton -->
              <div style="display: flex; justify-content: center; align-items: center; gap: 8px; margin: 0.15rem 0 0.35rem;">
                <div class="skeleton" style="width: 130px; height: 24px; border-radius: 6px;"></div>
                <div class="skeleton" style="width: 22px; height: 22px; border-radius: 6px;"></div>
              </div>

              <!-- Email Skeleton -->
              <div style="display: flex; justify-content: center; margin-bottom: 1.15rem;">
                <div class="skeleton" style="width: 170px; height: 15px; border-radius: 6px;"></div>
              </div>
              
              <!-- Metadata Quick Stats (3 Columns) -->
              <div class="profile-meta-grid">
                <div class="profile-meta-col" style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
                  <div class="skeleton" style="width: 48px; height: 11px; border-radius: 4px;"></div>
                  <div class="skeleton" style="width: 72px; height: 15px; border-radius: 4px;"></div>
                </div>
                <div class="profile-meta-col border-divider" style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
                  <div class="skeleton" style="width: 38px; height: 11px; border-radius: 4px;"></div>
                  <div class="skeleton" style="width: 48px; height: 15px; border-radius: 4px;"></div>
                </div>
                <div class="profile-meta-col" style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
                  <div class="skeleton" style="width: 28px; height: 11px; border-radius: 4px;"></div>
                  <div class="skeleton" style="width: 48px; height: 15px; border-radius: 4px;"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Section 2: Security & Danger Zone Cards -->
        <div style="display: flex; flex-direction: column; gap: 1.5rem; position: relative;">
          <!-- Akses Keamanan -->
          <div class="stat-card" style="padding: 2rem;">
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 1.5rem;">
              <div class="skeleton" style="width: 22px; height: 22px; border-radius: 6px;"></div>
              <div class="skeleton" style="width: 130px; height: 20px; border-radius: 6px;"></div>
            </div>
            
            <div style="margin-bottom: 2rem; border-bottom: 1px solid var(--border); padding-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
              <div class="skeleton" style="width: 110px; height: 16px; border-radius: 4px;"></div>
              <div class="skeleton" style="width: 18px; height: 18px; border-radius: 4px;"></div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; flex-direction: column; gap: 6px;">
                <div class="skeleton" style="width: 160px; height: 16px; border-radius: 4px;"></div>
                <div class="skeleton" style="width: 210px; height: 12px; border-radius: 4px;"></div>
              </div>
              <div class="skeleton" style="width: 44px; height: 24px; border-radius: 100px;"></div>
            </div>
          </div>

          <!-- Danger Zone -->
          <div class="stat-card" style="padding: 2rem; border: 1.5px solid rgba(239, 68, 68, 0.15); background: rgba(239, 68, 68, 0.02);">
            <div class="skeleton" style="width: 95px; height: 18px; border-radius: 6px; margin-bottom: 0.5rem;"></div>
            <div class="skeleton" style="width: 90%; height: 13px; border-radius: 4px; margin-bottom: 0.35rem;"></div>
            <div class="skeleton" style="width: 60%; height: 13px; border-radius: 4px; margin-bottom: 1.25rem;"></div>
            <div class="skeleton" style="width: 100%; height: 48px; border-radius: 12px;"></div>
          </div>
        </div>

      </div>
    </div>
  `;
}

export function getAiSkeleton() {
  return `
    <div class="ai-page-skeleton" style="display: flex; gap: 1.25rem; height: calc(100vh - 140px);">
      <div class="skeleton" style="width: 280px; height: 100%; border-radius: 20px;"></div>
      <div class="skeleton" style="flex: 1; height: 100%; border-radius: 20px;"></div>
    </div>
  `;
}

