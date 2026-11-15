let isRefreshing = false;

/**
 * Registers the root Service Worker and notifies when an update is waiting.
 */
export async function registerServiceWorker({ onUpdateAvailable } = {}) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (isRefreshing) return;
    isRefreshing = true;
    window.location.reload();
  });

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

    if (registration.waiting && navigator.serviceWorker.controller) {
      onUpdateAvailable?.(registration.waiting);
    }

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          onUpdateAvailable?.(newWorker);
        }
      });
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        registration.update().catch(() => {});
      }
    });

    return registration;
  } catch (err) {
    console.warn('Service Worker registration failed:', err);
    return null;
  }
}

/**
 * Signals a waiting Service Worker to activate immediately.
 */
export function applyServiceWorkerUpdate(waitingWorker) {
  if (!waitingWorker) return false;
  waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  return true;
}
