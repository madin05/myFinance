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

  const close = () => {
    window.removeEventListener('keydown', handleKey);
    cleanupTouch();
    animateCloseModal(container, onDismiss);
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

  // Touch Swipe-Down to Dismiss gesture for mobile bottom sheet
  const sheet = container?.querySelector('.modal-content, .detail-tx-content, .custom-alert-card, .quick-action-card, #calc-card');
  if (sheet) {
    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    const getScrollEl = () => {
      const el = sheet.querySelector('.modal-body, form, .detail-tx-body');
      return (el && el.scrollHeight > el.clientHeight + 5) ? el : sheet;
    };

    const onTouchStart = (e) => {
      if (window.innerWidth > 768) return;
      const scrollEl = getScrollEl();
      if (scrollEl && scrollEl.scrollTop > 5) return;

      startY = e.touches[0].clientY;
      currentY = startY;
      isDragging = true;
      sheet.style.transition = 'none';
    };

    const onTouchMove = (e) => {
      if (!isDragging) return;
      const deltaY = e.touches[0].clientY - startY;
      if (deltaY > 0) {
        currentY = e.touches[0].clientY;
        sheet.style.transform = `translateY(${deltaY}px)`;
        if (e.cancelable) e.preventDefault();
      } else {
        isDragging = false;
        sheet.style.transform = '';
      }
    };

    const onTouchEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      const deltaY = currentY - startY;

      if (deltaY > 70) {
        sheet.style.transition = 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)';
        sheet.style.transform = 'translateY(100%)';
        if (overlay) {
          overlay.style.transition = 'opacity 0.25s ease';
          overlay.style.opacity = '0';
        }
        setTimeout(() => {
          close();
        }, 250);
      } else {
        sheet.style.transition = 'transform 0.25s cubic-bezier(0.32, 0.72, 0, 1)';
        sheet.style.transform = '';
      }
    };

    sheet.addEventListener('touchstart', onTouchStart, { passive: true });
    sheet.addEventListener('touchmove', onTouchMove, { passive: false });
    sheet.addEventListener('touchend', onTouchEnd);

    cleanupTouch = () => {
      sheet.removeEventListener('touchstart', onTouchStart);
      sheet.removeEventListener('touchmove', onTouchMove);
      sheet.removeEventListener('touchend', onTouchEnd);
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
