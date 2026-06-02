// Captura global de errores de cliente (B5).
// Módulo PURO (como session.js): registra los handlers y delega el guardado a
// un callback `onError`. No importa servicios → respeta la regla de capas.
// Incluye tope por sesión y dedupe para no inundar la tabla ni entrar en bucles.
export function initErrorLogger({ onError, max = 20 } = {}) {
  let count = 0;
  const seen = new Set();

  const handle = (info) => {
    if (count >= max) return;                       // tope por sesión
    const key = (info.mensaje || '') + '|' + (info.origen || '');
    if (seen.has(key)) return;                      // dedupe
    seen.add(key);
    count++;
    try { onError?.(info); } catch { /* el logger NUNCA debe relanzar */ }
  };

  window.addEventListener('error', (e) => handle({
    mensaje: e.message || 'Error',
    stack:   e.error?.stack ?? null,
    url:     location.href,
    origen:  `${e.filename ?? ''}:${e.lineno ?? ''}:${e.colno ?? ''}`,
  }));

  window.addEventListener('unhandledrejection', (e) => handle({
    mensaje: 'Promesa no manejada: ' + (e.reason?.message ?? String(e.reason)),
    stack:   e.reason?.stack ?? null,
    url:     location.href,
    origen:  'unhandledrejection',
  }));
}
