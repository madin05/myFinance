import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  isStandaloneMode,
  isIosDevice,
  resolveInstallMode,
  createInstallController
} from '../pwa/installPrompt.js';
import {
  probeInternetConnectivity,
  createNetworkGateController
} from '../pwa/networkStatus.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

const EMOJI_PATTERN = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

test('site.webmanifest is valid and all referenced assets exist on disk', () => {
  const manifestPath = path.join(PUBLIC_DIR, 'assets', 'site.webmanifest');
  const raw = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(raw);

  assert.equal(manifest.id, '/');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.orientation, 'any');
  assert.equal(manifest.lang, 'id');
  assert.ok(manifest.start_url.startsWith('/'));
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 4);

  const purposes = new Set(manifest.icons.map((icon) => icon.purpose));
  assert.ok(purposes.has('any'));
  assert.ok(purposes.has('maskable'));

  for (const icon of manifest.icons) {
    const diskPath = path.join(PUBLIC_DIR, icon.src.replace(/^\//, ''));
    assert.ok(fs.existsSync(diskPath), `Missing manifest icon on disk: ${icon.src}`);
  }

  assert.ok(Array.isArray(manifest.shortcuts) && manifest.shortcuts.length >= 1);
  for (const shortcut of manifest.shortcuts) {
    assert.ok(shortcut.url.startsWith('/'));
    for (const icon of shortcut.icons || []) {
      const diskPath = path.join(PUBLIC_DIR, icon.src.replace(/^\//, ''));
      assert.ok(fs.existsSync(diskPath), `Missing shortcut icon on disk: ${icon.src}`);
    }
  }
});

test('offline.html enforces online-only UX cleanly with zero emojis', () => {
  const offlinePath = path.join(PUBLIC_DIR, 'offline.html');
  const html = fs.readFileSync(offlinePath, 'utf8');

  assert.equal(EMOJI_PATTERN.test(html), false, 'offline.html must not contain emojis');
  assert.ok(html.includes('role="alertdialog"'));
  assert.ok(html.includes('id="btn-retry-connection"'));
  assert.ok(html.includes('/favicon.ico?_ping='));
  assert.ok(html.includes('hanya dapat diakses saat perangkat Anda terhubung ke internet'));
});

test('service worker enforces online-only navigation and never caches app shell HTML', () => {
  const swPath = path.join(PUBLIC_DIR, 'sw.js');
  const swCode = fs.readFileSync(swPath, 'utf8');

  assert.ok(swCode.includes("'/offline.html'"));
  assert.equal(swCode.includes("'/index.html'"), false, 'sw.js must never precache or return index.html offline');
  assert.ok(swCode.includes("request.mode === 'navigate'"));
  assert.ok(swCode.includes("url.searchParams.has('_ping')"));
  assert.ok(swCode.includes("type === 'SKIP_WAITING'"));
  assert.ok(swCode.includes('status: 503'));
});

test('vercel.json excludes PWA files from SPA catch-all and sets no-cache header on sw.js', () => {
  const vercelPath = path.join(ROOT_DIR, 'vercel.json');
  const vercel = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));

  const catchAll = vercel.rewrites.find((r) => r.destination === '/index.html');
  assert.ok(catchAll, 'Missing SPA catch-all rewrite');
  assert.ok(catchAll.source.includes('sw\\.js'));
  assert.ok(catchAll.source.includes('offline\\.html'));
  assert.ok(catchAll.source.includes('assets/site\\.webmanifest'));

  const swHeaders = vercel.headers.find((h) => h.source === '/sw.js');
  assert.ok(swHeaders, 'Missing headers rule for /sw.js');
  const cacheControl = swHeaders.headers.find((item) => item.key === 'Cache-Control');
  assert.equal(cacheControl?.value, 'no-cache, no-store, must-revalidate');
});

test('installPrompt helpers detect standalone, iOS, iPadOS, and install modes', () => {
  assert.equal(
    isStandaloneMode({
      matchMedia: () => ({ matches: true }),
      navigator: {}
    }),
    true
  );
  assert.equal(
    isStandaloneMode({
      matchMedia: () => ({ matches: false }),
      navigator: { standalone: true }
    }),
    true
  );
  assert.equal(
    isStandaloneMode({
      matchMedia: () => ({ matches: false }),
      navigator: { standalone: false }
    }),
    false
  );

  assert.equal(isIosDevice({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)' }), true);
  assert.equal(isIosDevice({ userAgent: 'Mozilla/5.0', platform: 'MacIntel', maxTouchPoints: 5 }), true);
  assert.equal(isIosDevice({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', platform: 'Win32', maxTouchPoints: 0 }), false);

  assert.equal(resolveInstallMode({ hasDeferredPrompt: true, standalone: true, ios: false }), 'installed');
  assert.equal(resolveInstallMode({ hasDeferredPrompt: true, standalone: false, ios: false }), 'native');
  assert.equal(resolveInstallMode({ hasDeferredPrompt: false, standalone: false, ios: true }), 'ios');
  assert.equal(resolveInstallMode({ hasDeferredPrompt: false, standalone: false, ios: false }), 'unsupported');
});

test('createInstallController transitions across beforeinstallprompt, promptInstall, and appinstalled', async () => {
  const listeners = {};
  const fakeWindow = {
    navigator: { userAgent: 'Chrome Windows', platform: 'Win32', maxTouchPoints: 0 },
    matchMedia: () => ({ matches: false }),
    addEventListener: (name, cb) => {
      listeners[name] = cb;
    },
    removeEventListener: (name) => {
      delete listeners[name];
    }
  };

  const controller = createInstallController(fakeWindow);
  const seenModes = [];
  controller.subscribe((mode) => seenModes.push(mode));
  controller.init();

  assert.equal(controller.getMode(), 'unsupported');

  let prevented = false;
  let prompted = false;
  listeners.beforeinstallprompt({
    preventDefault: () => {
      prevented = true;
    },
    prompt: () => {
      prompted = true;
    },
    userChoice: Promise.resolve({ outcome: 'accepted' })
  });

  assert.equal(prevented, true);
  assert.equal(controller.getMode(), 'native');

  const choice = await controller.promptInstall();
  assert.equal(prompted, true);
  assert.equal(choice.outcome, 'accepted');
  assert.equal(controller.getMode(), 'installed');
  assert.equal(seenModes.includes('native'), true);
  assert.equal(seenModes.at(-1), 'installed');
});

test('probeInternetConnectivity distinguishes reachable server from network failure', async () => {
  const okResult = await probeInternetConnectivity(async () => ({ ok: true }));
  assert.equal(okResult, true);

  const httpFail = await probeInternetConnectivity(async () => ({ ok: false }));
  assert.equal(httpFail, false);

  const networkThrow = await probeInternetConnectivity(async () => {
    throw new Error('ERR_INTERNET_DISCONNECTED');
  });
  assert.equal(networkThrow, false);
});

test('networkGate locks immediately when offline at startup and unlocks only after reachability succeeds', async () => {
  const listeners = {};
  const fakeWindow = {
    addEventListener: (name, cb) => {
      listeners[name] = cb;
    },
    removeEventListener: (name) => {
      delete listeners[name];
    }
  };

  const navState = { onLine: false };
  let serverOnline = false;
  let locked = false;
  let lastFeedback = '';

  const gate = createNetworkGateController({
    win: fakeWindow,
    nav: navState,
    fetchImpl: async () => {
      if (!serverOnline) throw new Error('offline');
      return { ok: true };
    },
    onLock: () => {
      locked = true;
    },
    onUnlock: () => {
      locked = false;
    },
    onFeedback: (msg) => {
      lastFeedback = msg;
    }
  });

  gate.init();
  assert.equal(locked, true, 'App must start locked when navigator.onLine is false');

  // Retry while still offline must keep gate locked
  navState.onLine = true;
  const firstRetry = await gate.verifyAndRecover();
  assert.equal(firstRetry, false);
  assert.equal(locked, true);
  assert.ok(lastFeedback.length > 0);

  // Server becomes reachable and browser fires online event
  serverOnline = true;
  await listeners.online();
  // Wait a microtask tick for async verifyAndRecover triggered by online event
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(locked, false, 'Gate must unlock when connectivity probe succeeds');

  // Going offline mid-session locks immediately
  listeners.offline();
  assert.equal(locked, true, 'Gate must lock immediately on mid-session offline event');
});

test('firebase-config loads safely inside Node without Vite import.meta.env crash', async () => {
  const mod = await import('../firebase-config.js');
  assert.ok(mod.auth);
  assert.ok(mod.googleProvider);
});
