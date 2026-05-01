console.clear();
console.log('%c🚀 MYFINANCE APP STARTED', 'background: #222; color: #bada55; font-size: 24px; padding: 10px;');
import { store } from './store.js';
import { auth, onAuthStateChanged } from './firebase-config.js';
import { renderLogin } from './pages/login.js';
import { openAddTransactionModal } from './components/modal.js';
import { handleRoute, refreshCurrentPage } from './router.js';
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
        store.save(); // Ini bakal trigger store-updated -> refresh UI
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
        store.setUser(userData);
      }

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
  checkAuth();

  // 2. Global FAM Buttons
  document.getElementById('btn-fam-add-tx')?.addEventListener('click', () => {
    document.getElementById('fam-toggle').checked = false; // Close menu
    openAddTransactionModal(() => {
      const hash = window.location.hash || '#dashboard';
      if (hash === '#dashboard' || hash === '#transaksi') handleRoute();
    });
  });

  document.getElementById('btn-fam-wishlist')?.addEventListener('click', () => {
    document.getElementById('fam-toggle').checked = false; // Close menu
    window.location.hash = '#tabungan';
  });

  // 3. Click Outside to Close FAM
  document.addEventListener('click', (e) => {
    const famContainer = document.querySelector('.menu-tooltip-container');
    const famToggle = document.getElementById('fam-toggle');
    
    if (famToggle && famToggle.checked && famContainer && !famContainer.contains(e.target)) {
      famToggle.checked = false;
    }
  });

  // 4. Search Bar
  document.getElementById('global-search')?.addEventListener('input', (e) => {
    if (e.target.value && window.location.hash !== '#transaksi') {
      window.location.hash = '#transaksi';
    }
  });


});

window.addEventListener('hashchange', handleRoute);
