/**
 * Myanmar Calendar — Service Worker (v2.0 PWA)
 * Implements: App Shell cache, offline-first, background sync
 */

'use strict';

const CACHE_VERSION = 'myanmar-cal-v2.0.2';
const FONT_CACHE = 'myanmar-fonts-v1';

const APP_SHELL = [
  './index.html',
  './styles.css',
  './app.js',
  './myanmar-engine.js',
  './manifest.json',
  './icon.svg',
  './app-icon.svg',
  './icon-192.png',
  './icon-512.png',
  './vendor/flatpickr/flatpickr.min.css',
  './vendor/flatpickr/flatpickr.min.js',
];

const FONT_URLS = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Noto+Sans+Myanmar:wght@300;400;500;600;700&display=swap',
];

// ── Install: Pre-cache app shell ─────────────────────────────────────────────
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      // Cache app shell — ignore individual failures
      return Promise.allSettled(
        APP_SHELL.map(url =>
          cache.add(url).catch(() => {
            console.warn('[SW] Could not cache:', url);
          })
        )
      );
    })
  );
});

// ── Activate: Cleanup old caches ─────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_VERSION && k !== FONT_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: Cache-first for assets, network-first for HTML ───────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET / non-http requests (e.g. chrome-extension://, electron IPC)
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // Google Fonts — cache-first with fallback
  if (url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then(cache =>
        cache.match(request).then(cached => {
          if (cached) return cached;
          return fetch(request).then(response => {
            cache.put(request, response.clone());
            return response;
          }).catch(() => cached);
        })
      )
    );
    return;
  }

  // Same-origin requests: Cache-first (app shell), fallback to network
  if (url.origin === self.location.origin || url.protocol === 'file:') {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) {
          // Background revalidation (stale-while-revalidate)
          const fetchPromise = fetch(request)
            .then(response => {
              if (response.ok) {
                caches.open(CACHE_VERSION).then(cache => cache.put(request, response.clone()));
              }
              return response;
            })
            .catch(() => {});
          return cached;
        }
        // Not in cache — fetch and cache
        return fetch(request).then(response => {
          if (response.ok) {
            caches.open(CACHE_VERSION).then(cache => cache.put(request, response.clone()));
          }
          return response;
        }).catch(() => {
          // Offline fallback for HTML navigation
          if (request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
      })
    );
    return;
  }
});

// ── Message: skip waiting on demand ─────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
});
