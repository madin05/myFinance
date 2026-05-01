console.clear();
console.log('%c🚀 MYFINANCE APP STARTED', 'background: #222; color: #bada55; font-size: 24px; padding: 10px;');
import { store } from './store.js';
import { auth, onAuthStateChanged } from './firebase-config.js';
import { renderLogin } from './pages/login.js';
import { openAddTransactionModal } from './components/modal.js';
import { handleRoute } from './router.js';
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



// --- AUTH LOGIC ---
export async function checkAuth() {
  const loginView = document.getElementById('login-view');
  const appLayout = document.getElementById('app-layout');

  console.log('🔍 Checking Auth State...');

  // Observer tunggal untuk status login
  onAuthStateChanged(auth, async (user) => {
    console.log('👤 Auth State Changed:', user ? 'Logged In' : 'Logged Out');
    
    const avatarImg = document.getElementById('user-avatar');
    const avatarWrapper = document.querySelector('.avatar-wrapper');
    const navName = document.getElementById('nav-user-name');
    const navEmail = document.getElementById('nav-user-email');

    if (user) {
      const token = await user.getIdToken();
      
      // FIX: Jangan asal timpa data store pake data Firebase (biar nama 'Madins' gak balik ke nama panjang Google)
      if (store.user && store.user.uid === user.uid) {
        console.log('🔄 User already exists in store, updating token and syncing...');
        store.user.token = token;
        store.save();
        store.sync();
      } else {
        console.log('🆕 First time login or session expired, setting user from Firebase...');
        const userData = {
          uid: user.uid,
          name: user.displayName || 'User MyFinance',
          email: user.email,
          avatar: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`,
          token: token
        };
        store.setUser(userData);
      }

      const userData = store.user; // Pake data terbaru dari store

      // Update Navbar UI
      if (avatarImg) {
        avatarImg.src = userData.avatar;
        avatarImg.onload = () => {
          avatarImg.style.opacity = '1';
          avatarWrapper?.classList.remove('skeleton', 'skeleton-circle');
        };
      }
      if (navName) {
        navName.textContent = userData.name;
        navName.classList.remove('skeleton', 'skeleton-text');
      }
      if (navEmail) {
        navEmail.textContent = userData.email;
        navEmail.classList.remove('skeleton', 'skeleton-text');
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
