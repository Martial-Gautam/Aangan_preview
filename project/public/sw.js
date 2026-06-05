const CACHE_NAME = 'aangan-v3';
const STATIC_ASSETS = [
  '/',
  '/welcome',
  '/home',
  '/messages',
  '/feed',
  '/manifest.json',
  '/icons/familiar-icon-192.webp',
  '/icons/familiar-icon-512.webp',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first with cache fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Skip API routes — always go to network
  if (url.pathname.startsWith('/api/')) return;

  // Same-origin requests: network-first with cache fallback
  if (url.origin === location.origin) {
    // Next.js static chunks: cache aggressively (they're content-hashed)
    if (url.pathname.startsWith('/_next/static/')) {
      event.respondWith(
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          }).catch(() => caches.match('/'));
        })
      );
      return;
    }

    // All other same-origin: network-first
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            // For navigation requests, serve the cached home page as SPA fallback
            if (event.request.mode === 'navigate') {
              return caches.match('/home') || caches.match('/');
            }
            return undefined;
          });
        })
    );
    return;
  }

  // Third-party assets (fonts, images): stale-while-revalidate
  if (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('res.cloudinary.com')
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request)
          .then((response) => {
            if (response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }
});
