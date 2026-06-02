const TABS      = ['overview', 'menores', 'familias', 'casos', 'usuarios', 'papelera', 'bitacora'];
const TAB_NAMES = { overview: 'Dashboard', menores: 'Niños', familias: 'Familias', casos: 'Casos', usuarios: 'Usuarios', papelera: 'Papelera', bitacora: 'Bitácora' };
let _onInit     = null;
let _onActivate = null;

export function initRouter(onInit, onActivate) {
  _onInit     = onInit;
  _onActivate = onActivate ?? null;
  window.addEventListener('hashchange', () => navigateTo(location.hash.slice(1)));
  navigateTo(location.hash.slice(1) || 'overview');
}

// El hash puede llevar query params del tab actual: "#menores?estado=x&genero=y".
export function parseHash() {
  const [tab, qs = ''] = location.hash.slice(1).split('?');
  return { tab, params: new URLSearchParams(qs) };
}

// Params del tab actual (para que las features restauren sus filtros).
export function getParams() {
  return parseHash().params;
}

// Escribe los filtros en la URL SIN navegar (replaceState → no dispara hashchange).
export function setParams(obj) {
  const { tab } = parseHash();
  const sp = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => { if (v) sp.set(k, v); });
  const qs = sp.toString();
  history.replaceState(null, '', '#' + (tab || 'overview') + (qs ? '?' + qs : ''));
}

export function navigateTo(input) {
  const [rawTab, qs = ''] = (input || '').split('?');
  const tab = TABS.includes(rawTab) ? rawTab : 'overview';

  // Sincroniza la URL (sin disparar navegación). Al venir del sidebar (tab plano)
  // se limpia el query del tab anterior; al venir del hash se conserva.
  const target = '#' + tab + (qs ? '?' + qs : '');
  if (location.hash !== target) history.replaceState(null, '', target);

  TABS.forEach(t => {
    document.getElementById('panel-' + t)?.classList.toggle('active', t === tab);
  });

  document.getElementById('bc-current').textContent = TAB_NAMES[tab] ?? tab;
  _onActivate?.(tab);

  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('show');

  // Se llama SIEMPRE (no solo la 1ª vez): cada feature cablea sus listeners una
  // sola vez (flag _wired) pero recarga sus datos en cada visita → no hace falta F5.
  _onInit?.(tab);
}
