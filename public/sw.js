/**
 * RotaAI Service Worker — Offline Resilience (minimal, safe)
 */
const CACHE_NAME = 'rotaai-v2';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // ONLY handle same-origin https/http GET requests
  // Skip chrome-extension://, blob:, data:, etc.
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then(cached => cached || (
        url.pathname.startsWith('/api/')
          ? new Response(JSON.stringify({ success: false, offline: true }), { headers: { 'Content-Type': 'application/json' } })
          : caches.match('/')
      ))
    )
  );
});
