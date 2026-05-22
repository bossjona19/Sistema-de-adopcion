const CACHE = 'omega-v1';

const STATIC = [
  '/index.html',
  '/solicitud.html',
  '/login.html',
  '/dashboard.html',
  '/menores.html',
  '/familias.html',
  '/casos.html',
  '/src/css/styles.css',
  '/src/css/auth.css',
  '/src/css/dashboard.css',
  '/src/css/public.css',
  '/src/js/supabase.js',
  '/src/js/auth.js',
  '/src/js/ui.js',
  '/src/js/app.js',
  '/src/js/solicitud.js',
  '/src/js/sw-register.js',
  '/src/assets/icons/favicon.svg',
  '/manifest.json',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(STATIC))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Skip non-GET and cross-origin requests (e.g. Supabase API calls)
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      const network = fetch(event.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, clone));
        }
        return res;
      });
      return cached ?? network;
    })
  );
});
