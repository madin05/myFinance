/**
 * kebab.js — Shared Kebab Menu Utility (v3 - Reliable)
 *
 * Menggunakan pendekatan CSS overflow:visible pada parent card
 * saat dropdown dibuka, sehingga tidak perlu memindahkan DOM element.
 *
 * Usage:
 *   import { initKebabs, cleanupKebabs } from '../ui/kebab.js';
 *   initKebabs(containerEl, onEdit, onDelete);
 */

// Singleton: satu listener close per page agar tidak numpuk
let _docClickHandler = null;
let _activeDropdown = null;
let _activeTrigger = null;

/** Close the currently open kebab dropdown */
export function closeAllKebabs() {
  if (_activeDropdown) {
    _activeDropdown.classList.remove('open');
    // Kembalikan overflow parent card
    const card = _activeDropdown.closest('.stat-card, tr, .wishlist-item');
    if (card) card.style.overflow = '';
    _activeDropdown = null;
  }
  if (_activeTrigger) {
    _activeTrigger.classList.remove('active');
    _activeTrigger = null;
  }
}

/**
 * Initialize kebab menus inside a container.
 *
 * @param {HTMLElement} container   — scoped parent (e.g. tbody, page-content)
 * @param {Function} onEdit(id)     — callback for edit action
 * @param {Function} onDelete(id)   — callback for delete action
 */
export function initKebabs(container, onEdit, onDelete) {
  // Hapus listener lama agar tidak numpuk
  if (_docClickHandler) {
    document.removeEventListener('click', _docClickHandler);
    _docClickHandler = null;
  }

  // Pasang listener close baru (singleton)
  _docClickHandler = (e) => {
    if (!e.target.closest('.kebab-wrapper')) {
      closeAllKebabs();
    }
  };
  document.addEventListener('click', _docClickHandler);

  // Toggle trigger
  container.querySelectorAll('.kebab-trigger').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = trigger.dataset.id;
      const dropdown = container.querySelector(`.kebab-dropdown[data-kebab-for="${id}"]`);
      if (!dropdown) return;

      const isOpen = dropdown.classList.contains('open');

      // Tutup yang sedang buka
      closeAllKebabs();

      if (!isOpen) {
        dropdown.classList.add('open');
        trigger.classList.add('active');
        _activeDropdown = dropdown;
        _activeTrigger = trigger;

        // Buka overflow parent agar dropdown tidak ter-clip
        const card = dropdown.closest('.stat-card, tr, .wishlist-item, [style*="overflow"]');
        if (card) card.style.overflow = 'visible';
      }
    });
  });

  // Edit button
  container.querySelectorAll('.kebab-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllKebabs();
      onEdit && onEdit(btn.dataset.id);
    });
  });

  // Delete button
  container.querySelectorAll('.kebab-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllKebabs();
      onDelete && onDelete(btn.dataset.id);
    });
  });
}

/**
 * Cleanup: tutup semua kebab yang terbuka dan reset listener.
 * Panggil ini sebelum re-render halaman.
 */
export function cleanupKebabs() {
  closeAllKebabs();
  if (_docClickHandler) {
    document.removeEventListener('click', _docClickHandler);
    _docClickHandler = null;
  }
}
