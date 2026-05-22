// ── KPI card ─────────────────────────────────────────────────
export function kpiCard({ id, label, iconSvg, colorClass }) {
  return `
    <div class="kpi-card">
      <div class="kpi-icon ${colorClass}">${iconSvg}</div>
      <div class="kpi-value" id="${id}">—</div>
      <div class="kpi-label">${label}</div>
    </div>
  `;
}

export const KPI_ICONS = {
  menores: `<svg width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
              <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0112 0v2"/>
            </svg>`,
  familias:`<svg width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
            </svg>`,
  casos:   `<svg width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
            </svg>`,
  check:   `<svg width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>`,
};

// ── Minor card (for grid view) ────────────────────────────────
export function menorCard(m) {
  const initials = m.nombre.trim().split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  return `
    <div class="menor-card">
      <div class="menor-photo">
        ${m.foto_url
          ? `<img src="${m.foto_url}" alt="${m.nombre}" loading="lazy">`
          : `<svg width="36" height="36" fill="none" stroke="var(--text-4)" stroke-width="1.5" viewBox="0 0 24 24">
               <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0112 0v2"/>
             </svg>`}
      </div>
      <div class="menor-info">
        <div class="menor-name">${m.nombre}</div>
        <div class="menor-age">${m.edad != null ? m.edad + ' años' : 'Edad no indicada'}</div>
        <span class="badge badge-${m.estado}">${ESTADO_LABELS[m.estado] ?? m.estado}</span>
      </div>
    </div>
  `;
}

export const ESTADO_LABELS = {
  disponible:  'Disponible',
  en_proceso:  'En proceso',
  adoptado:    'Adoptado',
  pendiente:   'Pendiente',
  aprobada:    'Aprobada',
  rechazada:   'Rechazada',
  solicitud:   'Solicitud',
  evaluacion:  'Evaluación',
  asignacion:  'Asignación',
  seguimiento: 'Seguimiento',
  cierre:      'Cierre',
};
