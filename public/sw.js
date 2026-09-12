const CACHE_NAME = 'pst-tutor-v4';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Skip caching for API calls and external services to ensure fresh data
  if (event.request.url.includes('supabase.co') || event.request.url.includes('/api/') || event.request.url.includes('googleapis.com')) {
    return;
  }

  // Network First strategy for HTML and JS/CSS assets to prevent stale cached versions
  if (event.request.mode === 'navigate' || event.request.url.includes('index.html') || event.request.url.includes('/assets/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Cache First for other static images and icons
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
