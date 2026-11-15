/**
 * Returns true if the application is already running inside an installed standalone window.
 */
export function isStandaloneMode(win = typeof window !== 'undefined' ? window : undefined) {
  if (!win) return false;
  const standaloneDisplay =
    typeof win.matchMedia === 'function' &&
    win.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone = win.navigator?.standalone === true;
  return Boolean(standaloneDisplay || iosStandalone);
}

/**
 * Returns true when running on iOS or iPadOS Safari where beforeinstallprompt is unavailable.
 */
export function isIosDevice(nav = typeof navigator !== 'undefined' ? navigator : undefined) {
  if (!nav) return false;
  const ua = nav.userAgent || '';
  if (/iphone|ipad|ipod/i.test(ua)) return true;
  return nav.platform === 'MacIntel' && Number(nav.maxTouchPoints || 0) > 1;
}

/**
 * Computes the available install strategy across desktop, tablet, and mobile browsers.
 */
export function resolveInstallMode({ hasDeferredPrompt, standalone, ios }) {
  if (standalone) return 'installed';
  if (hasDeferredPrompt) return 'native';
  if (ios) return 'ios';
  return 'unsupported';
}

/**
 * Creates a framework-agnostic PWA install controller for beforeinstallprompt and iOS fallback.
 */
export function createInstallController(win = typeof window !== 'undefined' ? window : undefined) {
  let deferredPrompt = null;
  let installed = isStandaloneMode(win);
  const listeners = new Set();

  function getMode() {
    return resolveInstallMode({
      hasDeferredPrompt: Boolean(deferredPrompt),
      standalone: installed || isStandaloneMode(win),
      ios: isIosDevice(win?.navigator)
    });
  }

  function notify() {
    const mode = getMode();
    listeners.forEach((cb) => cb(mode));
  }

  function init() {
    if (!win) return () => {};

    const handleBeforeInstall = (event) => {
      event.preventDefault();
      deferredPrompt = event;
      notify();
    };

    const handleAppInstalled = () => {
      deferredPrompt = null;
      installed = true;
      notify();
    };

    win.addEventListener('beforeinstallprompt', handleBeforeInstall);
    win.addEventListener('appinstalled', handleAppInstalled);
    notify();

    return () => {
      win.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      win.removeEventListener('appinstalled', handleAppInstalled);
    };
  }

  async function promptInstall() {
    if (!deferredPrompt) return { outcome: 'unavailable' };
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice?.outcome === 'accepted') {
      deferredPrompt = null;
      installed = true;
    }
    notify();
    return choice;
  }

  function subscribe(cb) {
    listeners.add(cb);
    cb(getMode());
    return () => listeners.delete(cb);
  }

  return {
    init,
    getMode,
    promptInstall,
    subscribe
  };
}
