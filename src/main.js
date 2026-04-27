import '../style.css';
import { store } from './store.js';
import { handleRoute } from './router.js';
import { renderLogin } from './pages/login.js';
import { openAddTransactionModal, openConfirmModal } from './components/modal.js';

function checkAuth() {
  const loginView = document.getElementById('login-view');
  const appLayout = document.getElementById('app-layout');

  if (!store.user) {
    appLayout.style.display = 'none';
    loginView.style.display = 'block';
    renderLogin();
  } else {
    loginView.style.display = 'none';
    appLayout.style.display = 'flex';
    handleRoute();
    
    // Restore sidebar state
    if (localStorage.getItem('sidebar-collapsed') === 'true') {
      document.getElementById('app-layout').classList.add('sidebar-collapsed');
    }
    
    // Initialize Theme
    initTheme();
  }
}

// Theme Toggle Logic
const initTheme = () => {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
};

const updateThemeIcon = (theme) => {
  const icon = document.querySelector('#btn-theme-toggle i');
  if (!icon) return;
  if (theme === 'dark') {
    icon.classList.remove('ph-moon');
    icon.classList.add('ph-sun');
  } else {
    icon.classList.remove('ph-sun');
    icon.classList.add('ph-moon');
  }
};

// Global Event Listeners
window.addEventListener('hashchange', () => {
  checkAuth();
});

// Use delegation for buttons that might move or be re-rendered
document.addEventListener('click', (e) => {
  // Logout handler
  if (e.target.closest('#btn-logout')) {
    openConfirmModal(
      'Konfirmasi Logout',
      'Yakin ingin keluar dari akun kamu bre?',
      () => {
        store.logout();
        window.location.hash = '';
        checkAuth();
      }
    );
  }

  // Profile Dropdown Toggle
  const profileTrigger = e.target.closest('#user-profile-trigger');
  const dropdown = document.getElementById('profile-dropdown');
  
  if (profileTrigger) {
    dropdown.classList.toggle('active');
  } else if (dropdown && !e.target.closest('#profile-dropdown')) {
    dropdown.classList.remove('active');
  }

  // Mobile Sidebar Logic
  if (e.target.closest('#btn-open-sidebar-mobile')) {
    toggleMobileSidebar(true);
  } else if (e.target.closest('#sidebar-overlay')) {
    toggleMobileSidebar(false);
  } else if (e.target.closest('.nav-item')) {
    if (window.innerWidth <= 768) {
      toggleMobileSidebar(false);
    }
    // Also close profile dropdown when navigating
    if (dropdown) dropdown.classList.remove('active');
  }
});

document.getElementById('btn-tambah-global').addEventListener('click', () => {
  openAddTransactionModal(() => {
    const hash = window.location.hash || '#dashboard';
    if (hash === '#dashboard' || hash === '#transaksi') {
      handleRoute();
    }
  });
});

document.getElementById('btn-toggle-sidebar').addEventListener('click', () => {
  const layout = document.getElementById('app-layout');
  layout.classList.toggle('sidebar-collapsed');
  
  const isCollapsed = layout.classList.contains('sidebar-collapsed');
  localStorage.setItem('sidebar-collapsed', isCollapsed);
});

document.getElementById('btn-theme-toggle').addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeIcon(newTheme);
});

// Global Search Redirect
document.getElementById('global-search').addEventListener('input', (e) => {
  if (e.target.value && window.location.hash !== '#transaksi') {
    window.location.hash = '#transaksi';
  }
});

const toggleMobileSidebar = (show) => {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!sidebar || !overlay) return;

  if (show) {
    sidebar.classList.add('mobile-active');
    overlay.classList.add('active');
  } else {
    sidebar.classList.remove('mobile-active');
    overlay.classList.remove('active');
  }
};

checkAuth();
