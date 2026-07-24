import { store } from '../store.js';
import { auth, googleProvider, signInWithPopup, signInWithRedirect, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, updateProfile } from '../firebase-config.js';
import { showLoading, hideLoading } from '../utils.js';
import { showToast, showAlert, showConfirm, showOptionalVerificationModal } from '../components/notifications.js';
import { navigateTo } from '../router.js';

export function renderLogin(mode = 'login', pendingEmail = '', extraData = {}) {
  const container = document.getElementById('login-view');
  const isReg = mode === 'register';
  const isForgot = mode === 'forgot-password';
  const isVerified = mode === 'email-verified';
  const isVerifiedError = mode === 'email-verified-error';
  const isResetConfirm = mode === 'reset-password-confirm';

  container.innerHTML = `
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

            ${isVerified ? `
              <div style="text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1.5rem; padding: 0.5rem 0;">
                <!-- Success Icon Animated -->
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
                <!-- Error Icon -->
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

  if (isVerified) {
    const goToLoginBtn = document.getElementById('btn-go-to-login');
    if (goToLoginBtn) {
      goToLoginBtn.onclick = async () => {
        // Bersihkan query params dari URL
        window.history.replaceState(null, '', '/dashboard');
        
        const currentUser = auth.currentUser;
        if (currentUser) {
          showLoading();
          try {
            await currentUser.reload();
            if (store.user) {
              store.user.emailVerified = currentUser.emailVerified;
              store.save();
            }
          } catch (e) {
            console.warn('Reload auth user error:', e);
          } finally {
            hideLoading();
          }

          // Direct langsung ke Dashboard tanpa lewat Halaman Login lagi!
          const loginView = document.getElementById('login-view');
          const appLayout = document.getElementById('app-layout');
          if (loginView) loginView.style.display = 'none';
          if (appLayout) appLayout.style.display = 'flex';
          navigateTo('/dashboard');
        } else {
          renderLogin('login');
        }
      };
    }
  } else if (isVerifiedError) {
    const requestNewBtn = document.getElementById('btn-request-new-link');
    if (requestNewBtn) {
      requestNewBtn.onclick = async () => {
        window.history.replaceState(null, '', '/');
        const { checkAuth } = await import('../main.js');
        checkAuth();
      };
    }
    const backBtn = document.getElementById('btn-back-to-login-from-error');
    if (backBtn) {
      backBtn.onclick = async () => {
        window.history.replaceState(null, '', '/');
        const { checkAuth } = await import('../main.js');
        checkAuth();
      };
    }
  } else if (isForgot) {
    const forgotForm = document.getElementById('forgot-form');
    if (forgotForm) {
      forgotForm.onsubmit = async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('forgot-email').value.trim();
        if (!emailInput) {
          showToast('Masukkan email atau username terlebih dahulu.', 'warning');
          return;
        }

        showLoading();
        try {
          const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          const API_URL = isLocalhost ? 'http://localhost:5000/api' : '/api';

          const res = await fetch(`${API_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailInput })
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Gagal mengirim email reset password.');

          hideLoading();
          showAlert('Tautan Terkirim!', data.message || `Link reset password dikirim ke ${emailInput}. Periksa Inbox/Spam!`, 'success');
          renderLogin('login');
        } catch (err) {
          hideLoading();
          showAlert('Gagal Reset Password', err.message || 'Terjadi kesalahan saat mengirim link reset.', 'error');
        }
      };
    }

    const backToLoginBtn = document.getElementById('btn-back-to-login');
    if (backToLoginBtn) {
      backToLoginBtn.onclick = () => {
        renderLogin('login');
      };
    }
  } else if (isResetConfirm) {
    const confirmResetForm = document.getElementById('confirm-reset-form');
    if (confirmResetForm) {
      confirmResetForm.onsubmit = async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('reset-new-password').value;
        if (!newPassword || newPassword.length < 6) {
          showToast('Kata sandi minimal 6 karakter.', 'warning');
          return;
        }
        if (!extraData || !extraData.oobCode) {
          showToast('Kode reset tidak ditemukan atau tidak valid.', 'error');
          return;
        }

        showLoading();
        try {
          const { confirmPasswordReset, signOut } = await import('../firebase-config.js');
          await confirmPasswordReset(auth, extraData.oobCode, newPassword);
          try { await signOut(auth); } catch (err) {}
          store.setUser(null);
          hideLoading();
          showAlert('Kata Sandi Berhasil Diubah!', 'Kata sandi kamu telah berhasil diperbarui. Silakan masuk kembali menggunakan kata sandi baru.', 'success');
          renderLogin('login');
        } catch (err) {
          hideLoading();
          console.error('Confirm password reset error:', err);
          showAlert('Gagal Ubah Kata Sandi', 'Tautan ini sudah kedaluwarsa atau tidak valid. Silakan minta tautan baru.', 'error');
        }
      };
    }

    const toggleResetPass = document.getElementById('toggle-reset-password');
    if (toggleResetPass) {
      toggleResetPass.onclick = () => {
        const input = document.getElementById('reset-new-password');
        if (input.type === 'password') {
          input.type = 'text';
          toggleResetPass.classList.replace('ph-eye', 'ph-eye-slash');
        } else {
          input.type = 'password';
          toggleResetPass.classList.replace('ph-eye-slash', 'ph-eye');
        }
      };
    }

    const backToLoginFromReset = document.getElementById('btn-back-to-login-from-reset');
    if (backToLoginFromReset) {
      backToLoginFromReset.onclick = () => {
        renderLogin('login');
      };
    }
  } else {
    // Switch Auth Mode
    document.getElementById('btn-switch-auth').onclick = () => {
      renderLogin(isReg ? 'login' : 'register');
    };

    // Toggle Password Visibility
    const toggleBtn = document.getElementById('btn-toggle-password');
    const passwordInput = document.getElementById('password');
    if (toggleBtn && passwordInput) {
      toggleBtn.onclick = () => {
        const isPassword = passwordInput.getAttribute('type') === 'password';
        passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
        
        const icon = toggleBtn.querySelector('i');
        if (icon) {
          icon.className = isPassword ? 'ph ph-eye-slash' : 'ph ph-eye';
        }
      };
    }

    // Toggle Confirm Password Visibility (Register Only)
    const toggleConfirmBtn = document.getElementById('btn-toggle-confirm-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    if (toggleConfirmBtn && confirmPasswordInput) {
      toggleConfirmBtn.onclick = () => {
        const isPassword = confirmPasswordInput.getAttribute('type') === 'password';
        confirmPasswordInput.setAttribute('type', isPassword ? 'text' : 'password');
        
        const icon = toggleConfirmBtn.querySelector('i');
        if (icon) {
          icon.className = isPassword ? 'ph ph-eye-slash' : 'ph ph-eye';
        }
      };
    }

    // Forgot Password Logic
    const btnForgotPassword = document.getElementById('btn-forgot-password');
    if (btnForgotPassword) {
      btnForgotPassword.onclick = (e) => {
        e.preventDefault();
        renderLogin('forgot-password');
      };
    }
  }

  // Google Login Logic
  if (document.getElementById('btn-google-login')) {
    document.getElementById('btn-google-login').onclick = async () => {
      showLoading();

      let handleFocusFallback;

      const setupFocusTracker = setTimeout(() => {
        handleFocusFallback = () => {
          const overlay = document.getElementById('loading-overlay');
          if (overlay && overlay.style.display === 'flex') {
            hideLoading();
            window.removeEventListener('focus', handleFocusFallback);
          }
        };
        window.addEventListener('focus', handleFocusFallback);
      }, 1200);

      try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        const token = await user.getIdToken();

        store.setUser({
          name: user.displayName,
          email: user.email,
          avatar: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
          token: token,
          uid: user.uid,
          provider: 'google'
        });

        navigateTo('/dashboard');
      } catch (error) {
        clearTimeout(setupFocusTracker);
        if (handleFocusFallback) {
          window.removeEventListener('focus', handleFocusFallback);
        }

        if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
          showToast('Login Google gagal! ' + (error.message || error), 'error');
        }
      } finally {
        clearTimeout(setupFocusTracker);
        if (handleFocusFallback) {
          window.removeEventListener('focus', handleFocusFallback);
        }
        hideLoading();
      }
    };
  }

  // Auth Form Submit
  if (document.getElementById('auth-form')) {
    document.getElementById('auth-form').onsubmit = async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value;
      const pass = document.getElementById('password').value;

      showLoading();
      try {
        if (isReg) {
          // Handle Register
          const name = document.getElementById('reg-name').value;
          const confirmPass = document.getElementById('confirm-password').value;

          // Validasi kecocokan sandi
          if (pass !== confirmPass) {
            showToast('Password dan Konfirmasi Password tidak cocok!', 'warning');
            hideLoading();
            return;
          }

          window.isVerificationModalActive = true;
          const result = await createUserWithEmailAndPassword(auth, email, pass);
          const user = result.user;

          // Set displayName di Firebase Auth agar onAuthStateChanged baca nama yang benar
          await updateProfile(user, { displayName: name });

          // Kirim email verifikasi via Backend API (Bypass Firebase Console sepenuhnya)
          const token = await user.getIdToken(true);
          const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          const API_URL = isLocalhost ? 'http://localhost:5000/api' : '/api';
          
          fetch(`${API_URL}/users/send-verification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          }).catch(err => {
            console.warn("Gagal trigger kirim email verifikasi backend:", err);
          });

          // Langsung set user dan masuk ke app — Soft/Lazy Verification
          await store.setUser({
            uid: user.uid,
            name: name,
            email: user.email,
            avatar: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
            token: token,
            emailVerified: false,
            provider: 'password'
          }, { name }); // pass name ke backend sync

          window.isVerificationModalActive = true;
          hideLoading();
          navigateTo('/dashboard');
          showOptionalVerificationModal();
        } else {
          // Handle Login (with Demo Fallback)
          if (email === 'guest' && pass === 'guest123') {
            store.setUser({ 
              name: 'Guest User', 
              email: 'guest@myfinance.com',
              avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Guest',
              role: 'guest',
              provider: 'password'
            });
            navigateTo('/dashboard');
          } else {
            const userCred = await signInWithEmailAndPassword(auth, email, pass);
            const user = userCred.user;
            await user.reload();
            const token = await user.getIdToken(true);
            
            await store.setUser({
              uid: user.uid,
              name: user.displayName || (store.user && store.user.uid === user.uid ? store.user.name : null) || 'User MyFinance',
              email: user.email,
              avatar: user.photoURL || (store.user && store.user.uid === user.uid ? store.user.avatar : null) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
              token: token,
              emailVerified: user.emailVerified,
              provider: user.providerData[0]?.providerId || 'password'
            });

            hideLoading();
            navigateTo('/dashboard');
          }
        }
      } catch (error) {
        window.isVerificationModalActive = false;
        console.error("Auth Error:", error);
        let msg = error.message;
        if (error.code === 'auth/operation-not-allowed') {
          msg = 'Metode masuk dengan Email & Password belum diaktifkan di Firebase Console Anda. Silakan aktifkan terlebih dahulu di menu: Authentication -> Sign-in method -> Email/Password.';
        } else if (error.code === 'auth/email-already-in-use') {
          msg = 'Alamat email ini sudah terdaftar. Silakan gunakan email lain atau langsung masuk ke akun Anda.';
        } else if (error.code === 'auth/invalid-email') {
          msg = 'Format alamat email tidak valid. Silakan periksa kembali.';
        } else if (error.code === 'auth/weak-password') {
          msg = 'Kata sandi terlalu lemah. Minimal harus terdiri dari 6 karakter.';
        } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          msg = 'Email atau kata sandi yang Anda masukkan salah. Silakan periksa kembali.';
        } else if (error.code === 'auth/too-many-requests') {
          msg = 'Terlalu banyak percobaan masuk yang gagal. Akses diblokir sementara, silakan coba beberapa saat lagi.';
        } else if (error.code === 'auth/network-request-failed') {
          msg = 'Koneksi jaringan gagal. Harap periksa koneksi internet Anda.';
        }
        showAlert('Gagal', msg, 'error');
      } finally {
        hideLoading();
      }
    };
  }

  // List of cute finance quotes for click interactions
  const quotes = [
    "Yuk hemat bareng aku!",
    "Sssst, kurangi jajan kopi ya!",
    "Tabunganmu aman bersamaku!",
    "Gajian sebentar lagi datang!",
    "Ayo raih wishlist impianmu!",
    "Kelola uang lebih cerdas!",
    "Yuk catat pengeluaranmu!",
    "Don't worry, be hemat!"
  ];

  // Quotes khusus si Babi Terbang
  const pigQuotes = [
    "Celengan babi terbang siap meluncur!",
    "Oink oink! Tabung uangmu di sini!",
    "Sayapku kepak-kepak demi masa depanmu!",
    "Aku terbang karena beban tabunganmu ringan!",
    "Oink! Siap terbang raih mimpimu!",
    "Koin masuk, hatiku senang!"
  ];

  // Helper function to handle mascot click interactions
  const initMascotInteraction = (mascotId, bubbleId, customQuotes = null) => {
    const mascot = document.getElementById(mascotId);
    const bubble = document.getElementById(bubbleId);
    const quoteList = customQuotes || quotes;

    if (mascot && bubble) {
      mascot.onclick = (e) => {
        e.stopPropagation(); // Prevent parallax reset

        // Trigger Spin Animation
        mascot.classList.add('mascot-spin');
        setTimeout(() => {
          mascot.classList.remove('mascot-spin');
        }, 600);

        // Pick a random quote
        const randomQuote = quoteList[Math.floor(Math.random() * quoteList.length)];
        bubble.textContent = randomQuote;
        
        // Show Bubble
        bubble.classList.add('active');

        // Hide Bubble after 3.5 seconds
        if (mascot.bubbleTimeout) clearTimeout(mascot.bubbleTimeout);
        mascot.bubbleTimeout = setTimeout(() => {
          bubble.classList.remove('active');
        }, 3500);
      };
    }
  };

  // Initialize click interactions for all 4 interactive elements
  initMascotInteraction('mascot-pig', 'bubble-pig', pigQuotes);
  initMascotInteraction('mascot-robot', 'bubble-robot');
  initMascotInteraction('item-coin-small', 'bubble-coin-small');
  initMascotInteraction('item-wallet', 'bubble-wallet');

  // Mouse movement parallax telah dinonaktifkan agar tampilan login tetap statis dan stabil

  // Dynamic Cloud Generator (Desktop Only)
  const cloudContainer = document.getElementById('login-cloud-container');
  if (cloudContainer && window.innerWidth > 991) {
    const cloudCount = 6;
    let cloudHTML = '';

    for (let i = 0; i < cloudCount; i++) {
      // Determine random sizes: small, normal, large
      const sizeIndex = Math.floor(Math.random() * 3); // 0, 1, 2
      let width, height, opacity, speedMult;
      
      if (sizeIndex === 0) {
        // Small
        width = Math.floor(Math.random() * 30) + 45; // 45px - 75px
        height = Math.floor(width * 0.6);
        opacity = 0.25;
        speedMult = 1.35; // Flows faster
      } else if (sizeIndex === 1) {
        // Normal
        width = Math.floor(Math.random() * 40) + 80; // 80px - 120px
        height = Math.floor(width * 0.6);
        opacity = 0.35;
        speedMult = 1.0;
      } else {
        // Large
        width = Math.floor(Math.random() * 50) + 130; // 130px - 180px
        height = Math.floor(width * 0.6);
        opacity = 0.45;
        speedMult = 0.72; // Flows slower
      }

      const top = Math.floor(Math.random() * 75) + 8; // Spread between 8% and 83% top
      const duration = Math.floor((Math.random() * 35 + 45) / speedMult); // 45s - 80s adjusted by speed multiplier
      const delay = -Math.floor(Math.random() * duration); // Negative delay for instant pre-spawn!

      // Drifting direction starting from screen corners (left-to-right or right-to-left)
      const directionClass = Math.random() > 0.5 ? 'cloud-drift-left-to-right' : 'cloud-drift-right-to-left';

      cloudHTML += `
        <div class="cloud-ornament" style="
          top: ${top}%;
          animation: ${directionClass} ${duration}s linear infinite;
          animation-delay: ${delay}s;
          opacity: ${opacity};
          position: absolute;
          pointer-events: none;
        ">
          <svg viewBox="0 0 100 60" width="${width}" height="${height}">
            <path d="M20,45 A15,15 0 0,1 30,20 A20,20 0 0,1 70,20 A15,15 0 0,1 80,45 Z" fill="currentColor" />
          </svg>
        </div>
      `;
    }
    cloudContainer.innerHTML = cloudHTML;
  }
}

/**
 * Menampilkan banner verifikasi email di dalam app.
 * Dipanggil dari main.js saat user login/register dengan email yang belum diverifikasi.
 * @param {import('firebase/auth').User} firebaseUser - Firebase Auth user object
 */
export function renderEmailVerificationBanner(firebaseUser) {
  const banner = document.getElementById('email-verify-banner');
  if (!banner) return;

  // Jangan tampilkan banner jika pop-up modal verifikasi sedang/akan aktif
  if (window.isVerificationModalActive || document.getElementById('optional-verif-modal-overlay')) {
    banner.style.display = 'none';
    return;
  }

  // Tampilkan banner dengan animasi slide-down
  banner.style.display = 'flex';
  banner.innerHTML = `
    <div class="evb-icon"><i class="ph ph-envelope-simple-warning"></i></div>
    <div class="evb-text">
      <strong>Verifikasi emailmu</strong>
      <span>Cek inbox atau spam untuk link verifikasi ke <em>${firebaseUser?.email || ''}</em></span>
    </div>
    <div class="evb-actions">
      <button id="evb-btn-resend" class="evb-btn-resend">Kirim Ulang</button>
      <button id="evb-btn-close" class="evb-btn-close" aria-label="Tutup"><i class="ph ph-x"></i></button>
    </div>
  `;

  // Handler kirim ulang — pakai backend API (nodemailer + Gmail), bukan Firebase Client SDK
  document.getElementById('evb-btn-resend').onclick = async () => {
    const btn = document.getElementById('evb-btn-resend');
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = 'Mengirim...';

    try {
      const token = store.user?.token;
      if (!token) throw new Error('Token tidak ditemukan, silakan login ulang.');

      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const API_URL = isLocalhost ? 'http://localhost:5000/api' : '/api';

      const res = await fetch(`${API_URL}/users/send-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal kirim email.');

      btn.textContent = 'Terkirim! ✓';
      // Reset tombol setelah 45 detik
      setTimeout(() => {
        if (document.getElementById('evb-btn-resend')) {
          btn.disabled = false;
          btn.textContent = 'Kirim Ulang';
        }
      }, 45000);
    } catch (err) {
      btn.disabled = false;
      btn.textContent = 'Coba Lagi';
      console.warn('Resend verification error:', err.message);
    }
  };

  // Handler dismiss banner
  document.getElementById('evb-btn-close').onclick = () => {
    banner.style.animation = 'evb-slide-up 0.35s cubic-bezier(0.25, 1, 0.5, 1) forwards';
    setTimeout(() => { banner.style.display = 'none'; banner.style.animation = ''; }, 380);
  };
}

