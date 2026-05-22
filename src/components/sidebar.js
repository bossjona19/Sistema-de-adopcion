const NAV = [
  {
    id: 'overview',
    label: 'Dashboard',
    icon: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
             <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
             <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
           </svg>`,
  },
  {
    id: 'menores',
    label: 'Menores',
    icon: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
             <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0112 0v2"/>
           </svg>`,
  },
  {
    id: 'familias',
    label: 'Familias',
    icon: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
             <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
             <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
           </svg>`,
  },
  {
    id: 'casos',
    label: 'Casos',
    icon: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
             <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
           </svg>`,
  },
];

export function mountSidebar({ name, initials, onNavigate, onLogout }) {
  const root = document.getElementById('sidebar-root');
  if (!root) return;

  root.innerHTML = `
    <aside class="sidebar" id="sidebar">
      <a class="sidebar-brand" href="/index.html">
        <div class="sidebar-logo">
          <svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <div>
          <div class="sidebar-brand-name">OMEGA</div>
          <div class="sidebar-brand-sub">Gestión de Adopciones</div>
        </div>
      </a>

      <nav class="sidebar-nav" id="sidebar-nav">
        <span class="nav-label">Principal</span>
        ${NAV.map(item => `
          <button class="nav-link" data-tab="${item.id}" type="button">
            ${item.icon}
            ${item.label}
          </button>
        `).join('')}
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="avatar avatar-sm" style="background:rgba(255,255,255,.15);color:#fff;">${initials}</div>
          <div style="flex:1;min-width:0;">
            <div class="sidebar-user-name truncate">${name}</div>
            <div class="sidebar-user-role">Administrador</div>
          </div>
          <button class="btn-logout" id="btn-logout" title="Cerrar sesión">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  `;

  // Nav click
  document.getElementById('sidebar-nav').addEventListener('click', e => {
    const btn = e.target.closest('[data-tab]');
    if (btn) onNavigate(btn.dataset.tab);
  });

  // Logout
  document.getElementById('btn-logout')?.addEventListener('click', onLogout);
}

export function setActiveNav(tabId) {
  document.querySelectorAll('.nav-link').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
}

// Mobile menu
export function initMobileMenu() {
  const toggle  = document.getElementById('menu-toggle');
  const overlay = document.getElementById('sidebar-overlay');

  toggle?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.add('open');
    overlay?.classList.add('show');
  });

  overlay?.addEventListener('click', () => {
    document.getElementById('sidebar')?.classList.remove('open');
    overlay.classList.remove('show');
  });
}
