/**
 * @module modalCore
 * Shared modal utilities: container access, close animation,
 * event binding (overlay click, Escape, touch swipe-down),
 * and IDR currency input helpers.
 */

// --- PRIVATE HELPERS ---

/** @returns {HTMLElement|null} The global modal mount point */
export function getContainer() {
  return document.getElementById('modal-container');
}

// --- CLOSE ANIMATION ---

/**
 * Animates a modal out (scale-down on desktop, slide-down on mobile)
 * then clears the container innerHTML and invokes the callback.
 *
 * @param {HTMLElement|null} container - Modal container element
 * @param {Function|null}   callback  - Fired after animation completes
 */
export function animateCloseModal(container, callback) {
  const target = container || getContainer();
  if (!target) return;

  const card = target.querySelector('.modal-content, .custom-alert-card, #calc-card, .detail-tx-content, .quick-action-card');
  const overlay = target.querySelector('.modal-overlay, .custom-alert-overlay, .detail-tx-overlay');

  // Drop any lingering gesture classes so their !important transforms
  // don't fight the close animation.
  if (card) {
    card.classList.remove('sheet-drag', 'sheet-snap', 'sheet-close');
    card.style.removeProperty('--sheet-y');
  }

  if (overlay) {
    overlay.classList.remove('active');
    overlay.classList.add('closing');
  }

  if (window.innerWidth <= 768) {
    if (card) {
      card.style.transition = 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)';
      card.style.transform = 'translateY(100%)';
    }
    if (overlay) {
      overlay.style.transition = 'opacity 0.28s ease';
      overlay.style.opacity = '0';
    }
  } else {
    if (card) {
      card.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      card.style.transform = 'scale(0.95)';
      card.style.opacity = '0';
    }
    if (overlay) {
      overlay.style.transition = 'opacity 0.2s ease';
      overlay.style.opacity = '0';
    }
  }

  setTimeout(() => {
    target.innerHTML = '';
    if (callback) callback();
  }, 280);
}

// --- EVENT BINDING ---

/**
 * Binds standard modal interaction events:
 *  - Overlay click-to-dismiss
 *  - Escape key dismiss
 *  - Touch swipe-down to dismiss (mobile bottom-sheet)
 *  - Close button(s) by ID
 *
 * @param {HTMLElement}   container   - Modal container element
 * @param {string}        overlayId   - ID of the overlay backdrop element
 * @param {string[]}      closeBtnIds - IDs of close/cancel buttons
 * @param {Function|null} onDismiss   - Called after the modal finishes closing
 * @returns {Function} close — callable to imperatively close the modal
 */
export function bindModalEvents(container, overlayId, closeBtnIds = [], onDismiss = null) {
  const overlay = document.getElementById(overlayId);

  if (overlay) {
    requestAnimationFrame(() => {
      overlay.classList.add('active');
    });
  }

  let cleanupTouch = () => {};

  /**
   * @param {boolean} [animate] - When false, tear down instantly (used after
   *   the swipe gesture has already played the slide-down itself).
   */
  const close = (animate = true) => {
    window.removeEventListener('keydown', handleKey);
    cleanupTouch();
    if (animate) {
      animateCloseModal(container, onDismiss);
    } else {
      if (container) container.innerHTML = '';
      if (onDismiss) onDismiss();
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Escape') close();
  };

  window.addEventListener('keydown', handleKey);

  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  closeBtnIds.forEach(id => {
    document.getElementById(id)?.addEventListener('click', close);
  });

  // --- Touch drag-to-dismiss gesture (mobile bottom sheet) ---
  const sheet = container?.querySelector('.modal-content, .detail-tx-content, .custom-alert-card, .quick-action-card, #calc-card');
  if (sheet) {
    const SNAP_MS = 420;
    const CLOSE_MS = 280;

    let startY = 0;
    let deltaY = 0;
    let dragging = false;
    let resetTimer = 0;

    /** Scrollable body of the sheet, or the sheet itself when short. */
    const getScrollEl = () => {
      const el = sheet.querySelector('.modal-body, form, .detail-tx-body');
      return (el && el.scrollHeight > el.clientHeight + 5) ? el : sheet;
    };

    /** Header/drag-handle always starts a drag, even when body is scrolled. */
    const isHandle = (node) =>
      node instanceof Element &&
      !!node.closest('.modal-header, .quick-action-header, #calc-drag-handle');

    /** Write finger offset into the CSS var consumed by .sheet-drag. */
    const setDrag = (px) => sheet.style.setProperty('--sheet-y', `${px}px`);

    const clearDragState = () => {
      sheet.classList.remove('sheet-drag', 'sheet-snap', 'sheet-close');
      sheet.style.removeProperty('--sheet-y');
    };

    const onTouchStart = (e) => {
      if (window.innerWidth > 768 || e.touches.length !== 1) return;
      // Don't hijack a drag while the inner body is scrolled down.
      if (!isHandle(e.target)) {
        const scrollEl = getScrollEl();
        if (scrollEl && scrollEl.scrollTop > 5) return;
      }
      clearTimeout(resetTimer);
      startY = e.touches[0].clientY;
      deltaY = 0;
      dragging = true;
      sheet.classList.remove('sheet-snap', 'sheet-close');
      sheet.classList.add('sheet-drag'); // kills transition + animation for 1:1 follow
      setDrag(0);
    };

    const onTouchMove = (e) => {
      if (!dragging) return;
      const raw = e.touches[0].clientY - startY;
      deltaY = Math.max(0, raw); // clamp upward movement
      setDrag(deltaY);
      if (raw > 0 && e.cancelable) e.preventDefault();
    };

    const onTouchEnd = () => {
      if (!dragging) return;
      dragging = false;

      // Dismiss if passed 100px or 30% of sheet height, else spring back.
      const threshold = Math.max(100, sheet.offsetHeight * 0.3);

      if (deltaY > threshold) {
        // Keep .sheet-drag so the transform stays pinned at the finger's
        // final Y, then layer .sheet-close on top: its (later, same-cascade)
        // transition animates from that exact Y down to translateY(100%).
        // Removing .sheet-drag here would let the active-open rule
        // snap the sheet up to translateY(0) first — the lift-up glitch.
        sheet.classList.add('sheet-close');
        if (overlay) overlay.classList.add('closing');
        resetTimer = window.setTimeout(() => close(false), CLOSE_MS);
      } else {
        sheet.classList.remove('sheet-drag'); // target is 0, no visible jump
        sheet.classList.add('sheet-snap'); // springy return
        resetTimer = window.setTimeout(clearDragState, SNAP_MS);
      }
      deltaY = 0;
    };

    sheet.addEventListener('touchstart', onTouchStart, { passive: true });
    sheet.addEventListener('touchmove', onTouchMove, { passive: false });
    sheet.addEventListener('touchend', onTouchEnd);
    sheet.addEventListener('touchcancel', onTouchEnd);

    cleanupTouch = () => {
      clearTimeout(resetTimer);
      sheet.removeEventListener('touchstart', onTouchStart);
      sheet.removeEventListener('touchmove', onTouchMove);
      sheet.removeEventListener('touchend', onTouchEnd);
      sheet.removeEventListener('touchcancel', onTouchEnd);
    };
  }

  return close;
}

// --- IDR CURRENCY HELPERS ---

/**
 * Parses a user-typed IDR string ("1.250.000,50") into a numeric value.
 * @param {string} str - Raw input string
 * @returns {number}
 */
export function parseIDRInput(str) {
  if (!str) return 0;
  const normalized = String(str).replace(/\./g, '').replace(',', '.');
  return parseFloat(normalized) || 0;
}

/**
 * Formats a raw numeric string into IDR display format ("1.250.000,50").
 * @param {string} str - Raw input string
 * @returns {string}
 */
export function formatIDRInput(str) {
  if (!str) return '';
  const parts = String(str).split(',');
  const intPart = parts[0].replace(/\D/g, '');
  const intFormatted = intPart ? new Intl.NumberFormat('id-ID').format(parseInt(intPart)) : '';
  return parts.length > 1 ? intFormatted + ',' + parts[1].replace(/\D/g, '').slice(0, 2) : intFormatted;
}
