import { navigateTo } from '../router.js';

export function renderError404() {
  const container = document.getElementById('page-content');
  if (!container) return;

  container.innerHTML = `
    <div class="error-container">
      <div class="error-illustration">
        <svg viewBox="0 0 280 240" fill="none" xmlns="http://www.w3.org/2000/svg" class="error-svg">
          <!-- Ground Shadow -->
          <ellipse cx="140" cy="215" rx="60" ry="8" fill="url(#shadow-gradient)" class="shadow-pulse" />
          
          <!-- Holographic / Glowing beams -->
          <path d="M100 215 L140 100 L180 215 Z" fill="url(#beam-gradient)" opacity="0.12" />

          <!-- Sparkles / Stars with wrapped translation to protect CSS scale animations -->
          <g transform="translate(60, 60)">
            <g class="sparkle sparkle-1">
              <path d="M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2 Z" fill="#F59E0B" />
            </g>
          </g>
          <g transform="translate(220, 80)">
            <g class="sparkle sparkle-2">
              <path d="M0 -6 L1.5 -1.5 L6 0 L1.5 1.5 L0 6 L-1.5 1.5 L-6 0 L-1.5 -1.5 Z" fill="var(--primary)" />
            </g>
          </g>
          <g transform="translate(190, 40)">
            <g class="sparkle sparkle-3">
              <path d="M0 -5 L1 -1 L5 0 L1 1 L0 5 L-1 1 L-5 0 L-1 -1 Z" fill="#10B981" />
            </g>
          </g>

          <!-- Floating 4-0-4 digits wrapped in static translations (fill is controlled by theme CSS) -->
          <!-- Left '4' -->
          <g transform="translate(35, 140)">
            <g class="float-digit-1">
              <text x="0" y="0" font-size="76" font-weight="800" font-family="'Poppins', sans-serif" style="filter: drop-shadow(0 8px 16px rgba(14,165,233,0.15));">4</text>
            </g>
          </g>
          
          <!-- Right '4' -->
          <g transform="translate(185, 140)">
            <g class="float-digit-3">
              <text x="0" y="0" font-size="76" font-weight="800" font-family="'Poppins', sans-serif" style="filter: drop-shadow(0 8px 16px rgba(14,165,233,0.15));">4</text>
            </g>
          </g>

          <!-- Gradients definitions -->
          <defs>
            <linearGradient id="digit-gradient-light" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#82bfe8" />
              <stop offset="100%" stop-color="#0a6ca1" />
            </linearGradient>
            <linearGradient id="digit-gradient-dark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#7C3AED" />
              <stop offset="100%" stop-color="#4C1D95" />
            </linearGradient>
            <radialGradient id="shadow-gradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#000000" stop-opacity="0.15" />
              <stop offset="100%" stop-color="#000000" stop-opacity="0" />
            </radialGradient>
            <linearGradient id="beam-gradient" x1="140" y1="100" x2="140" y2="215" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.8" />
              <stop offset="100%" stop-color="var(--primary)" stop-opacity="0" />
            </linearGradient>
          </defs>
        </svg>
        
        <!-- Premium 3D Looping WebM Coin Video -->
        <video src="/assets/coin.webm" autoplay loop muted playsinline class="error-coin-video"></video>
      </div>
      
      <h2 class="error-title">Waduh, Halaman Tidak Ditemukan!</h2>
      <p class="error-description">Sepertinya halaman yang Anda cari salah, tidak tersedia, atau telah dipindahkan ke halaman lain.</p>
      
      <button class="error-btn" id="btn-back-dashboard">
        <i class="ph ph-house"></i> Kembali ke Dashboard
      </button>
    </div>
  `;

  // Attach event listener
  document.getElementById('btn-back-dashboard')?.addEventListener('click', () => {
    navigateTo('/dashboard');
  });
}
