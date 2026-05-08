console.clear();
console.log('%c🚀 MYFINANCE APP STARTED', 'background: #222; color: #bada55; font-size: 24px; padding: 10px;');
import { store } from './store.js';
import { auth, onAuthStateChanged } from './firebase-config.js';
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

  console.log('🔍 Checking Auth State...');

  onAuthStateChanged(auth, async (user) => {
    console.log('👤 Auth State Changed:', user ? 'Logged In' : 'Logged Out');
    
    if (user) {
      const token = await user.getIdToken();
      
      // FIX: Jangan asal timpa data store pake data Firebase
      if (store.user && store.user.uid === user.uid) {
        console.log('🔄 User already exists, updating token...');
        store.user.token = token;
        if (store.transactions.length === 0) {
          store.isSyncing = true;
        }
        store.save(); // Ini bakal trigger updateUI & ngelepas skeleton secara instan
        store.sync();
      } else {
        console.log('🆕 First time login, setting user...');
        const userData = {
          uid: user.uid,
          name: user.displayName || 'User MyFinance',
          email: user.email,
          avatar: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
          token: token
        };
        store.setUser(userData); // Ini juga bakal panggil updateUI & lepas skeleton
      }

      // Pastiin sekali lagi UI ke-update pake data terbaru (lokal/cloud)
      store.updateUI();

      loginView.style.display = 'none';
      appLayout.style.display = 'flex';
      handleRoute();
    } else {
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
