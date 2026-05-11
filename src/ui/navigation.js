import { store } from '../store.js';
import { auth } from '../firebase-config.js';
import { showConfirm } from '../components/notifications.js';
import { navigateTo } from '../router.js';

export function initNavigation() {
  const layout = document.getElementById('app-layout');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  // 1. Theme Helper
  const applyTheme = (theme) => {
    const safeTheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', safeTheme);
    localStorage.setItem('theme', safeTheme);
    
    // Sync animated toggle checkbox
    const toggleInput = document.getElementById('themeToggle');
    if (toggleInput) {
      toggleInput.checked = safeTheme === 'dark';
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

    // Close Sidebar on Nav Click or Logo Click (Mobile Only)
    if ((e.target.closest('.nav-item') || e.target.closest('.logo-wrapper')) && window.innerWidth <= 768) {
      closeMobileSidebar();
    }

    // Theme Toggle (Animated Checkbox)
    const themeInput = e.target.closest('#themeToggle');
    if (themeInput) {
      const newTheme = themeInput.checked ? 'dark' : 'light';
      applyTheme(newTheme);
    }

    // --- Header Dropdowns Multi-Logic (Profile & Notifications) ---
    const pTrigger = e.target.closest('#user-profile-trigger');
    const nTrigger = e.target.closest('#notif-trigger');
    
    const pDrop = document.getElementById('profile-dropdown');
    const nDrop = document.getElementById('notif-dropdown');

    if (pTrigger) {
      pDrop?.classList.toggle('active');
      nDrop?.classList.remove('active');
    } else if (nTrigger) {
      nDrop?.classList.toggle('active');
      pDrop?.classList.remove('active');
      
      // Clear badge when explicitly viewed
      const badge = nTrigger.querySelector('.header-badge');
      if (badge) badge.style.display = 'none';
    } else {
      // Clicked completely outside all dropdowns & triggers? Close everything.
      if (pDrop && !e.target.closest('#profile-dropdown')) pDrop.classList.remove('active');
      if (nDrop && !e.target.closest('#notif-trigger') && !e.target.closest('#notif-dropdown')) nDrop.classList.remove('active');
    }

    if (e.target.closest('#btn-logout')) {
      const yakin = await showConfirm('Konfirmasi Logout', 'Yakin mau keluar?');
      if (yakin) {
        auth.signOut().then(async () => {
          await store.logout();
          window.location.href = '/login';
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

  // Inisialisasi preferensi kustomisasi & kinerja pengguna
  if (localStorage.getItem('disable-animations') === 'true') {
    document.body.classList.add('disable-animations');
  }
  if (localStorage.getItem('layout-density') === 'compact') {
    document.body.classList.add('layout-compact');
  }

  // 4. Automatically update Notification Count badge from current list contents
  const syncBadgeCount = () => {
    const badge = document.querySelector('#notif-trigger .header-badge');
    const items = document.querySelectorAll('#notif-dropdown .notif-item');
    if (!badge) return;
    
    const count = items.length;
    if (count === 0) {
      badge.style.display = 'none';
    } else {
      badge.style.display = 'flex';
      badge.textContent = count > 9 ? '9+' : count;
    }
  };
  syncBadgeCount();
}

export function closeMobileSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  
  if (sidebar) sidebar.classList.remove('mobile-active');
  if (overlay) overlay.classList.remove('active');
  
  // Reset all hamburger checkboxes
  document.querySelectorAll('.sidebar-checkbox').forEach(cb => cb.checked = false);
}
