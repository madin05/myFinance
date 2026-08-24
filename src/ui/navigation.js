import { store } from '../store.js';
import { auth } from '../firebase-config.js';
import { showConfirm } from '../components/notifications.js';
import { navigateTo } from '../router.js';

export function initNavigation() {
  const layout = document.getElementById('app-layout');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  // 1. Theme Helpers
  const applyTheme = (theme) => {
    const safeTheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', safeTheme);
    localStorage.setItem('theme', safeTheme);
    
    // Sync all animated toggle checkboxes
    document.querySelectorAll('#themeToggle, #themeToggleDropdown, .themeToggleInput').forEach(toggleInput => {
      toggleInput.checked = safeTheme === 'dark';
    });

    // Deactivate auto buttons when a manual choice is made
    document.querySelectorAll('#btn-theme-auto, #btn-theme-auto-dropdown').forEach(btn => btn.classList.remove('active'));
  };

  // System/Auto: follows device OS preference
  const applySystemTheme = () => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const effective = isDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', effective);
    localStorage.setItem('theme', 'system');
    
    document.querySelectorAll('#themeToggle, #themeToggleDropdown, .themeToggleInput').forEach(toggleInput => {
      toggleInput.checked = isDark;
    });

    document.querySelectorAll('#btn-theme-auto, #btn-theme-auto-dropdown').forEach(btn => btn.classList.add('active'));
  };

  // React to OS preference changes when in system mode
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (localStorage.getItem('theme') === 'system') applySystemTheme();
  });

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
        document.body.style.overflow = 'hidden';
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

    // Close Sidebar on Nav Click or Logo Click (Mobile Only, exclude dropdown toggles)
    const navItem = e.target.closest('.nav-item');
    const isDropdownToggle = e.target.closest('.nav-dropdown-toggle');
    if ((navItem || e.target.closest('.logo-wrapper')) && !isDropdownToggle && window.innerWidth <= 768) {
      closeMobileSidebar();
    }

    // Theme Toggle (Animated Checkbox & Dropdown Theme Row)
    const themeInput = e.target.closest('#themeToggle, #themeToggleDropdown, .themeToggleInput');
    if (themeInput) {
      const newTheme = themeInput.checked ? 'dark' : 'light';
      applyTheme(newTheme);
      if (e.target.closest('#profile-dropdown')) {
        document.getElementById('profile-dropdown')?.classList.remove('active');
      }
    } else {
      const themeRow = e.target.closest('#dropdown-theme-row');
      if (themeRow) {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
        if (e.target.closest('#profile-dropdown')) {
          document.getElementById('profile-dropdown')?.classList.remove('active');
        }
      }
    }

    // Auto / System theme button
    if (e.target.closest('#btn-theme-auto, #btn-theme-auto-dropdown')) {
      applySystemTheme();
      if (e.target.closest('#profile-dropdown')) {
        document.getElementById('profile-dropdown')?.classList.remove('active');
      }
    }

    // Trigger Product Tutorial from Sidebar
    if (e.target.closest('#btn-sidebar-tutorial')) {
      const { startProductTutorial } = await import('../components/tutorial.js');
      startProductTutorial(true);
    }

    // --- Header Dropdowns Multi-Logic (Profile & Notifications) ---
    const pTrigger = e.target.closest('#user-profile-trigger');
    const nTrigger = e.target.closest('#notif-trigger');
    
    const pDrop = document.getElementById('profile-dropdown');
    const nDrop = document.getElementById('notif-dropdown');

    if (pTrigger) {
      if (!e.target.closest('#profile-dropdown')) {
        // Klik avatar / area luar dropdown menu: toggle profile dropdown
        pDrop?.classList.toggle('active');
        nDrop?.classList.remove('active');
      } else {
        // Klik di dalam dropdown menu
        const isThemeToggle = e.target.closest('.theme-toggle-group, .themeToggleInput, #themeToggleDropdown, .profile-dropdown-theme-wrapper');
        const itemClicked = e.target.closest('a, button');
        if (itemClicked && !isThemeToggle) {
          pDrop?.classList.remove('active');
        }
      }
    } else if (nTrigger) {
      nDrop?.classList.toggle('active');
      pDrop?.classList.remove('active');
      
      // Render dynamical contents when opening
      if (nDrop?.classList.contains('active')) {
        renderNotificationDropdown();
      }
    } else {
      // Close dropdowns when clicking outside
      pDrop?.classList.remove('active');
      if (nDrop && !e.target.closest('#notif-dropdown')) {
        nDrop.classList.remove('active');
      }
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
  if (savedTheme === 'system') {
    applySystemTheme();
  } else {
    applyTheme(savedTheme);
  }

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

  // 4. Manage and Sync Header Notifications System Dynamically
  const renderNotificationDropdown = () => {
    const dropList = document.querySelector('#notif-dropdown .dropdown-list');
    if (!dropList) return;
    
    const rawNotifs = store.notifications || [];
    const latest = rawNotifs.slice(0, 4);
    
    if (latest.length === 0) {
      dropList.innerHTML = `<div style="padding: 2.5rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">Belum ada notifikasi masuk.</div>`;
      return;
    }

    dropList.innerHTML = latest.map(n => {
      let iconClass = 'ph-fill ph-bell';
      let color = 'var(--primary)';
      let bgColor = 'rgba(79, 70, 229, 0.1)';
      
      if (n.source === 'Anggaran') { 
        iconClass = 'ph-fill ph-warning-circle'; 
        color = '#ef4444'; 
        bgColor = 'rgba(239, 68, 68, 0.1)'; 
      } else if (n.source === 'Wishlist') { 
        iconClass = 'ph-fill ph-sparkle'; 
        color = '#ec4899'; 
        bgColor = 'rgba(236, 72, 153, 0.1)'; 
      }

      return `
        <div class="notif-item" data-id="${n.id}" data-route="${n.route || ''}" style="opacity: ${n.read ? '0.6' : '1'}">
          <div class="notif-icon" style="background: ${bgColor}; color: ${color};">
            <i class="${iconClass}"></i>
          </div>
          <div class="notif-content">
            <p style="font-weight: ${n.read ? '500' : '700'}; color: var(--text-main);">${n.title}</p>
            <div class="notif-time">${new Date(n.time).toLocaleDateString('id-ID', {day:'numeric', month:'short'})}</div>
          </div>
        </div>
      `;
    }).join('');

    // Hook direct event delegation to items inside list for context redirection
    dropList.querySelectorAll('.notif-item').forEach(item => {
      item.onclick = (ev) => {
        ev.stopPropagation(); // prevent refire parent
        const id = parseInt(item.dataset.id);
        const target = store.notifications.find(n => n.id === id);
        if (target && !target.read) {
          target.read = true;
          store.save();
        }
        // Close dropdown
        document.getElementById('notif-dropdown')?.classList.remove('active');
        // Run Context Redirect
        const route = item.dataset.route;
        if (route && typeof navigateTo === 'function') {
          navigateTo(route);
        }
      };
    });
  };

  // Sync count and initial content
  store.syncHeaderBadge();
  window.addEventListener('store-updated', () => {
    store.syncHeaderBadge();
  });
}

export function closeMobileSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  
  if (sidebar) sidebar.classList.remove('mobile-active');
  if (overlay) overlay.classList.remove('active');
  
  document.body.style.overflow = '';
  
  // Reset all hamburger checkboxes
  document.querySelectorAll('.sidebar-checkbox').forEach(cb => cb.checked = false);
}
