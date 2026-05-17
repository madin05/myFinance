import { store } from '../store.js';
import { auth, googleProvider, signInWithPopup, signInWithRedirect, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } from '../firebase-config.js';
import { showLoading, hideLoading } from '../utils.js';
import { showToast, showAlert } from '../components/notifications.js';
import { navigateTo } from '../router.js';

export function renderLogin(mode = 'login', pendingEmail = '') {
  const container = document.getElementById('login-view');
  const isReg = mode === 'register';
  const isPending = mode === 'verification-pending';

  container.innerHTML = `
    <div class="login-container" id="login-parallax-container">
      
      <!-- BACKGROUND GLOWS (layer-back) -->
      <div class="parallax-layer layer-back glow-layer-1" data-depth="0.10" style="left: -10%; top: -10%; width: 600px; height: 600px; border-radius: 50%; filter: blur(50px);"></div>
      <div class="parallax-layer layer-back glow-layer-2" data-depth="0.10" style="right: -10%; bottom: -10%; width: 600px; height: 600px; border-radius: 50%; filter: blur(50px);"></div>

      <!-- DYNAMIC DRIFTING CLOUDS CONTAINER -->
      <div id="login-cloud-container" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; overflow: hidden; pointer-events: none; z-index: 1;"></div>

      <!-- MIDGROUND DECORATIONS (layer-mid) -->
      <!-- Floating Gold Coin (Left-Bottom) -->
      <div class="parallax-layer layer-mid" data-depth="0.25" style="left: 22%; bottom: 15%;">
        <div class="mascot-interactive floating-element" id="item-coin-small">
          <div class="mascot-bubble" id="bubble-coin-small">Asetmu aman terjaga!</div>
          <svg viewBox="0 0 100 100" width="85" height="85" style="filter: drop-shadow(0 12px 24px rgba(245, 158, 11, 0.3));">
            <!-- Safe Outer Body -->
            <rect x="15" y="15" width="70" height="70" rx="10" fill="#b45309" />
            <!-- Safe Door Panel -->
            <rect x="19" y="19" width="62" height="62" rx="8" fill="url(#goldGrad)" />
            <rect x="24" y="24" width="52" height="52" rx="4" fill="none" stroke="#d97706" stroke-width="2" />
            
            <!-- Big Center Vault Handle Wheel -->
            <circle cx="50" cy="50" r="18" fill="#fff" opacity="0.9" />
            <!-- Cross spokes of the wheel -->
            <line x1="50" y1="35" x2="50" y2="65" stroke="#b45309" stroke-width="5" stroke-linecap="round" />
            <line x1="35" y1="50" x2="65" y2="50" stroke="#b45309" stroke-width="5" stroke-linecap="round" />
            <!-- Hub of the wheel -->
            <circle cx="50" cy="50" r="6" fill="#b45309" />
            
            <!-- Dial markings surrounding -->
            <circle cx="50" cy="50" r="23" fill="none" stroke="#fff" stroke-width="1.5" stroke-dasharray="3 6" opacity="0.7" />
            
            <!-- Corner details -->
            <circle cx="24" cy="24" r="2" fill="#fff" opacity="0.7" />
            <circle cx="76" cy="24" r="2" fill="#fff" opacity="0.7" />
            <circle cx="24" cy="76" r="2" fill="#fff" opacity="0.7" />
            <circle cx="76" cy="76" r="2" fill="#fff" opacity="0.7" />
          </svg>
        </div>
      </div>

      <!-- Floating Wallet (Right-Top) -->
      <div class="parallax-layer layer-mid" data-depth="0.30" style="right: 20%; top: 18%;">
        <div class="mascot-interactive floating-element-reverse" id="item-wallet">
          <div class="mascot-bubble" id="bubble-wallet">Simpan uangmu aman!</div>
          <svg viewBox="0 0 100 100" width="80" height="80" style="filter: drop-shadow(0 8px 16px rgba(124, 58, 237, 0.25));">
            <rect x="15" y="25" width="70" height="50" rx="12" fill="url(#purpleGrad)" />
            <path d="M55,35 H85 V65 H55 Z" fill="#6d28d9" />
            <circle cx="70" cy="50" r="6" fill="#fbbf24" />
          </svg>
        </div>
      </div>

      <!-- FOREGROUND MASCOTS (layer-front) -->
      <!-- Mascot 1: Cute Flying Piggy Bank (Left-Mid) -->
      <div class="parallax-layer layer-front" data-depth="0.45" style="left: 10%; top: 22%;">
        <div class="mascot-interactive floating-element" id="mascot-pig">
          <div class="mascot-bubble" id="bubble-pig">Oink oink! Klik aku!</div>
          <svg viewBox="0 0 160 160" width="145" height="145" style="filter: drop-shadow(0 12px 24px rgba(244, 63, 94, 0.35));">
            <!-- Small Angel Wings (Flapping Anim) -->
            <path class="wing-left-anim" d="M35,65 Q10,40 30,30 Q45,35 40,60" fill="#fff" opacity="0.9" style="transform-origin: 40px 60px;" />
            <path class="wing-right-anim" d="M125,65 Q150,40 130,30 Q115,35 120,60" fill="#fff" opacity="0.9" style="transform-origin: 120px 60px;" />
            
            <!-- Chubby Piggy Body (Pink Gradient) -->
            <ellipse cx="80" cy="85" rx="55" ry="45" fill="url(#pigGrad)" />
            
            <!-- Curly Tail -->
            <path d="M25,85 Q10,75 15,65 Q22,65 18,75" fill="none" stroke="#f472b6" stroke-width="4" stroke-linecap="round" />
            
            <!-- Pointy Pig Ears -->
            <polygon points="45,50 35,25 55,35" fill="#f472b6" />
            <polygon points="43,48 37,28 51,36" fill="#f43f5e" />
            <polygon points="115,50 125,25 105,35" fill="#f472b6" />
            <polygon points="117,48 123,28 109,36" fill="#f43f5e" />
            
            <!-- Snout -->
            <ellipse cx="80" cy="98" rx="16" ry="11" fill="#f472b6" stroke="#f43f5e" stroke-width="1.5" />
            <!-- Nostrils -->
            <circle cx="74" cy="98" r="3" fill="#be185d" />
            <circle cx="86" cy="98" r="3" fill="#be185d" />
            
            <!-- Eyes (With Classes for Cursor Gaze Tracking) -->
            <circle cx="58" cy="74" r="5" fill="#1e1b4b" class="pig-eye" />
            <circle cx="102" cy="74" r="5" fill="#1e1b4b" class="pig-eye" />
            <circle cx="56" cy="72" r="2" fill="#fff" class="pig-eye-pupil" />
            <circle cx="100" cy="72" r="2" fill="#fff" class="pig-eye-pupil" />
            
            <!-- Blush Cheeks -->
            <circle cx="48" cy="84" r="7" fill="#f43f5e" opacity="0.35" />
            <circle cx="112" cy="84" r="7" fill="#f43f5e" opacity="0.35" />
            
            <!-- Coin Slot on top -->
            <rect x="72" y="44" width="16" height="5" rx="2" fill="#be185d" />
          </svg>
        </div>
      </div>

      <!-- Mascot 2: Cute Purple Robot (Right-Bottom) -->
      <div class="parallax-layer layer-front" data-depth="0.55" style="right: 10%; bottom: 15%;">
        <div class="mascot-interactive floating-element-reverse" id="mascot-robot">
          <div class="mascot-bubble" id="bubble-robot">Halo manusia cerdas!</div>
          <svg viewBox="0 0 140 140" width="130" height="130" style="filter: drop-shadow(0 12px 24px rgba(124, 58, 237, 0.35));">
            <rect x="25" y="25" width="90" height="90" rx="30" fill="url(#mascotRobot)" />
            <rect x="35" y="40" width="70" height="45" rx="15" fill="#1e1b4b" />
            <!-- Eyes (With Classes for Cursor Gaze Tracking) -->
            <ellipse cx="53" cy="62" rx="4" ry="7" fill="#60a5fa" class="robot-eye" />
            <ellipse cx="87" cy="62" rx="4" ry="7" fill="#60a5fa" class="robot-eye" />
            <path d="M62,72 Q70,78 78,72" fill="none" stroke="#60a5fa" stroke-width="3" stroke-linecap="round" />
            <line x1="70" y1="25" x2="70" y2="12" stroke="#7c3aed" stroke-width="6" stroke-linecap="round" />
            <circle cx="70" cy="10" r="6" fill="#fbbf24" />
          </svg>
        </div>
      </div>

      <!-- SVGs GRADIENTS FOR MASCOTS -->
      <svg width="0" height="0" style="position: absolute;">
        <defs>
          <radialGradient id="pigGrad" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stop-color="#fbcfe8" />
            <stop offset="100%" stop-color="#ec4899" />
          </radialGradient>
          <linearGradient id="mascotRobot" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#a78bfa" />
            <stop offset="100%" stop-color="#7c3aed" />
          </linearGradient>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fcd34d" />
            <stop offset="100%" stop-color="#f59e0b" />
          </linearGradient>
          <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#c084fc" />
            <stop offset="100%" stop-color="#818cf8" />
          </linearGradient>
        </defs>
      </svg>

      <!-- MAIN GLASSMORPHISM CARD -->
      <div class="login-card">
        <div class="logo-icon" style="margin: 0 auto 1.5rem; text-align: center; width: 140px;">
          <img src="/assets/logo-navbar-light.svg" class="logo-light" alt="MyFinance" style="width: 100%;">
          <img src="/assets/logo-navbar-dark.svg" class="logo-dark" alt="MyFinance" style="width: 100%;">
        </div>
        
        ${isPending ? `
          <div style="text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1.25rem;">
            <div style="background: var(--primary-light); color: var(--primary); width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; margin-bottom: 0.25rem; box-shadow: 0 8px 24px var(--primary-light);">
              <i class="ph ph-envelope-open"></i>
            </div>
            <h2 style="margin-bottom: 0;">Verifikasi Email</h2>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 0; line-height: 1.6;">
              Kami telah mengirimkan tautan verifikasi ke:<br>
              <strong style="color: var(--text-main); font-weight: 700; word-break: break-all;">${pendingEmail}</strong>
            </p>
            <p style="color: var(--text-muted); font-size: 0.8rem; line-height: 1.6; background: var(--bg-color); padding: 12px; border-radius: var(--radius-md); border: 1.5px dashed var(--border); margin: 0;">
              Silakan periksa kotak masuk atau folder <strong>Spam</strong> Anda, klik tautan tersebut, lalu tekan tombol periksa di bawah.
            </p>
            <button id="btn-check-verification" class="btn btn-primary btn-full" style="height: 48px; border-radius: 12px; font-size: 0.85rem; font-weight: 700;">
              Saya Sudah Verifikasi
            </button>
            <button id="btn-resend-verification" class="btn btn-outline btn-full" style="height: 48px; border-radius: 12px; font-size: 0.85rem; margin-top: -0.5rem; font-weight: 600;">
              Kirim Ulang Email Verifikasi
            </button>
            <a href="javascript:void(0)" id="btn-back-to-login" style="color: var(--text-muted); font-weight: 600; text-decoration: none; font-size: 0.85rem; margin-top: 0.25rem;">
              Keluar & Kembali ke Login
            </a>
          </div>
        ` : `
          <h2 style="text-align: center; margin-bottom: 0.5rem;">${isReg ? 'Buat Akun Baru' : 'Selamat Datang'}</h2>
          <p style="text-align: center; color: var(--text-muted); margin-bottom: 2.5rem;">
            ${isReg ? 'Bergabunglah untuk kelola keuangan lebih baik.' : 'Kelola keuanganmu lebih cerdas & aman.'}
          </p>
          
          <form id="auth-form">
            ${isReg ? `
              <div class="form-group">
                <label>Nama Lengkap</label>
                <input type="text" id="reg-name" class="form-control" placeholder="Arif Madani" required>
              </div>
            ` : ''}
            <div class="form-group">
              <label>Username / Email</label>
              <input type="text" id="email" class="form-control" placeholder="Masukkan username/email" required>
            </div>
            <div class="form-group">
              <label>Password</label>
              <div style="position: relative; width: 100%;">
                <input type="password" id="password" class="form-control" placeholder="Masukkan kata sandi" required style="padding-right: 45px;">
                <button type="button" id="btn-toggle-password" style="position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; transition: color 0.2s;">
                  <i class="ph ph-eye"></i>
                </button>
              </div>
            </div>
            ${isReg ? `
              <div class="form-group">
                <label>Konfirmasi Password</label>
                <div style="position: relative; width: 100%;">
                  <input type="password" id="confirm-password" class="form-control" placeholder="Ulangi kata sandi" required style="padding-right: 45px;">
                  <button type="button" id="btn-toggle-confirm-password" style="position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; transition: color 0.2s;">
                    <i class="ph ph-eye"></i>
                  </button>
                </div>
              </div>
            ` : ''}
            <button type="submit" class="btn btn-primary btn-full mt-md">
              ${isReg ? 'Daftar Sekarang' : 'Masuk Sekarang'}
            </button>
          </form>

          <p style="text-align: center; margin-top: 1.5rem; font-size: 0.85rem; color: var(--text-muted);">
            ${isReg ? 'Sudah punya akun?' : 'Belum punya akun?'} 
            <a href="javascript:void(0)" id="btn-switch-auth" style="color: var(--primary); font-weight: 700; text-decoration: none; margin-left: 5px;">
              ${isReg ? 'Masuk di sini' : 'Daftar di sini'}
            </a>
          </p>

          <div style="margin: 2rem 0; display: flex; align-items: center; gap: 1rem;">
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
  `;

  if (isPending) {
    document.getElementById('btn-check-verification').onclick = async () => {
      showLoading();
      try {
        const user = auth.currentUser;
        if (user) {
          await user.reload(); // Ambil status terbaru dari server Firebase
          if (user.emailVerified) {
            showToast('Email berhasil diverifikasi! Selamat datang.', 'success');
            
            const token = await user.getIdToken();
            const userData = {
              uid: user.uid,
              name: user.displayName || 'User MyFinance',
              email: user.email,
              avatar: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
              token: token
            };
            store.setUser(userData);
            store.updateUI();
            
            const loginView = document.getElementById('login-view');
            const appLayout = document.getElementById('app-layout');
            if (loginView && appLayout) {
              loginView.style.display = 'none';
              appLayout.style.display = 'flex';
            }
            navigateTo('/dashboard');
          } else {
            showToast('Email belum diverifikasi. Silakan klik tautan di email Anda terlebih dahulu.', 'warning');
          }
        } else {
          showToast('Sesi habis. Silakan masuk kembali.', 'warning');
          renderLogin('login');
        }
      } catch (err) {
        showToast('Gagal memeriksa status: ' + err.message, 'error');
      } finally {
        hideLoading();
      }
    };

    document.getElementById('btn-resend-verification').onclick = async () => {
      showLoading();
      try {
        const user = auth.currentUser;
        if (user) {
          await sendEmailVerification(user);
          showToast('Email verifikasi berhasil dikirim ulang!', 'success');
        } else {
          showToast('Silakan masuk kembali terlebih dahulu untuk mengirim ulang verifikasi.', 'warning');
          renderLogin('login');
        }
      } catch (err) {
        if (err.code === 'auth/too-many-requests') {
          showToast('Terlalu banyak permintaan kirim ulang. Harap tunggu beberapa saat.', 'error');
        } else {
          showToast('Gagal mengirim ulang email: ' + err.message, 'error');
        }
      } finally {
        hideLoading();
      }
    };

    document.getElementById('btn-back-to-login').onclick = async () => {
      showLoading();
      try {
        await auth.signOut();
        renderLogin('login');
      } catch (err) {
        showToast('Gagal keluar: ' + err.message, 'error');
      } finally {
        hideLoading();
      }
    };
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

          const result = await createUserWithEmailAndPassword(auth, email, pass);
          const user = result.user;
          
          // Kirim email verifikasi Firebase secara asinkron
          await sendEmailVerification(user);
          showToast('Registrasi berhasil! Email verifikasi telah dikirim.', 'success');
          // Sesi dibiarkan hidup agar user bisa langsung cek verifikasi / kirim ulang secara instan
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
            await signInWithEmailAndPassword(auth, email, pass);
            // onAuthStateChanged di main.js akan menangani pendeteksian emailVerified secara otomatis!
          }
        }
      } catch (error) {
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

  // 3D Parallax & Mascot Gaze Tracking (Desktop Only) with Wide Gliding Range
  const parallaxContainer = document.getElementById('login-parallax-container');
  if (parallaxContainer && window.innerWidth > 991) {
    parallaxContainer.onmousemove = (e) => {
      const { width, height } = parallaxContainer.getBoundingClientRect();
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      const layers = parallaxContainer.querySelectorAll('.parallax-layer');
      layers.forEach(layer => {
        const depth = parseFloat(layer.getAttribute('data-depth'));
        // Standard Parallax Movement
        const centerX = width / 2;
        const centerY = height / 2;
        const deltaX = mouseX - centerX;
        const deltaY = mouseY - centerY;
        const moveX = deltaX * depth * 0.45;
        const moveY = deltaY * depth * 0.45;

        // 3D Head-Turn Face Tilt Angles
        const rotateY = (deltaX / width) * 25; // up to 25 deg
        const rotateX = -(deltaY / height) * 25; // up to -25 deg

        layer.style.transform = `translate3d(${moveX}px, ${moveY}px, 0) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      });

      // Mascot Eye Gaze Tracking
      const trackEyes = (mascotId, eyeClass) => {
        const mascot = document.getElementById(mascotId);
        if (!mascot) return;
        const rect = mascot.getBoundingClientRect();
        const mascotCenterX = rect.left + rect.width / 2;
        const mascotCenterY = rect.top + rect.height / 2;

        const dx = mouseX - mascotCenterX;
        const dy = mouseY - mascotCenterY;
        const angle = Math.atan2(dy, dx);
        
        // Eyes smoothly slide up to 4px inside their sockets toward the cursor
        const eyeX = Math.cos(angle) * 4;
        const eyeY = Math.sin(angle) * 4;

        const eyes = mascot.querySelectorAll(eyeClass);
        eyes.forEach(eye => {
          eye.style.transform = `translate(${eyeX}px, ${eyeY}px)`;
        });
      };

      trackEyes('mascot-pig', '.pig-eye, .pig-eye-pupil');
      trackEyes('mascot-robot', '.robot-eye');
    };

    parallaxContainer.onmouseleave = () => {
      const layers = parallaxContainer.querySelectorAll('.parallax-layer');
      layers.forEach(layer => {
        layer.style.transform = 'translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg)';
      });

      // Reset eyes
      document.querySelectorAll('.pig-eye, .pig-eye-pupil, .robot-eye').forEach(eye => {
        eye.style.transform = 'translate(0px, 0px)';
      });
    };
  }

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
