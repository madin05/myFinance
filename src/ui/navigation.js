import { store } from '../store.js';
import { auth } from '../firebase-config.js';
import { showConfirm } from '../components/notifications.js';

export function initNavigation() {
  const layout = document.getElementById('app-layout');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  // 1. Theme Helper
  const applyTheme = (theme) => {
    const safeTheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', safeTheme);
    localStorage.setItem('theme', safeTheme);
    const iconEl = document.querySelector('#btn-theme-toggle i');
    if (iconEl) {
      iconEl.className = safeTheme === 'dark' ? 'ph ph-sun' : 'ph ph-moon';
    }
  };

  // 2. Global Click Handler (Event Delegation)
  document.addEventListener('click', async (e) => {
    
    // Toggle Desktop Sidebar
    if (e.target.closest('#btn-toggle-sidebar')) {
      layout.classList.toggle('sidebar-collapsed');
      localStorage.setItem('sidebar-collapsed', layout.classList.contains('sidebar-collapsed'));
    }

    // Handle Animated Hamburger Checkboxes (Sync State)
    const cb = e.target.closest('.sidebar-checkbox');
    if (cb) {
      if (cb.checked) {
        sidebar.classList.add('mobile-active');
        overlay.classList.add('active');
        // Sync all other checkboxes
        document.querySelectorAll('.sidebar-checkbox').forEach(input => input.checked = true);
      } else {
        closeMobileSidebar();
      }
    }

    // Close Mobile Sidebar (Overlay)
    if (e.target.closest('#sidebar-overlay')) {
      closeMobileSidebar();
    }

    // Close Sidebar on Nav Click (Mobile Only)
    if (e.target.closest('.nav-item') && window.innerWidth <= 768) {
      closeMobileSidebar();
    }

    // Theme Toggle
    if (e.target.closest('#btn-theme-toggle')) {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
    }

    // Profile Dropdown
    const profileTrigger = e.target.closest('#user-profile-trigger');
    const dropdown = document.getElementById('profile-dropdown');
    if (profileTrigger) {
      dropdown.classList.toggle('active');
    } else if (dropdown && !e.target.closest('#profile-dropdown')) {
      dropdown.classList.remove('active');
    }

    // Logout
    if (e.target.closest('#btn-logout')) {
      const yakin = await showConfirm('Konfirmasi Logout', 'Yakin mau keluar?');
      if (yakin) {
        auth.signOut().then(() => {
          store.logout();
          window.location.hash = '#login';
        });
      }
    }
  });

  // 3. Initialize States on Load
  const savedTheme = localStorage.getItem('theme') || 'light';
  applyTheme(savedTheme);

  if (localStorage.getItem('sidebar-collapsed') === 'true') {
    layout.classList.add('sidebar-collapsed');
  }
}

export function closeMobileSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  
  if (sidebar) sidebar.classList.remove('mobile-active');
  if (overlay) overlay.classList.remove('active');
  
  // Reset all hamburger checkboxes
  document.querySelectorAll('.sidebar-checkbox').forEach(cb => cb.checked = false);
}
