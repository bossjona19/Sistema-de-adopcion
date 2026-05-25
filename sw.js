const CACHE = 'omega-v7';

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
  // Core
  '/src/js/core/supabase.js',
  '/src/js/core/auth.js',
  '/src/js/core/ui.js',
  '/src/js/core/router.js',
  // Entry points
  '/src/js/main.js',
  '/src/js/sw-register.js',
  // Pages
  '/src/js/pages/dashboard.js',
  '/src/js/pages/solicitud.js',
  // Services
  '/src/js/services/auditService.js',
  '/src/js/services/menoresService.js',
  '/src/js/services/familiasService.js',
  '/src/js/services/casosService.js',
  '/src/js/services/dashboardService.js',
  // Features
  '/src/js/features/menores.js',
  '/src/js/features/familias.js',
  '/src/js/features/casos.js',
  // Components
  '/src/components/toast.js',
  '/src/components/modal.js',
  '/src/components/sidebar.js',
  '/src/components/combobox.js',
  // Assets
  '/src/assets/icons/favicon.svg',
  '/src/assets/icons/icon-192.svg',
  '/src/assets/icons/icon-512.svg',
  '/src/assets/icons/proteger.png',
  '/src/assets/icons/apoyo-tecnico.png',
  '/src/assets/icons/resultados.png',
];

self.addEventListener('install', ev => {
  self.skipWaiting();
  ev.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC))
  );
});

self.addEventListener('activate', ev => {
  clients.claim();
  ev.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
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
