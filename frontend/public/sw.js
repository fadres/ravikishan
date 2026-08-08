/* Ravikishan service worker — offline app shell with network-first
   navigation, stale-while-revalidate for hashed assets. Public content
   endpoints (GET /api/sections|classes|subjects|search|quick/questions)
   are cached network-first so notes stay readable offline after a visit.
   Authenticated or non-whitelisted API calls are never intercepted. */

const SHELL_CACHE = 'rk-shell-v5';
const API_CACHE = 'rk-api-v1';
const SHELL = ['/', '/manifest.webmanifest', '/favicon.svg', '/favicon-maskable.svg'];

// Public content endpoints whose GET responses may be cached for offline
// reading. Everything else (auth, progress, quizzes, admin, …) is never
// touched.
const PUBLIC_API_PREFIXES = [
  '/api/sections',
  '/api/classes',
  '/api/subjects',
  '/api/search',
  '/api/quick/questions',
];

const isCacheableApi = (url, request) => {
  if (request.method !== 'GET') return false;
  if (request.headers.get('authorization')) return false;
  return PUBLIC_API_PREFIXES.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`));
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== API_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache cross-origin or non-whitelisted API requests.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    if (url.origin === self.location.origin && isCacheableApi(url, request)) {
      // Public content: network-first with cache fallback — fresh when
      // online, readable offline from the last successful response.
      event.respondWith(
        fetch(request)
          .then((response) => {
            if (response && response.ok) {
              const copy = response.clone();
              caches.open(API_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() =>
            caches.match(request).then((cached) => cached || caches.match(url.pathname + url.search)),
          ),
      );
    }
    return;
  }

  if (request.mode === 'navigate') {
    // Network-first so fresh builds reach users immediately; fall back to
    // the cached shell when offline.
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(() => caches.match('/').then((cached) => cached || caches.match(request))),
    );
    return;
  }

  // Static assets: serve from cache while updating in the background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});

// Push messages: show a notification that opens the app (or the notification
// link) on click.
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    /* non-JSON payload — fall back to defaults */
  }
  const title = payload.title || 'Ravikishan';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/favicon.svg',
    badge: '/favicon.svg',
    data: { url: payload.link || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) return client.navigate(target).then(() => client.focus());
      }
      return clients.openWindow(target);
    }),
  );
});
