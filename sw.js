const CACHE_NAME = 'travelmate-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/auth.html',
  '/trip-details.html',
  '/styles.css',
  '/dashboard.js',
  '/auth.js',
  '/firebase-config.js',
  '/utils.js',
  '/trip-details.js',
  '/icon.png',
  '/icon.png'
];

// Install event: caching app shell
self.addEventListener('install', event => {
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
  self.clients.claim();
});

// Fetch event: serve cached content
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request)
    )
  );
});

// Optional: Listen for sync messages (for offline sync)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SYNCDATA') {
    // Add your custom sync logic here if needed
  }
});
