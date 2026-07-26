import { store } from './store.js';
import { auth, onAuthStateChanged, onIdTokenChanged, getRedirectResult, applyActionCode } from './firebase-config.js';
import { userService } from './services/userService.js';
import { renderLogin, renderEmailVerificationBanner } from './pages/login.js';
import { openAddTransactionModal } from './components/modal.js';
import { openCalculator } from './components/calculator.js';
import { openScanReceiptModal } from './components/scanReceipt.js';
import { handleRoute, refreshCurrentPage, navigateTo } from './router.js';
import { hideLoading, initStickyHeader } from './utils.js';
import { initNavigation } from './ui/navigation.js';
import { initCustomSelects } from './ui/select.js';
import { showConfirm, checkVerification } from './components/notifications.js';

import './css/variables.css';
import './css/base.css';
import './css/components/buttons.css';
import './css/components/sidebar.css';
import './css/components/header.css';
import './css/components/cards.css';
import './css/components/table.css';
import './css/components/widgets.css';
import './css/components/modal.css';
import './css/components/dialogs.css';
import './css/pages/login.css';
import './css/pages/error404.css';
import './css/pages/faq.css';
import './css/components/tutorial.css';
import './css/responsive.css';
import './css/components/custom-select.css';
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

  // Jika user sudah verified dan alert sudah pernah ditampilkan, cegah pemanggilan ulang popup!
  if (user.emailVerified && sessionStorage.getItem('email_verified_alert_shown')) {
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

      sessionStorage.setItem('email_verified_alert_shown', 'true');

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

      // Pastikan route diproses dulu (rendering halaman) baru sinkronkan UI/Avatar
      handleRoute();
      
      // Delay sedikit agar elemen halaman baru (misal: #profile-preview) sudah dirender
      setTimeout(() => {
        store.updateUI();
        // Tampilkan banner verifikasi jika email belum diverifikasi
        if (needsVerification) {
          if (!window.isVerificationModalActive && !document.getElementById('optional-verif-modal-overlay')) {
            renderEmailVerificationBanner(user);
          }
        } else {
          // Pastikan banner disembunyikan jika sudah verified
          const banner = document.getElementById('email-verify-banner');
          if (banner) banner.style.display = 'none';

          // Trigger Onboarding Product Tour (otomatis hanya berjalan 1x untuk pengguna baru terverifikasi)
          import('./components/tutorial.js').then(m => m.startProductTutorial());
        }
      }, 300);

      loginView.style.display = 'none';
      appLayout.style.display = 'flex';
      
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

  // Re-verify & auto-renew session saat user kembali ke tab browser (misal laptop habis sleep)
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

  // 2. Global FAM Buttons
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

  // 5. Scroll Lock Observer (Locks background scrolling/sliding when any modal is open)
  const scrollLockObserver = new MutationObserver(() => {
    const hasActiveModal = document.querySelector('.modal-overlay') || 
                           document.querySelector('.modal-card') || 
                           document.querySelector('.custom-alert-overlay');
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
  scrollLockObserver.observe(document.body, { childList: true, subtree: true });

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
