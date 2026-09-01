/**
 * kebab.js — Shared Kebab Menu Utility (v4 - Floating UI)
 *
 * Menggunakan Floating UI untuk viewport collision detection:
 *  - flip(): otomatis pindah ke atas jika ruang di bawah tidak cukup
 *  - shift(): bergeser horizontal agar tetap di dalam viewport
 *  - offset(): jarak antara trigger dan dropdown
 *  - autoUpdate(): re-compute saat scroll / resize
 *
 * Strategy: position 'fixed' agar dropdown tidak ter-clip oleh parent
 * yang punya overflow: hidden atau stacking context bermasalah.
 *
 * Usage:
 *   import { initKebabs, cleanupKebabs } from '../ui/kebab.js';
 *   initKebabs(containerEl, onEdit, onDelete);
 */

import {
  computePosition,
  flip,
  shift,
  offset,
  autoUpdate,
} from '@floating-ui/dom';

// Singleton state agar tidak ada listener / dropdown numpuk
let _docClickHandler = null;
let _activeDropdown = null;
let _activeTrigger = null;
let _autoUpdateCleanup = null;

/**
 * Hitung & terapkan posisi dropdown menggunakan Floating UI.
 * Dipanggil oleh autoUpdate setiap kali viewport / scroll berubah.
 */
async function positionDropdown(trigger, dropdown) {
  const { x, y, placement } = await computePosition(trigger, dropdown, {
    placement: 'bottom-end',
    strategy: 'fixed',
    middleware: [
      offset(8),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
    ],
  });

  Object.assign(dropdown.style, {
    left: `${x}px`,
    top: `${y}px`,
  });

  // Simpan placement aktual untuk styling caret & transform-origin
  dropdown.dataset.placement = placement;
}

export function closeAllKebabs() {
  if (_autoUpdateCleanup) {
    _autoUpdateCleanup();
    _autoUpdateCleanup = null;
  }
  if (_activeDropdown) {
    _activeDropdown.classList.remove('open');
    _activeDropdown = null;
  }
  if (_activeTrigger) {
    _activeTrigger.classList.remove('active');
    // Remove z-index boost from the parent card
    const card = _activeTrigger.closest('.stat-card') || _activeTrigger.closest('tr') || _activeTrigger.closest('.wishlist-item');
    if (card) card.style.zIndex = '';
    _activeTrigger = null;
  }
}

/**
 * Initialize kebab menus inside a container.
 *
 * @param {HTMLElement} container   — scoped parent (e.g. tbody, page-content)
 * @param {Function} onEdit(id)     — callback for edit action
 * @param {Function} onDelete(id)   — callback for delete action
 * @param {Function} onView(id)     — callback for view action
 */
export function initKebabs(container, onEdit, onDelete, onView) {
  // Reset listener lama agar tidak numpuk
  if (_docClickHandler) {
    document.removeEventListener('click', _docClickHandler);
    _docClickHandler = null;
  }

  // Listener close: tutup kalau klik di luar wrapper/dropdown
  _docClickHandler = (e) => {
    if (
      !e.target.closest('.kebab-wrapper') &&
      !e.target.closest('.kebab-dropdown')
    ) {
      closeAllKebabs();
    }
  };
  document.addEventListener('click', _docClickHandler);

  // Toggle trigger
  container.querySelectorAll('.kebab-trigger').forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = trigger.dataset.id;
      const dropdown = container.querySelector(
        `.kebab-dropdown[data-kebab-for="${id}"]`
      );
      // Jika dropdown sudah dipindah ke body sebelumnya, cari di body
      const actualDropdown = dropdown || document.querySelector(`.kebab-dropdown[data-kebab-for="${id}"]`);
      if (!actualDropdown) return;

      const isOpen = actualDropdown.classList.contains('open');

      // Tutup dropdown lain dulu
      closeAllKebabs();

      if (!isOpen) {
        // Pindahkan dropdown ke body agar tidak terkena overflow: hidden dari parent (seperti stat-card)
        if (actualDropdown.parentElement !== document.body) {
          // Simpan referensi parent aslinya untuk cleanup jika diperlukan (meski tidak wajib karena id unik)
          document.body.appendChild(actualDropdown);
        }

        actualDropdown.classList.add('open');
        trigger.classList.add('active');
        _activeDropdown = actualDropdown;
        _activeTrigger = trigger;

        // autoUpdate: re-position saat scroll / resize / layout shift
        _autoUpdateCleanup = autoUpdate(trigger, actualDropdown, () => {
          positionDropdown(trigger, actualDropdown);
        });
      }
    });
  });

  // View button
  container.querySelectorAll('.kebab-view').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllKebabs();
      onView && onView(btn.dataset.id);
    });
  });

  // Edit button
  container.querySelectorAll('.kebab-edit').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllKebabs();
      onEdit && onEdit(btn.dataset.id);
    });
  });

  // Delete button
  container.querySelectorAll('.kebab-delete').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeAllKebabs();
      onDelete && onDelete(btn.dataset.id);
    });
  });
}

export function cleanupKebabs() {
  closeAllKebabs();
  if (_docClickHandler) {
    document.removeEventListener('click', _docClickHandler);
    _docClickHandler = null;
  }
  // Remove any orphaned dropdowns that were moved to body
  document.querySelectorAll('body > .kebab-dropdown').forEach(dropdown => {
    dropdown.remove();
  });
}
