const CACHE = 'omega-v2';

const STATIC = [
  '/',
  '/index.html',
  '/login.html',
  '/dashboard.html',
  '/solicitud.html',
  '/manifest.json',
  '/src/css/styles.css',
  '/src/css/dashboard.css',
  '/src/css/auth.css',
  '/src/js/supabase.js',
  '/src/js/auth.js',
  '/src/js/ui.js',
  '/src/js/main.js',
  '/src/js/dashboard.js',
  '/src/js/sw-register.js',
  '/src/components/toast.js',
  '/src/components/modal.js',
  '/src/components/sidebar.js',
  '/src/components/cards.js',
  '/src/assets/icons/favicon.svg',
];

self.addEventListener('install', ev => {
  ev.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', ev => {
  if (ev.request.method !== 'GET') return;
  const url = new URL(ev.request.url);
  if (url.origin !== location.origin) return; // never cache Supabase requests

  ev.respondWith(
    caches.match(ev.request).then(cached => {
      const fresh = fetch(ev.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(ev.request, res.clone()));
        return res;
      }).catch(() => cached); // offline fallback
      return cached ?? fresh;
    })
  );
});
