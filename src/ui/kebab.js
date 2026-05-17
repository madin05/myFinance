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

/** Close the currently open kebab dropdown */
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
      if (!dropdown) return;

      const isOpen = dropdown.classList.contains('open');

      // Tutup dropdown lain dulu
      closeAllKebabs();

      if (!isOpen) {
        dropdown.classList.add('open');
        trigger.classList.add('active');
        _activeDropdown = dropdown;
        _activeTrigger = trigger;

        // autoUpdate: re-position saat scroll / resize / layout shift
        _autoUpdateCleanup = autoUpdate(trigger, dropdown, () => {
          positionDropdown(trigger, dropdown);
        });
      }
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
