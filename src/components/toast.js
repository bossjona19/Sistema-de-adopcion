let _container = null;

function container() {
  if (!_container) {
    _container = Object.assign(document.createElement('div'), {
      style: 'position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none;',
    });
    document.body.appendChild(_container);
  }
  return _container;
}

const ICONS = {
  success: `<svg width="14" height="14" fill="none" stroke="#16A34A" stroke-width="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>`,
  error:   `<svg width="14" height="14" fill="none" stroke="#D93025" stroke-width="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
  warning: `<svg width="14" height="14" fill="none" stroke="#D97706" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>`,
  info:    `<svg width="14" height="14" fill="none" stroke="#378ADD" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/></svg>`,
};

const COLORS = {
  success: '#16A34A', error: '#D93025', warning: '#D97706', info: '#378ADD',
};

export function toast(message, type = 'info', ms = 3500) {
  const el = document.createElement('div');
  el.style.cssText = `
    display:flex;align-items:center;gap:9px;
    background:#fff;
    border:1px solid #E4E8EF;
    border-left:3px solid ${COLORS[type] ?? COLORS.info};
    border-radius:8px;
    padding:10px 14px;
    box-shadow:0 4px 16px rgba(0,0,0,.1);
    font-size:.875rem;font-weight:500;color:#111827;
    min-width:260px;max-width:360px;
    pointer-events:all;
    animation:toastIn .2s ease;
    font-family:inherit;
  `;

  if (!document.getElementById('_toast-style')) {
    const s = document.createElement('style');
    s.id = '_toast-style';
    s.textContent = '@keyframes toastIn{from{transform:translateX(12px);opacity:0}to{transform:translateX(0);opacity:1}}';
    document.head.appendChild(s);
  }

  el.innerHTML = `${ICONS[type] ?? ICONS.info}<span></span>`;
  el.querySelector('span').textContent = message;  // texto literal: nunca ejecuta HTML
  container().appendChild(el);

  setTimeout(() => {
    el.style.transition = 'opacity .2s,transform .2s';
    el.style.opacity = '0';
    el.style.transform = 'translateX(12px)';
    setTimeout(() => el.remove(), 210);
  }, ms);
}
