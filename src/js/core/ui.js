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

export function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
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

// Compara dos objetos en los campos de `labels` y devuelve un resumen legible
// de lo que cambió, o null si nada cambió. Útil para la auditoría (antes/después).
export function diffSummary(before, after, labels) {
  const cambios = [];
  for (const [key, label] of Object.entries(labels)) {
    const a = before?.[key] ?? '';
    const b = after?.[key]  ?? '';
    if (String(a) !== String(b)) cambios.push({ label, antes: a, despues: b });
  }
  if (!cambios.length) return null;
  return {
    antes:   cambios.map(c => `${c.label}: ${c.antes || '—'}`).join(' · '),
    despues: cambios.map(c => `${c.label}: ${c.despues || '—'}`).join(' · '),
  };
}

export function calcAge(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  const today = new Date();
  const dob   = new Date(fechaNacimiento);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 0 ? age : null;
}
