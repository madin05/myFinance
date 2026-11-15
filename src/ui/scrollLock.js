/**
 * @module scrollLock
 * Locks document scrolling (desktop & mobile touch/wheel) whenever any modal,
 * bottom sheet, notification/profile dropdown, drawer, or offline gate is active.
 */

const BASE_ACTIVE_OVERLAY_SELECTOR = [
  '.modal-overlay.active:not(#calc-overlay)',
  '.modal-card.active:not(#calc-card)',
  '.detail-tx-overlay.active',
  '.custom-alert-overlay.active',
  '.sidebar.mobile-active',
  '.sidebar-overlay.active',
  '.pwa-ios-modal-overlay.active',
  '.pwa-offline-gate.active',
  '#notif-dropdown.active',
  '#profile-dropdown.active',
  '#filter-backdrop.active',
  '.history-backdrop.open',
  '.history-drawer.open',
  '#ai-history-panel.mobile-active',
  '.ai-drawer-backdrop.mobile-active'
].join(', ');

const MOBILE_BREAKPOINT = 768;

/**
 * Checks whether any modal or blocking overlay currently requires scroll locking.
 * On desktop, the floating calculator remains non-blocking so users can inspect
 * numbers behind it; on mobile it becomes a full-screen bottom sheet.
 *
 * @param {Document} [doc]
 * @param {number} [viewportWidth]
 * @returns {boolean}
 */
export function hasActiveScrollLock(
  doc = typeof document !== 'undefined' ? document : null,
  viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024
) {
  if (!doc) return false;
  if (doc.querySelector(BASE_ACTIVE_OVERLAY_SELECTOR)) return true;
  if (viewportWidth <= MOBILE_BREAKPOINT && doc.querySelector('#calc-overlay.active, #calc-card.active')) {
    return true;
  }
  return false;
}

/**
 * Synchronizes the `modal-open` lock class on both `<html>` and `<body>`.
 */
export function syncScrollLock() {
  if (typeof document === 'undefined') return false;
  const shouldLock = hasActiveScrollLock(document, window.innerWidth);
  const root = document.documentElement;
  const body = document.body;

  root?.classList.toggle('modal-open', shouldLock);
  body?.classList.toggle('modal-open', shouldLock);
  return shouldLock;
}

/**
 * Finds the nearest scrollable element inside an overlay/dropdown/drawer
 * that actually overflows vertically, stopping before body/html.
 *
 * @param {EventTarget|null} target
 * @returns {HTMLElement|null}
 */
function findInnerScrollable(target) {
  let node = target instanceof Element ? target : null;
  while (node && node !== document.body && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    const canScrollY = style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflowY === 'overlay';
    if (canScrollY && node.scrollHeight > node.clientHeight + 1) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

function isAnyLockActive() {
  const root = document.documentElement;
  const body = document.body;
  return (
    root?.classList.contains('modal-open') ||
    body?.classList.contains('modal-open') ||
    root?.classList.contains('pwa-offline-locked') ||
    body?.classList.contains('pwa-offline-locked')
  );
}

/**
 * Prevents background page scrolling via touch-chaining or mouse wheel
 * when a modal/sheet/notification overlay is open.
 */
export function initScrollLock() {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return () => {};
  }

  let rafId = null;
  let lastTouchY = 0;

  const scheduleSync = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      syncScrollLock();
    });
  };

  const observer = new MutationObserver(scheduleSync);
  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'hidden']
    });
  }

  const onTouchStart = (event) => {
    if (event.touches.length === 1) {
      lastTouchY = event.touches[0].clientY;
    }
  };

  const onTouchMove = (event) => {
    if (!isAnyLockActive() || event.defaultPrevented || event.touches.length !== 1) return;

    const target = event.target;
    if (target instanceof Element && target.closest('input[type="range"]')) return;

    const currentY = event.touches[0].clientY;
    const deltaY = currentY - lastTouchY;
    lastTouchY = currentY;

    const scrollable = findInnerScrollable(target);
    if (!scrollable) {
      if (event.cancelable) event.preventDefault();
      return;
    }

    const atTop = scrollable.scrollTop <= 0 && deltaY > 0;
    const atBottom = scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 1 && deltaY < 0;
    if ((atTop || atBottom) && event.cancelable) {
      event.preventDefault();
    }
  };

  const onWheel = (event) => {
    if (!isAnyLockActive() || event.defaultPrevented) return;

    const target = event.target;
    if (window.innerWidth > MOBILE_BREAKPOINT && target instanceof Element && target.closest('#calc-card')) {
      return;
    }

    const scrollable = findInnerScrollable(target);
    if (!scrollable) {
      if (event.cancelable) event.preventDefault();
      return;
    }

    const atTop = scrollable.scrollTop <= 0 && event.deltaY < 0;
    const atBottom = scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 1 && event.deltaY > 0;
    if ((atTop || atBottom) && event.cancelable) {
      event.preventDefault();
    }
  };

  window.addEventListener('resize', scheduleSync, { passive: true });
  document.addEventListener('touchstart', onTouchStart, { passive: true });
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('wheel', onWheel, { passive: false });

  syncScrollLock();

  return () => {
    if (rafId) cancelAnimationFrame(rafId);
    observer.disconnect();
    window.removeEventListener('resize', scheduleSync);
    document.removeEventListener('touchstart', onTouchStart);
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('wheel', onWheel);
  };
}
