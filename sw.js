const CACHE = 'omega-v35';

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
  '/src/js/core/session.js',
  '/src/js/core/export.js',
  '/src/js/core/logger.js',
  // Entry points
  '/src/js/main.js',
  '/src/js/branding.js',
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
  '/src/js/services/usuariosService.js',
  '/src/js/services/accesoService.js',
  '/src/js/services/documentosService.js',
  '/src/js/services/errorService.js',
  '/src/js/services/postadopcionService.js',
  '/src/js/services/configService.js',
  // Features
  '/src/js/features/menores.js',
  '/src/js/features/familias.js',
  '/src/js/features/casos.js',
  '/src/js/features/usuarios.js',
  '/src/js/features/papelera.js',
  '/src/js/features/bitacora.js',
  '/src/js/features/errores.js',
  '/src/js/features/config.js',
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
  // Precache RESILIENTE: cachea archivo por archivo. Si alguno falla (404, red),
  // NO se cae toda la instalación (a diferencia de addAll, que es atómico).
  ev.waitUntil(
    caches.open(CACHE).then(c => Promise.allSettled(STATIC.map(u => c.add(u))))
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
  if (url.origin !== location.origin) return; // Supabase / CDNs → red directa, nunca cache

  // NETWORK-FIRST: siempre intenta el servidor (tras un deploy nadie recibe código
  // viejo); cae a caché solo si no hay red; y SIEMPRE devuelve una Response válida
  // (jamás undefined → adiós "Failed to convert value to 'Response'").
  ev.respondWith(
    fetch(ev.request)
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(ev.request, copy));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(ev.request);
        if (cached) return cached;
        if (ev.request.mode === 'navigate') {
          const home = await caches.match('/index.html');
          if (home) return home;
        }
        return new Response('Sin conexión.', {
          status: 503,
          statusText: 'Offline',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      })
  );
});
