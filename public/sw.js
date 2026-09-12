const CACHE_NAME = 'pst-tutor-v5';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        console.warn('SW initial asset caching warning:', err);
      });
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
  // Only handle http and https requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // Skip caching for API calls, Supabase queries, and external AI services to ensure fresh data
  if (
    event.request.url.includes('/api') ||
    event.request.url.includes('supabase.co') ||
    event.request.url.includes('googleapis.com')
  ) {
    return;
  }

  // Network First strategy for HTML and JS/CSS assets to prevent stale cached versions
  if (
    event.request.mode === 'navigate' ||
    event.request.url.includes('index.html') ||
    event.request.url.includes('/assets/')
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone).catch(() => {});
            });
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            const fallback = await caches.match('/index.html') || await caches.match('/');
            if (fallback) return fallback;
          }
          return new Response('Network error occurred. Please refresh.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
          });
        })
    );
    return;
  }

  // Cache First for other static assets (images, icons, fonts)
  event.respondWith(
    caches.match(event.request).then((response) => {
      return (
        response ||
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone).catch(() => {});
            });
          }
          return networkResponse;
        })
      );
    })
  );
});
