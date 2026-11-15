const CACHE_VERSION = 'v1';
const STATIC_CACHE = `myfinance-static-${CACHE_VERSION}`;

// HTML app shell (/) is intentionally excluded so users cannot enter the app offline.
const PRECACHE_URLS = [
  '/offline.html',
  '/favicon.ico',
  '/assets/site.webmanifest',
  '/assets/android-chrome-192x192.png',
  '/assets/android-chrome-512x512.png',
  '/assets/apple-touch-icon.png',
  '/assets/favicon-32x32.png',
  '/assets/favicon-16x16.png',
  '/assets/logo-navbar-light.svg',
  '/assets/logo-navbar-dark.svg',
  '/assets/offline-illustration-light.webp',
  '/assets/offline-illustration-dark.webp',
  '/assets/offline-illustration-light.png',
  '/assets/offline-illustration-dark.png'
];

const HASHED_ASSET_PATTERN = /\/assets\/.*-[a-zA-Z0-9_-]{6,}\.(js|css|woff2?)$/;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      await Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => null)
        )
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      await Promise.all(
        keys
          .filter((key) => key.startsWith('myfinance-') && key !== STATIC_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function handleNavigateRequest(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put('/index.html', networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    const cachedShell = (await caches.match('/index.html')) || (await caches.match('/'));
    if (cachedShell) return cachedShell;
    const offlinePage = await caches.match('/offline.html');
    if (offlinePage) return offlinePage;
    return new Response(
      '<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Offline - MyFinance</title></head><body style="font-family:sans-serif;padding:2rem;text-align:center"><h1>Oops kamu offline nih, periksa jaringanmu kembali.</h1></body></html>',
      {
        status: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      }
    );
  }
}

async function handleApiRequest(request) {
  try {
    return await fetch(request);
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        offline: true,
        message: 'Koneksi internet diperlukan untuk mengakses MyFinance.'
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json; charset=utf-8' }
      }
    );
  }
}

async function cacheFirstAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const networkResponse = await fetch(request);
  if (networkResponse && networkResponse.ok) {
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, networkResponse.clone());
  }
  return networkResponse;
}

async function staleWhileRevalidateAsset(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    return cached;
  }

  const networkResponse = await networkPromise;
  return (
    networkResponse ||
    new Response('', { status: 504, statusText: 'Gateway Timeout' })
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.searchParams.has('_ping') || request.cache === 'no-store') {
    event.respondWith(fetch(request));
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigateRequest(request));
    return;
  }

  if (HASHED_ASSET_PATTERN.test(url.pathname)) {
    event.respondWith(cacheFirstAsset(request));
    return;
  }

  if (url.pathname.startsWith('/assets/') || url.pathname === '/favicon.ico') {
    event.respondWith(staleWhileRevalidateAsset(request));
  }
});
