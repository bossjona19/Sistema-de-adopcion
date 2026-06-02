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
    label: 'Niños',
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

const ADMIN_NAV = [
  {
    id: 'usuarios',
    label: 'Usuarios',
    icon: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
             <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
             <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
           </svg>`,
  },
  {
    id: 'papelera',
    label: 'Papelera',
    icon: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
             <polyline points="3 6 5 6 21 6"/>
             <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
           </svg>`,
  },
  {
    id: 'bitacora',
    label: 'Bitácora',
    icon: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
             <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
             <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
           </svg>`,
  },
  {
    id: 'errores',
    label: 'Monitoreo',
    icon: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
             <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
             <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
           </svg>`,
  },
  {
    id: 'config',
    label: 'Configuración',
    icon: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
             <circle cx="12" cy="12" r="3"/>
             <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
           </svg>`,
  },
];

export function mountSidebar({ name, initials, role = 'Usuario', org = 'OMEGA', canManageUsers = false, onNavigate, onLogout }) {
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
          <div class="sidebar-brand-name truncate">${org}</div>
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
        ${canManageUsers ? `
          <span class="nav-label">Administración</span>
          ${ADMIN_NAV.map(item => `
            <button class="nav-link" data-tab="${item.id}" type="button">
              ${item.icon}
              ${item.label}
            </button>
          `).join('')}
        ` : ''}
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="avatar avatar-sm" style="background:rgba(255,255,255,.15);color:#fff;">${initials}</div>
          <div style="flex:1;min-width:0;">
            <div class="sidebar-user-name truncate">${name}</div>
            <div class="sidebar-user-role">${role}</div>
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
