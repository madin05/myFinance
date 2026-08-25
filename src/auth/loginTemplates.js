/**
 * Generates the HTML layout for login, register, reset password, and OTP views.
 */
export function getLoginLayoutHtml(mode = 'login', pendingEmail = '', extraData = {}) {
  const isReg = mode === 'register';
  const isForgot = mode === 'forgot-password';
  const isVerified = mode === 'email-verified';
  const isVerifiedError = mode === 'email-verified-error';
  const isResetConfirm = mode === 'reset-password-confirm';
  const isVerifyOtp = mode === 'verify-otp';
  const isVerify2FAOtp = mode === 'verify-2fa-otp';

  return `
    <div class="login-container" id="login-parallax-container">
      
      <!-- BACKGROUND GLOWS -->
      <div class="glow-layer-1" style="position: absolute; left: -10%; top: -10%; width: 650px; height: 650px; border-radius: 50%; filter: blur(70px); pointer-events: none;"></div>
      <div class="glow-layer-2" style="position: absolute; right: -10%; bottom: -10%; width: 650px; height: 650px; border-radius: 50%; filter: blur(70px); pointer-events: none;"></div>

      <!-- DYNAMIC DRIFTING CLOUDS CONTAINER -->
      <div id="login-cloud-container" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; overflow: hidden; pointer-events: none; z-index: 1;"></div>

      <!-- MAIN SPLIT LAYOUT CONTAINER -->
      <div class="login-layout">
        
        <!-- FORM CARD SECTION (LEFT SIDE) -->
        <div class="login-card-wrapper">
          <div class="login-card">
            <!-- BRAND LOGO HEADER -->
            <div class="logo-icon">
              <img src="/assets/logo-navbar-light.svg" class="logo-light" alt="MyFinance" style="width: 100%;">
              <img src="/assets/logo-navbar-dark.svg" class="logo-dark" alt="MyFinance" style="width: 100%;">
            </div>

            ${(isVerifyOtp || isVerify2FAOtp) ? `
              <div style="text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1.25rem; padding: 0.5rem 0;">
                <div style="background: rgba(99, 102, 241, 0.1); color: var(--primary, #6366f1); width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.75rem; flex-shrink: 0;">
                  <i class="${isVerify2FAOtp ? 'ph ph-shield-check' : 'ph ph-envelope-open'}"></i>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 0.35rem;">
                  <h2 style="margin: 0; font-size: 1.3rem; text-align: center;">${isVerify2FAOtp ? 'Verifikasi 2-Langkah (2FA)' : 'Masukkan Kode OTP'}</h2>
                  <p style="color: var(--text-muted); font-size: 0.82rem; line-height: 1.55; margin: 0; text-align: center;">
                    Kode OTP 6-digit telah dikirim ke<br>
                    <strong style="color: var(--text-main);">${pendingEmail || extraData?.email || extraData?.emailMasked || ''}</strong>
                  </p>
                </div>

                <form id="otp-form" style="width: 100%;">
                  <div class="otp-input-group" style="display: flex; justify-content: center; gap: 8px; margin-bottom: 1.25rem;">
                    <input type="text" inputmode="numeric" maxlength="1" class="otp-input" data-otp-index="0" autocomplete="one-time-code" aria-label="Digit 1">
                    <input type="text" inputmode="numeric" maxlength="1" class="otp-input" data-otp-index="1" aria-label="Digit 2">
                    <input type="text" inputmode="numeric" maxlength="1" class="otp-input" data-otp-index="2" aria-label="Digit 3">
                    <input type="text" inputmode="numeric" maxlength="1" class="otp-input" data-otp-index="3" aria-label="Digit 4">
                    <input type="text" inputmode="numeric" maxlength="1" class="otp-input" data-otp-index="4" aria-label="Digit 5">
                    <input type="text" inputmode="numeric" maxlength="1" class="otp-input" data-otp-index="5" aria-label="Digit 6">
                  </div>

                  <div id="otp-error-msg" style="color: #ef4444; font-size: 0.8rem; text-align: center; margin-bottom: 0.75rem; min-height: 1.2em;"></div>

                  <button type="submit" id="btn-verify-otp" class="btn btn-primary btn-full" style="height: 48px; border-radius: 8px; font-size: 0.9rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    ${isVerify2FAOtp ? 'Verifikasi 2FA' : 'Verifikasi Kode'}
                  </button>
                </form>

                <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem; width: 100%;">
                  <p id="otp-countdown-text" style="color: var(--text-muted); font-size: 0.8rem; margin: 0;">Kirim ulang kode dalam <strong id="otp-countdown-timer">60</strong> detik</p>
                  <button id="btn-resend-otp" class="btn btn-outline btn-full" style="height: 42px; border-radius: 8px; font-size: 0.82rem;" disabled>
                    Kirim Ulang Kode ${isVerify2FAOtp ? '2FA' : ''}
                  </button>
                  <a href="javascript:void(0)" id="btn-cancel-2fa" style="color: var(--text-muted); font-size: 0.8rem; margin-top: 4px; text-decoration: none;">Kembali ke Login</a>
                </div>
              </div>
            ` : isVerified ? `
              <div style="text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1.5rem; padding: 0.5rem 0;">
                <div class="email-verified-icon-wrapper">
                  <div class="email-verified-icon-ring"></div>
                  <div class="email-verified-icon-ring email-verified-icon-ring-2"></div>
                  <div class="email-verified-checkmark">
                    <svg viewBox="0 0 52 52" width="40" height="40" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="14 27 22 35 38 19"/>
                    </svg>
                  </div>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                  <h2 style="margin: 0; font-size: 1.4rem; text-align: center;">Email Terverifikasi!</h2>
                  <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.6; margin: 0; text-align: center;">
                    Akunmu sudah aktif dan siap digunakan.<br>
                    <strong style="color: var(--text-main);">Selamat bergabung di MyFinance!</strong>
                  </p>
                </div>

                <button id="btn-go-to-login" class="btn btn-primary btn-full" style="height: 48px; border-radius: 12px; font-size: 0.9rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 8px;">
                  <i class="ph ph-house"></i>
                  Lanjut ke Dashboard
                </button>
              </div>
            ` : isVerifiedError ? `
              <div style="text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1.25rem; padding: 0.5rem 0;">
                <div style="background: rgba(239, 68, 68, 0.12); color: #ef4444; width: 72px; height: 72px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; flex-shrink: 0;">
                  <i class="ph ph-warning-circle"></i>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                  <h2 style="margin: 0; font-size: 1.3rem; text-align: center;">Tautan Tidak Valid</h2>
                  <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.6; margin: 0; text-align: center;">
                    Tautan verifikasi sudah kedaluwarsa atau sudah pernah digunakan. Silakan minta tautan baru.
                  </p>
                </div>

                <button id="btn-request-new-link" class="btn btn-primary btn-full" style="height: 48px; border-radius: 12px; font-size: 0.85rem; font-weight: 700;">
                  Minta Tautan Baru
                </button>
                <a href="javascript:void(0)" id="btn-back-to-login-from-error" style="color: var(--text-muted); font-weight: 600; text-decoration: none; font-size: 0.85rem;">
                  Kembali ke Login
                </a>
              </div>
            ` : isForgot ? `
              <h2 style="text-align: center; margin-bottom: 0.5rem;">Reset Kata Sandi</h2>
              <p style="text-align: center; color: var(--text-muted); margin-bottom: 2rem; font-size: 0.85rem; line-height: 1.5;">
                Masukkan email Anda di bawah untuk menerima tautan reset kata sandi.
              </p>
              
              <form id="forgot-form">
                <div class="nebula-input">
                  <input type="email" id="forgot-email" class="input" placeholder=" " required>
                  <label class="user-label">Email</label>
                </div>
                <button type="submit" class="btn btn-primary btn-full mt-md" style="height: 48px; border-radius: 12px; font-size: 0.85rem; font-weight: 700;">
                  Kirim Tautan Reset
                </button>
              </form>

              <p style="text-align: center; margin-top: 1.5rem; font-size: 0.85rem; color: var(--text-muted);">
                <a href="javascript:void(0)" id="btn-back-to-login" style="color: var(--primary); font-weight: 700; text-decoration: none;">
                  Kembali ke Login
                </a>
              </p>
            ` : isResetConfirm ? `
              <h2 style="text-align: center; margin-bottom: 0.5rem;">Buat Kata Sandi Baru</h2>
              <p style="text-align: center; color: var(--text-muted); margin-bottom: 1.75rem; font-size: 0.88rem;">
                Silakan masukkan kata sandi baru untuk akun Anda.
              </p>
              
              <form id="confirm-reset-form">
                <div class="nebula-input">
                  <input type="password" id="reset-new-password" class="input" placeholder=" " required style="padding-right: 45px;">
                  <label class="user-label">Kata Sandi Baru</label>
                  <i class="ph ph-eye toggle-password" id="toggle-reset-password" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); cursor: pointer; color: var(--text-muted); z-index: 5;"></i>
                </div>
                <button type="submit" class="btn btn-primary btn-full" style="height: 48px; border-radius: 12px; font-size: 0.85rem; font-weight: 700;">
                  Simpan Kata Sandi Baru
                </button>
              </form>

              <p style="text-align: center; margin-top: 1.5rem; font-size: 0.85rem; color: var(--text-muted);">
                <a href="javascript:void(0)" id="btn-back-to-login-from-reset" style="color: var(--primary); font-weight: 700; text-decoration: none;">
                  Kembali ke Login
                </a>
              </p>
            ` : `
              <h2 style="text-align: center; margin-bottom: 0.35rem;">${isReg ? 'Buat Akun Baru' : 'Selamat Datang!'}</h2>
              <p style="text-align: center; color: var(--text-muted); margin-bottom: 1rem; font-size: 0.88rem;">
                ${isReg ? 'Bergabunglah untuk kelola keuangan lebih baik.' : 'Kelola keuanganmu lebih cerdas, instan & aman.'}
              </p>
              
              <form id="auth-form">
                ${isReg ? `
                  <div class="nebula-input">
                    <input type="text" id="reg-name" class="input" placeholder=" " required>
                    <label class="user-label">Nama Lengkap</label>
                  </div>
                ` : ''}
                <div class="nebula-input">
                  <input type="text" id="email" class="input" placeholder=" " required>
                  <label class="user-label">Username / Email</label>
                </div>
                <div class="nebula-input ${!isReg ? 'has-forgot-link' : ''}">
                  <input type="password" id="password" class="input" placeholder=" " required style="padding-right: 45px;">
                  <label class="user-label">Password</label>
                  ${!isReg ? `<a href="javascript:void(0)" id="btn-forgot-password" class="nebula-forgot-link">Lupa Password?</a>` : ''}
                  <button type="button" id="btn-toggle-password" class="nebula-toggle-btn">
                    <i class="ph ph-eye"></i>
                  </button>
                </div>
                ${isReg ? `
                  <div class="nebula-input">
                    <input type="password" id="confirm-password" class="input" placeholder=" " required style="padding-right: 45px;">
                    <label class="user-label">Konfirmasi Password</label>
                    <button type="button" id="btn-toggle-confirm-password" class="nebula-toggle-btn">
                      <i class="ph ph-eye"></i>
                    </button>
                  </div>
                ` : ''}
                <button type="submit" class="btn btn-primary btn-full mt-md">
                  ${isReg ? 'Daftar Sekarang' : 'Masuk Sekarang'}
                </button>
              </form>

              <p style="text-align: center; margin-top: 1rem; font-size: 0.85rem; color: var(--text-muted);">
                ${isReg ? 'Sudah punya akun?' : 'Belum punya akun?'} 
                <a href="javascript:void(0)" id="btn-switch-auth" style="color: var(--primary); font-weight: 700; text-decoration: none; margin-left: 5px;">
                  ${isReg ? 'Masuk di sini' : 'Daftar di sini'}
                </a>
              </p>

              <div style="margin: 1rem 0; display: flex; align-items: center; gap: 1rem;">
                <div style="flex: 1; height: 1px; background: var(--border);"></div>
                <span style="color: var(--text-muted); font-size: 0.8rem;">Atau masuk dengan</span>
                <div style="flex: 1; height: 1px; background: var(--border);"></div>
              </div>

              <button id="btn-google-login" class="btn btn-outline btn-full" style="display: flex; align-items: center; justify-content: center; gap: 12px; padding: 12px; border-radius: 12px;">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20">
                <span>Masuk dengan Google</span>
              </button>
            `}
          </div>
        </div>

        <!-- HERO ILLUSTRATION SHOWCASE (RIGHT SIDE) -->
        <div class="login-hero-section">
          <div class="hero-img-wrapper">
            <div class="hero-img-backdrop-glow"></div>
            <img src="/assets/animated-saving.svg" class="hero-animated-svg" alt="Kelola Tabungan MyFinance">
          </div>
        </div>

      </div>
    </div>
  `;
}
