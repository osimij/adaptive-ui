const CACHE = 'aether-v2';
const SHELL = [
  '/',
  '/manifest.json',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isNavigation = e.request.mode === 'navigate';
  const isHtmlRequest = (e.request.headers.get('accept') || '').includes('text/html');

  // Keep app shell fresh while retaining offline fallback.
  if (isSameOrigin && (isNavigation || isHtmlRequest)) {
    e.respondWith(
      fetch(e.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, copy));
          return response;
        })
        .catch(() => caches.match(e.request).then(cached => cached || caches.match('/')))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (isSameOrigin && response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, copy));
        }
        return response;
      });
    })
  );
});
