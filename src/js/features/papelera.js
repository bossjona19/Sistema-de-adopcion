import { menoresService }  from '../services/menoresService.js';
import { familiasService } from '../services/familiasService.js';
import { casosService }    from '../services/casosService.js';
import { logAudit } from '../services/auditService.js';
import { confirm } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { formatDate } from '../core/ui.js';
import { can } from '../core/auth.js';

// Cada tipo: servicio + cómo mostrar la etiqueta de cada registro borrado.
const TYPES = {
  menores:  { service: menoresService,  label: 'Niño',    name: r => r.nombre },
  familias: { service: familiasService, label: 'Familia',  name: r => `Familia ${r.apellido}` },
  casos:    { service: casosService,    label: 'Caso',     name: r => `#${r.id.slice(-6).toUpperCase()} · ${r.menor?.nombre ?? '—'} / Familia ${r.familia?.apellido ?? '—'}` },
};

// ── Public ───────────────────────────────────────────────────
export async function setupPapelera() {
  // Defensa en profundidad: solo admin (RLS sigue siendo la capa real).
  if (!can('manage_users')) {
    document.getElementById('papelera-body').innerHTML =
      `<p style="color:var(--text-3);">No tienes permiso para ver la papelera.</p>`;
    return;
  }

  document.getElementById('papelera-body')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-action="restore"]');
    if (btn) restore(btn.dataset.type, btn.dataset.id);
  });

  await load();
}

// ── Internal ─────────────────────────────────────────────────
async function load() {
  const body = document.getElementById('papelera-body');
  body.innerHTML = `<div style="padding:28px;text-align:center;"><div class="spinner"></div></div>`;

  const [men, fam, cas] = await Promise.all([
    TYPES.menores.service.getDeleted(),
    TYPES.familias.service.getDeleted(),
    TYPES.casos.service.getDeleted(),
  ]);

  if (men.error || fam.error || cas.error) {
    toast('Error al cargar la papelera', 'error');
    return;
  }

  const sections = [
    section('menores',  men.data ?? []),
    section('familias', fam.data ?? []),
    section('casos',    cas.data ?? []),
  ];

  const total = (men.data?.length ?? 0) + (fam.data?.length ?? 0) + (cas.data?.length ?? 0);
  document.getElementById('papelera-count').textContent = total;

  body.innerHTML = total
    ? sections.join('')
    : `<p style="color:var(--text-3);padding:8px 0;">La papelera está vacía.</p>`;
}

function section(type, rows) {
  const { label } = TYPES[type];
  if (!rows.length) return '';
  const items = rows.map(r => `
    <tr>
      <td>${TYPES[type].name(r)}</td>
      <td style="color:var(--text-3);">${formatDate(r.deleted_at)}</td>
      <td style="text-align:right;">
        <button class="btn btn-ghost btn-xs" data-action="restore" data-type="${type}" data-id="${r.id}">
          Restaurar
        </button>
      </td>
    </tr>
  `).join('');

  return `
    <div class="card" style="overflow:hidden;padding:0;margin-bottom:16px;">
      <div class="card-header">
        <span class="card-title">${label}s eliminados</span>
        <span style="font-size:.75rem;color:var(--text-3);">${rows.length}</span>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Registro</th><th>Eliminado</th><th></th></tr></thead>
          <tbody>${items}</tbody>
        </table>
      </div>
    </div>`;
}

async function restore(type, id) {
  const { service, label } = TYPES[type];
  const ok = await confirm(`¿Restaurar este ${label.toLowerCase()} desde la papelera?`);
  if (!ok) return;
  const { error } = await service.restore(id);
  if (error) { toast('Error al restaurar: ' + error.message, 'error'); return; }
  await logAudit(`Restaurar ${label.toLowerCase()}`, type, { entidadId: id });
  toast(`${label} restaurado`, 'success');
  await load();
}
