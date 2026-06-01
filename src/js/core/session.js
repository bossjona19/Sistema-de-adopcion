// Cierre de sesión por inactividad (seguridad institucional B1).
// Módulo puro: no importa auth ni componentes; recibe callbacks.
// Cualquier actividad del usuario reinicia el contador.
export function initIdleTimeout({ idleMs, warnMs, onWarn, onTimeout }) {
  let warnTimer, logoutTimer;

  const reset = () => {
    clearTimeout(warnTimer);
    clearTimeout(logoutTimer);
    warnTimer   = setTimeout(() => onWarn?.(),    Math.max(0, idleMs - warnMs));
    logoutTimer = setTimeout(() => onTimeout?.(), idleMs);
  };

  ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(ev =>
    window.addEventListener(ev, reset, { passive: true })
  );

  reset();
  return reset;
}
