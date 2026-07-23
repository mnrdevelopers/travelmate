const CACHE_NAME = 'travelmate-cache-v24';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './dashboard.html',
  './login.html',
  './signup.html',
  './trip-details.html',
  './car-calculations.html',
  './styles.css',
  './dashboard.js',
  './auth.js',
  './firebase-config.js',
  './utils.js',
  './trip-details.js',
  './car-calculations.js',
  './js/notifications-engine.js',
  './js/ai-memory.js',
  './js/destination-db.js',
  './js/ai-planner-engine.js',
  './js/ai-planner-ui.js',
  './js/offline-sync-engine.js',
  './icon.png',
  './manifest.json'
];

// Helper to check if cross-origin URL is a cacheable CDN asset
function isCacheableCdn(url) {
  return url.includes('gstatic.com') ||
         url.includes('jsdelivr.net') ||
         url.includes('cdnjs.cloudflare.com') ||
         url.includes('googleapis.com');
}

// Install event: cache assets safely with Promise.allSettled
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map(url => 
          cache.add(url).catch(err => console.warn('PWA Cache warning for asset:', url, err))
        )
      );
    })
  );
});

// Activate event: cleanup old caches and claim clients immediately
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Fetch event: Network-First strategy with Cache Fallback for offline support
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = event.request.url;
  const isSameOrigin = url.startsWith(self.location.origin);

  // Ignore non-cacheable third-party API endpoints
  if (!isSameOrigin && !isCacheableCdn(url)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cacheCopy));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('./dashboard.html');
          }
        });
      })
  );
});

// Push notification event listener
self.addEventListener('push', event => {
  let payload = { title: 'TravelMate Journey Alert', body: 'You have an upcoming journey notification.' };
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (_) {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body,
    icon: 'icon.png',
    badge: 'icon.png',
    data: payload.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// Notification click event handler: open trip details page
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const tripId = event.notification.data ? event.notification.data.tripId : null;
  const targetUrl = tripId ? `./trip-details.html?id=${tripId}` : './dashboard.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes('dashboard.html') || client.url.includes('trip-details.html')) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Message listener for skip waiting
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
