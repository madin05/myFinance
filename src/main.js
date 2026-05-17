import { store } from './store.js';
import { auth, onAuthStateChanged, getRedirectResult } from './firebase-config.js';
import { renderLogin } from './pages/login.js';
import { openAddTransactionModal } from './components/modal.js';
import { openCalculator } from './components/calculator.js';
import { handleRoute, refreshCurrentPage, navigateTo } from './router.js';
import { hideLoading } from './utils.js';
import { initNavigation } from './ui/navigation.js';
import { initCustomSelects } from './ui/select.js';
import { showConfirm } from './components/notifications.js';
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
});

// --- AUTH LOGIC ---
export async function checkAuth() {
  const loginView = document.getElementById('login-view');
  const appLayout = document.getElementById('app-layout');

  console.log('Checking Auth State...');

  // ─── STEP 1: Selesaikan pending redirect result DULU (mobile Google login) ───
  // Harus di-await SEBELUM onAuthStateChanged di-register.
  // Kalau tidak, onAuthStateChanged bisa fire dengan user=null sebelum Firebase
  // selesai memproses redirect credential → login page flash → kesan "harus login 2x".
  try {
    const redirectResult = await getRedirectResult(auth);
    if (redirectResult?.user) {
      console.log('Google redirect selesai diproses untuk:', redirectResult.user.email);
      // Firebase sudah update auth state internal → onAuthStateChanged di bawah
      // akan fire dengan user yang benar. Tidak perlu lakukan apa-apa di sini.
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
  // Pada titik ini, Firebase sudah settle auth state (termasuk dari redirect).
  // onAuthStateChanged PERTAMA akan langsung fire dengan user yang benar.
  onAuthStateChanged(auth, async (user) => {
    console.log('Auth State Changed:', user ? 'Logged In' : 'Logged Out');
    
    if (user) {
      // Periksa apakah email belum diverifikasi (hanya untuk email/password login)
      const isEmailProvider = user.providerData.some(p => p.providerId === 'password');
      if (isEmailProvider && !user.emailVerified) {
        console.log('Email belum diverifikasi. Membatalkan akses...');
        loginView.style.display = 'block';
        appLayout.style.display = 'none';
        renderLogin('verification-pending', user.email);
        return;
      }

      const token = await user.getIdToken();
      
      // FIX: Sync data profil dari Firebase
      if (store.user && store.user.uid === user.uid) {
        console.log('User already exists, checking for profile updates...');
        store.user.token = token;

        // Kami hapus auto-sync PP dan nama dari Google agar PP yang sudah diubah di web 
        // tidak tertimpa/balik lagi ke foto profil Google saat login ulang.
        
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
          provider: user.providerData[0]?.providerId || 'unknown'
        };
        // Hindari mengirim data profil awal sebagai parameter update (extraData)
        // agar tidak menimpa data (PP/Nama) yang mungkin sudah ada di database saat user login di device baru.
        store.setUser(userData);
      }

      // Pastikan route diproses dulu (rendering halaman) baru sinkronkan UI/Avatar
      handleRoute();
      
      // Delay sedikit agar elemen halaman baru (misal: #profile-preview) sudah dirender
      setTimeout(() => {
        store.updateUI();
      }, 300);

      loginView.style.display = 'none';
      appLayout.style.display = 'flex';
      
      const currentPath = window.location.pathname;
      const validRoutes = ['/dashboard', '/transaksi', '/anggaran', '/tabungan', '/laporan', '/akun', '/faq', '/notifikasi'];
      if (!validRoutes.includes(currentPath)) {
        navigateTo('/dashboard');
      }
    } else {
      // Tidak ada user (dan tidak ada pending redirect — sudah dicek di Step 1)
      loginView.style.display = 'block';
      appLayout.style.display = 'none';
      renderLogin();
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

  // 2. Global FAM Buttons
  document.getElementById('btn-fam-add-tx')?.addEventListener('click', () => {
    document.getElementById('fam-toggle').checked = false; // Close menu
    openAddTransactionModal(() => {
      const path = window.location.pathname || '/dashboard';
      if (path === '/dashboard' || path === '/transaksi') handleRoute();
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
