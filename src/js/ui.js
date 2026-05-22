// Re-exports from components for convenience
export { toast }   from '../components/toast.js';
export { openModal, closeModal, initModals, confirm } from '../components/modal.js';

// ── Helpers ───────────────────────────────────────────────────
export function getInitials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function badgeHtml(value) {
  const LABELS = {
    disponible:'Disponible', en_proceso:'En proceso', adoptado:'Adoptado',
    pendiente:'Pendiente', aprobada:'Aprobada', rechazada:'Rechazada',
    solicitud:'Solicitud', evaluacion:'Evaluación', asignacion:'Asignación',
    seguimiento:'Seguimiento', cierre:'Cierre',
  };
  return `<span class="badge badge-${value}">${LABELS[value] ?? value}</span>`;
}

export function setEl(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}
