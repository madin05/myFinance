import { store } from './store.js';
import { auth, onAuthStateChanged, onIdTokenChanged, getRedirectResult, applyActionCode } from './firebase-config.js';
import { userService } from './services/userService.js';
import { renderLogin, renderEmailVerificationBanner } from './pages/login.js';
import { openAddTransactionModal, openQuickActionSheet } from './components/modal/index.js';
import { openCalculator } from './components/calculator.js';
import { openScanReceiptModal } from './components/scanReceipt.js';
import { handleRoute, refreshCurrentPage, navigateTo } from './router.js';
import { hideLoading, initStickyHeader, initBottomSheetSwipe } from './utils.js';
import { initNavigation } from './ui/navigation.js';
import { initCustomSelects } from './ui/select.js';
import { showConfirm, checkVerification } from './components/notifications.js';

import './style.css';

// --- reactive UI update ---
window.addEventListener('store-updated', () => {
  refreshCurrentPage();
  
  // Update Navbar UI secara reaktif
  const userData = store.user;
  if (userData) {
    const avatarImg = document.getElementById('user-avatar');
    const navName = document.getElementById('nav-user-name');
    const navEmail = document.getElementById('nav-user-email');
    
    if (avatarImg && avatarImg.src !== userData.avatar) {
      avatarImg.src = userData.avatar;
    }
    if (navName) navName.textContent = userData.name;
    if (navEmail) navEmail.textContent = userData.email;
  }

  // Re-init sticky header setiap kali halaman berganti
  // agar semua halaman dapat efek blur navbar saat scroll
  initStickyHeader();
});

// ─── CROSS-TAB AUTO-VERIFICATION SYNC (BROADCASTCHANNEL & POLLING) ───
let autoVerifPollingTimer = null;
const authBroadcast = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('myfinance_auth') : null;

if (authBroadcast) {
  authBroadcast.onmessage = (event) => {
    if (event.data?.type === 'EMAIL_VERIFIED') {
      checkAndApplyEmailVerification();
    }
  };
}

let isVerifyingEmailCheck = false;

export async function checkAndApplyEmailVerification() {
  if (isVerifyingEmailCheck) return false;
  const user = auth.currentUser;
  if (!user || !store.user) {
    stopVerificationPolling();
    return false;
  }

  // Jika user dari awal SUDAH terverifikasi (di Firebase Auth atau store), simpan & hentikan polling tanpa pop-up
  if (user.emailVerified || store.user.emailVerified) {
    if (!store.user.emailVerified) {
      store.user.emailVerified = true;
      store.save();
    }
    stopVerificationPolling();
    return false;
  }

  isVerifyingEmailCheck = true;
  try {
    await user.reload();
    if (user.emailVerified) {
      stopVerificationPolling();

      store.user.emailVerified = true;
      store.save();

      window.isVerificationModalActive = false;
      document.getElementById('verification-modal-overlay')?.remove();
      document.getElementById('optional-verif-modal-overlay')?.remove();

      const banner = document.getElementById('email-verify-banner');
      if (banner) banner.style.display = 'none';

      const { showAlert } = await import('./components/notifications.js');
      await showAlert('Email Terverifikasi!', 'Email berhasil diverifikasi.', 'success');

      refreshCurrentPage();

      // Trigger Onboarding Product Tour setelah verifikasi akun selesai!
      setTimeout(() => {
        import('./components/tutorial.js').then(m => m.startProductTutorial());
      }, 400);

      return true;
    }
  } catch (e) {
    // Ignore network reload errors during poll
  } finally {
    isVerifyingEmailCheck = false;
  }
  return false;
}

export function startVerificationPolling() {
  if (autoVerifPollingTimer) return;
  checkAndApplyEmailVerification();
  autoVerifPollingTimer = setInterval(() => {
    checkAndApplyEmailVerification();
  }, 3000);
}

export function stopVerificationPolling() {
  if (autoVerifPollingTimer) {
    clearInterval(autoVerifPollingTimer);
    autoVerifPollingTimer = null;
  }
}

// --- AUTH LOGIC ---
export async function checkAuth() {
  const loginView = document.getElementById('login-view');
  const appLayout = document.getElementById('app-layout');

  console.log('Checking Auth State...');

  // ─── STEP 0: Intercept Firebase Email Action Link (verifyEmail, resetPassword, etc.) ───
  const urlParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '');
  const mode = urlParams.get('mode') || hashParams.get('mode');
  const oobCode = urlParams.get('oobCode') || hashParams.get('oobCode');
  const isResetSuccess = urlParams.get('resetSuccess') === 'true' || hashParams.get('resetSuccess') === 'true';

  // 1. Setelah reset password selesai di Firebase, kembalikan ke Halaman Login & Logout user!
  if (isResetSuccess) {
    try {
      await signOut(auth);
    } catch (e) {}
    store.setUser(null);
    loginView.style.display = 'block';
    appLayout.style.display = 'none';
    renderLogin('login');
    const { showAlert } = await import('./components/notifications.js');
    showAlert('Kata Sandi Berhasil Diubah!', 'Kata sandi akunmu telah diperbarui. Silakan masuk kembali menggunakan kata sandi baru.', 'success');
    return;
  }

  // 2. Jika verifikasi email dari link
  if (mode === 'verifyEmail' && oobCode) {
    loginView.style.display = 'block';
    appLayout.style.display = 'none';

    // Jika user sudah terautentikasi dan sudah terverifikasi sebelumnya
    if (auth.currentUser) {
      try { await auth.currentUser.reload(); } catch (e) {}
      if (auth.currentUser.emailVerified) {
        window.history.replaceState(null, '', window.location.pathname);
        loginView.style.display = 'none';
        appLayout.style.display = 'flex';
        navigateTo('/dashboard');
        const { showToast } = await import('./components/notifications.js');
        showToast('Akun Anda sudah terverifikasi!', 'success');
        return;
      }
    }

    try {
      await applyActionCode(auth, oobCode);
      // Broadcast sinyal ke tab lama yang terbuka
      if (authBroadcast) {
        authBroadcast.postMessage({ type: 'EMAIL_VERIFIED' });
      }
      renderLogin('email-verified');
    } catch (actionErr) {
      console.warn('applyActionCode gagal:', actionErr.code);
      // Cek sekali lagi apakah user di Firebase Auth sebenarnya sudah verified
      if (auth.currentUser) {
        try { await auth.currentUser.reload(); } catch (e) {}
        if (auth.currentUser.emailVerified) {
          if (authBroadcast) {
            authBroadcast.postMessage({ type: 'EMAIL_VERIFIED' });
          }
          window.history.replaceState(null, '', window.location.pathname);
          loginView.style.display = 'none';
          appLayout.style.display = 'flex';
          navigateTo('/dashboard');
          const { showToast } = await import('./components/notifications.js');
          showToast('Akun Anda sudah terverifikasi!', 'success');
          return;
        }
      }
      renderLogin('email-verified-error');
    }
    return;
  }

  // 3. Jika reset password in-app dari link
  if (mode === 'resetPassword' && oobCode) {
    loginView.style.display = 'block';
    appLayout.style.display = 'none';
    renderLogin('reset-password-confirm', '', { oobCode });
    return;
  }

  // 4. Jika verifikasi Magic Link 2FA
  const token2FA = urlParams.get('token') || hashParams.get('token');
  const customToken = urlParams.get('customToken') || hashParams.get('customToken');

  if (mode === '2fa' && token2FA) {
    const { showLoading, hideLoading } = await import('./utils.js');
    const { showAlert } = await import('./components/notifications.js');
    showLoading();
    try {
      const res = await userService.verify2FAMagicLink(token2FA);
      hideLoading();
      window.history.replaceState(null, '', window.location.pathname);

      if (res.customToken) {
        const { signInWithCustomToken } = await import('./firebase-config.js');
        await signInWithCustomToken(auth, res.customToken);
      }

      loginView.style.display = 'none';
      appLayout.style.display = 'flex';

      if (res.tokenType === 'SETUP') {
        if (store.user) {
          store.user.is2FAEnabled = true;
          store.save();
        }
        navigateTo('/akun');
        showAlert('Aktivasi 2FA Berhasil!', 'Autentikasi 2-Langkah telah diaktifkan pada akun Anda.', 'success');
      } else {
        navigateTo('/dashboard');
        showAlert('Verifikasi 2FA Berhasil!', 'Selamat datang kembali di MyFinance.', 'success');
      }
    } catch (err) {
      hideLoading();
      window.history.replaceState(null, '', window.location.pathname);
      const { showAlert } = await import('./components/notifications.js');
      showAlert('Verifikasi 2FA Gagal', err.message || 'Token 2FA tidak valid atau kadaluarsa.', 'error');
      renderLogin('login');
    }
  } else if (mode === '2faSuccess' || mode === '2faSetupSuccess' || mode === '2faDisabledSuccess') {
    window.history.replaceState(null, '', window.location.pathname);
    if (customToken) {
      const { signInWithCustomToken } = await import('./firebase-config.js');
      await signInWithCustomToken(auth, customToken).catch(() => {});
    }
    loginView.style.display = 'none';
    appLayout.style.display = 'flex';
    const { showAlert } = await import('./components/notifications.js');
    if (mode === '2faSetupSuccess') {
      if (store.user) {
        store.user.is2FAEnabled = true;
        store.save();
      }
      navigateTo('/akun');
      showAlert('Aktivasi 2FA Berhasil!', 'Autentikasi 2-Langkah telah diaktifkan pada akun Anda.', 'success');
    } else if (mode === '2faDisabledSuccess') {
      if (store.user) {
        store.user.is2FAEnabled = false;
        store.save();
      }
      navigateTo('/akun');
      showAlert('Penonaktifan 2FA Berhasil!', 'Autentikasi 2-Langkah pada akun Anda telah berhasil dinonaktifkan.', 'info');
    } else {
      navigateTo('/dashboard');
      showAlert('Verifikasi 2FA Berhasil!', 'Selamat datang kembali di MyFinance.', 'success');
    }
  } else if (mode === '2faError') {
    const errorMsg = urlParams.get('message') || hashParams.get('message') || 'Verifikasi 2FA gagal atau kedaluwarsa.';
    window.history.replaceState(null, '', window.location.pathname);
    const { showAlert } = await import('./components/notifications.js');
    showAlert('Verifikasi 2FA Gagal', errorMsg, 'error');
  }

  // ─── STEP 1: Selesaikan pending redirect result DULU (mobile Google login) ───
  try {
    const redirectResult = await getRedirectResult(auth);
    if (redirectResult?.user) {
      console.log('Google redirect selesai diproses untuk:', redirectResult.user.email);
    }
  } catch (redirectError) {
    console.warn('getRedirectResult error:', redirectError.code);
    hideLoading();
    if (redirectError.code && redirectError.code !== 'auth/cancelled-popup-request') {
      const { showToast } = await import('./components/notifications.js');
      showToast('Login Google gagal. Silakan coba lagi.', 'error');
    }
  }

  // ─── STEP 2: Baru register onAuthStateChanged ───
  onAuthStateChanged(auth, async (user) => {
    console.log('Auth State Changed:', user ? 'Logged In' : 'Logged Out');
    
    if (user) {
      // Periksa apakah provider email/password dan belum diverifikasi
      const isEmailProvider = user.providerData.some(p => p.providerId === 'password');
      const needsVerification = isEmailProvider && !user.emailVerified;

      if (needsVerification) {
        startVerificationPolling();
      } else {
        stopVerificationPolling();
      }

      const token = await user.getIdToken();
      
      // FIX: Sync data profil dari Firebase
      if (store.user && store.user.uid === user.uid) {
        console.log('User already exists, checking for profile updates...');
        store.user.token = token;
        store.user.emailVerified = user.emailVerified;

        if (store.transactions.length === 0) {
          store.isSyncing = true;
        }
        store.save(); // Ini bakal trigger updateUI & ngelepas skeleton secara instan
        store.sync();
      } else {
        console.log('First time login, setting user...');
        const userData = {
          uid: user.uid,
          name: user.displayName || 'User MyFinance',
          email: user.email,
          avatar: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
          token: token,
          emailVerified: user.emailVerified,
          provider: user.providerData[0]?.providerId || 'unknown'
        };
        store.setUser(userData);
      }

      if (needsVerification) {
        // Enforce mandatory OTP verification before accessing app layout
        loginView.style.display = 'block';
        appLayout.style.display = 'none';
        renderLogin('verify-otp', user.email, { email: user.email, token });
        return;
      }

      // Switch display layout and render page content instantly
      loginView.style.display = 'none';
      appLayout.style.display = 'flex';

      handleRoute();
      store.updateUI();

      const banner = document.getElementById('email-verify-banner');
      if (banner) banner.style.display = 'none';
      import('./components/tutorial.js').then(m => m.startProductTutorial());
      
      const currentPath = window.location.pathname;
      const validRoutes = ['/dashboard', '/transaksi', '/anggaran', '/tabungan', '/laporan', '/akun', '/faq', '/notifikasi'];
      if (!validRoutes.includes(currentPath)) {
        navigateTo('/dashboard');
      }
    } else {
      stopVerificationPolling();
      loginView.style.display = 'block';
      appLayout.style.display = 'none';
      renderLogin();
    }
  });

  // ─── STEP 3: Auto-refresh Firebase ID Token & Session Cookie di background ───
  onIdTokenChanged(auth, async (user) => {
    if (user && store.user) {
      const freshToken = await user.getIdToken();
      if (store.user.token !== freshToken) {
        console.log('[Auth] Firebase ID Token diperbarui secara otomatis.');
        store.user.token = freshToken;
        store.save();
        userService.createSession(freshToken).catch(() => {});
      }
    }
  });

  // Re-verify & auto-renew session saat user kembali ke tab browser (misal laptop habis sleep / dari tab email)
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && auth.currentUser && store.user) {
      checkAndApplyEmailVerification();
      try {
        const freshToken = await auth.currentUser.getIdToken(true);
        if (store.user.token !== freshToken) {
          console.log('[Auth] Sesi diperbarui setelah tab aktif kembali.');
          store.user.token = freshToken;
          store.save();
          userService.createSession(freshToken).catch(() => {});
        }
        // Auto-sync data pengguna (termasuk status 2FA) dari database
        store.sync();
      } catch (err) {
        console.warn('[Auth] Gagal memperbarui token saat tab aktif:', err);
      }
    }
  });
}

// --- INITIALIZATION ---

document.addEventListener('DOMContentLoaded', () => {
  hideLoading();
  initNavigation();
  initCustomSelects();
  initNetworkStatus();
  checkAuth();

  // Init sticky header global untuk semua halaman
  initStickyHeader();
  initBottomSheetSwipe();

  // 2. Global FAM & Bottom Nav Buttons
  document.getElementById('bnav-fab')?.addEventListener('click', () => {
    openQuickActionSheet();
  });

  document.getElementById('btn-fam-add-tx')?.addEventListener('click', () => {
    document.getElementById('fam-toggle').checked = false; // Close menu
    checkVerification(() => {
      openAddTransactionModal(() => {
        const path = window.location.pathname || '/dashboard';
        if (path === '/dashboard' || path === '/transaksi') handleRoute();
      });
    });
  });

  document.getElementById('btn-fam-wishlist')?.addEventListener('click', () => {
    document.getElementById('fam-toggle').checked = false; // Close menu
    navigateTo('/tabungan');
  });

  document.getElementById('btn-fam-calculator')?.addEventListener('click', () => {
    document.getElementById('fam-toggle').checked = false; // Close menu
    openCalculator();
  });

  document.getElementById('btn-fam-scan-receipt')?.addEventListener('click', () => {
    document.getElementById('fam-toggle').checked = false; // Close menu
    checkVerification(() => {
      openScanReceiptModal();
    });
  });

  // 3. Click Outside to Close FAM & Intercept Sidebar Link Clicks (SPA Routing)
  document.addEventListener('click', (e) => {
    const famContainer = document.querySelector('.menu-tooltip-container');
    const famToggle = document.getElementById('fam-toggle');
    
    if (famToggle && famToggle.checked && famContainer && !famContainer.contains(e.target)) {
      famToggle.checked = false;
    }

    // Intercept relative internal link clicks starting with '/' for SPA Browser routing
    const link = e.target.closest('a');
    if (link) {
      const href = link.getAttribute('href');
      if (href && href.startsWith('/')) {
        e.preventDefault();
        document.getElementById('profile-dropdown')?.classList.remove('active');
        document.getElementById('notif-dropdown')?.classList.remove('active');
        navigateTo(href);
      }
    }
  });

  // 4. Search Bar
  document.getElementById('global-search')?.addEventListener('input', (e) => {
    if (e.target.value && window.location.pathname !== '/transaksi') {
      navigateTo('/transaksi');
    }
  });

  // 5. Scroll Lock Observer (Locks background scrolling/sliding when any modal or mobile sidebar is open)
  const scrollLockObserver = new MutationObserver(() => {
    const hasActiveModal = document.querySelector('.modal-overlay') || 
                           document.querySelector('.modal-card') || 
                           document.querySelector('.detail-tx-overlay') || 
                           document.querySelector('.custom-alert-overlay') ||
                           document.querySelector('.sidebar.mobile-active') ||
                           document.querySelector('.sidebar-overlay.active');
    const mainContent = document.querySelector('.main-content');
    const appLayout = document.getElementById('app-layout');

    if (hasActiveModal) {
      document.body.style.setProperty('overflow', 'hidden', 'important');
      document.body.style.setProperty('height', '100vh', 'important');
      document.documentElement.style.setProperty('overflow', 'hidden', 'important');
      document.documentElement.style.setProperty('height', '100vh', 'important');
      if (mainContent) {
        mainContent.style.setProperty('overflow-x', 'hidden', 'important');
        mainContent.style.setProperty('overflow-y', 'hidden', 'important');
        mainContent.style.setProperty('max-height', '100vh', 'important');
      }
      if (appLayout) {
        appLayout.style.setProperty('overflow-x', 'hidden', 'important');
        appLayout.style.setProperty('overflow-y', 'hidden', 'important');
        appLayout.style.setProperty('max-height', '100vh', 'important');
      }
    } else {
      document.body.style.removeProperty('overflow');
      document.body.style.removeProperty('height');
      document.documentElement.style.removeProperty('overflow');
      document.documentElement.style.removeProperty('height');
      if (mainContent) {
        mainContent.style.removeProperty('overflow-x');
        mainContent.style.removeProperty('overflow-y');
        mainContent.style.removeProperty('max-height');
      }
      if (appLayout) {
        appLayout.style.removeProperty('overflow-x');
        appLayout.style.removeProperty('overflow-y');
        appLayout.style.removeProperty('max-height');
      }
    }
  });
  scrollLockObserver.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

});

export function initNetworkStatus() {
  const statusEl = document.getElementById('network-status');
  if (!statusEl) return;

  function updateStatus() {
    statusEl.classList.remove('status-online', 'status-weak', 'status-offline');
    
    if (!navigator.onLine) {
      statusEl.classList.add('status-offline');
      statusEl.title = 'Terputus (Offline)';
      return;
    }

    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn) {
      const slowTypes = ['slow-2g', '2g', '3g'];
      const isSlowType = slowTypes.includes(conn.effectiveType);
      const isSlowDownlink = conn.downlink && conn.downlink < 1.5;
      const isHighLatency = conn.rtt && conn.rtt > 500;
      
      if (isSlowType || conn.saveData || isSlowDownlink || isHighLatency) {
        statusEl.classList.add('status-weak');
        statusEl.title = 'Sinyal Lemah / Lambat';
        return;
      }
    }

    statusEl.classList.add('status-online');
    statusEl.title = 'Terkoneksi (Online)';
  }

  window.addEventListener('online', updateStatus);
  window.addEventListener('offline', updateStatus);

  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (conn) {
    conn.addEventListener('change', updateStatus);
  }

  updateStatus();
}

window.addEventListener('popstate', handleRoute);
