const TABS      = ['overview', 'menores', 'familias', 'casos'];
const TAB_NAMES = { overview: 'Dashboard', menores: 'Niños', familias: 'Familias', casos: 'Casos' };
const loaded    = new Set();
let _onInit     = null;
let _onActivate = null;

export function initRouter(onInit, onActivate) {
  _onInit     = onInit;
  _onActivate = onActivate ?? null;
  window.addEventListener('hashchange', () => navigateTo(location.hash.slice(1)));
  navigateTo(location.hash.slice(1) || 'overview');
}

export function navigateTo(tab) {
  if (!TABS.includes(tab)) tab = 'overview';

  TABS.forEach(t => {
    document.getElementById('panel-' + t)?.classList.toggle('active', t === tab);
  });

  document.getElementById('bc-current').textContent = TAB_NAMES[tab] ?? tab;
  _onActivate?.(tab);

  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('show');

  if (!loaded.has(tab)) {
    loaded.add(tab);
    _onInit?.(tab);
  }
}
