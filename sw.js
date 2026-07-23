const CACHE_NAME = 'travelmate-cache-v11';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/login.html',
  '/signup.html',
  '/trip-details.html',
  '/styles.css',
  '/dashboard.js',
  '/auth.js',
  '/firebase-config.js',
  '/utils.js',
  '/trip-details.js',
  '/icon.png',
];

// Install event: cache assets and force skip waiting
self.addEventListener('install', event => {
  self.skipWaiting(); // Force the waiting service worker to become active immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
});

// Activate event: cleanup old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  self.clients.claim(); // Become controller immediately for all open client tabs
});

// Fetch event: Network-First strategy for HTML and JS scripts to ensure fresh code updates!
self.addEventListener('fetch', event => {
  // Only intercept local GET requests (skip APIs, Firebase DB, CDN auth calls)
  if (
    event.request.method !== 'GET' ||
    !event.request.url.startsWith(self.location.origin)
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cacheCopy));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});


// Sync data logic (optional)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SYNCDATA') {
    // Add custom offline data syncing if needed
  }
});
