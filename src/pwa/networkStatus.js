const PROBE_URL = '/favicon.ico';
const PROBE_TIMEOUT_MS = 4000;

/**
 * Verifies real server reachability with cache-bypass so stale navigator.onLine states cannot bypass the offline gate.
 */
export async function probeInternetConnectivity(
  fetchImpl = typeof fetch === 'function' ? fetch.bind(globalThis) : null,
  timeoutMs = PROBE_TIMEOUT_MS
) {
  if (!fetchImpl) return false;

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  try {
    const response = await fetchImpl(`${PROBE_URL}?_ping=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller ? controller.signal : undefined
    });
    return Boolean(response && response.ok);
  } catch {
    return false;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Coordinates the strict online-only gate across initial boot, browser online/offline events, and user retries.
 */
export function createNetworkGateController({
  win = typeof window !== 'undefined' ? window : undefined,
  nav = typeof navigator !== 'undefined' ? navigator : undefined,
  fetchImpl = typeof fetch === 'function' ? fetch.bind(globalThis) : null,
  onLock,
  onUnlock,
  onFeedback
} = {}) {
  let isLocked = false;
  let isChecking = false;

  function lock(message = '') {
    isLocked = true;
    onLock?.(message);
  }

  function unlock() {
    isLocked = false;
    onUnlock?.();
  }

  async function verifyAndRecover() {
    if (isChecking) return false;

    if (nav && nav.onLine === false) {
      lock('Masih belum terhubung. Periksa Wi-Fi atau data seluler Anda.');
      onFeedback?.('Masih belum terhubung. Periksa Wi-Fi atau data seluler Anda.', false);
      return false;
    }

    isChecking = true;
    onFeedback?.('Memeriksa koneksi internet ke server MyFinance...', true);

    try {
      const reachable = await probeInternetConnectivity(fetchImpl);
      if (reachable) {
        onFeedback?.('', false);
        unlock();
        return true;
      }

      lock('Jaringan belum merespons. Pastikan koneksi internet aktif lalu coba lagi.');
      onFeedback?.('Jaringan belum merespons. Pastikan koneksi internet aktif lalu coba lagi.', false);
      return false;
    } finally {
      isChecking = false;
    }
  }

  function handleOfflineEvent() {
    lock('Koneksi internet terputus. Hubungkan kembali perangkat untuk melanjutkan.');
  }

  function handleOnlineEvent() {
    if (!isLocked) return;
    verifyAndRecover();
  }

  function init() {
    if (nav && nav.onLine === false) {
      lock();
    } else {
      // Confirm initial reachability asynchronously when navigator.onLine is optimistic.
      probeInternetConnectivity(fetchImpl).then((reachable) => {
        if (!reachable) {
          lock('Tidak dapat menjangkau server MyFinance. Periksa koneksi internet Anda.');
        }
      });
    }

    if (!win) return () => {};

    win.addEventListener('offline', handleOfflineEvent);
    win.addEventListener('online', handleOnlineEvent);

    return () => {
      win.removeEventListener('offline', handleOfflineEvent);
      win.removeEventListener('online', handleOnlineEvent);
    };
  }

  return {
    init,
    verifyAndRecover,
    lock,
    unlock,
    getState: () => ({ isLocked, isChecking })
  };
}
