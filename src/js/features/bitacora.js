import { getBitacora } from '../services/auditService.js';
import { usuariosService } from '../services/usuariosService.js';
import { toast } from '../../components/toast.js';
import { formatDateTime, escapeHtml } from '../core/ui.js';
import { can } from '../core/auth.js';

const ENTIDAD_LABELS = {
  menores: 'Niños', familias: 'Familias', casos: 'Casos',
  seguimiento: 'Seguimiento', documentos: 'Documentos', postadopcion: 'Post-adopción', usuarios: 'Usuarios',
};

let _wired = false;

// ── Public ───────────────────────────────────────────────────
export async function setupBitacora() {
  if (!can('manage_users')) {
    document.getElementById('bitacora-tbody').innerHTML =
      `<tr><td colspan="5" class="loading-row" style="color:var(--text-3);">No tienes permiso para ver la bitácora.</td></tr>`;
    return;
  }

  if (!_wired) {
    await fillUsuariosFilter();
    ['bitacora-usuario', 'bitacora-entidad', 'bitacora-desde', 'bitacora-hasta']
      .forEach(id => document.getElementById(id)?.addEventListener('change', load));
    _wired = true;
  }

  await load();
}

// ── Internal ─────────────────────────────────────────────────
async function fillUsuariosFilter() {
  const sel = document.getElementById('bitacora-usuario');
  const { data } = await usuariosService.getAll();
  (data ?? []).forEach(u => {
    const opt = document.createElement('option');
    opt.value = u.id;
    opt.textContent = u.nombre || u.email;
    sel.appendChild(opt);
  });
}

async function load() {
  const tbody = document.getElementById('bitacora-tbody');
  tbody.innerHTML = `<tr class="loading-row"><td colspan="5"><div class="spinner"></div></td></tr>`;

  const { data, error } = await getBitacora({
    usuarioId: document.getElementById('bitacora-usuario')?.value ?? '',
    entidad:   document.getElementById('bitacora-entidad')?.value ?? '',
    desde:     document.getElementById('bitacora-desde')?.value ?? '',
    hasta:     document.getElementById('bitacora-hasta')?.value ?? '',
  });

  if (error) { toast('Error al cargar la bitácora', 'error'); return; }
  render(data ?? []);
}

function cambioHtml(antes, despues) {
  if (!antes && !despues) return '<span style="color:var(--text-3);">—</span>';
  if (antes && despues)   return `<span style="color:var(--text-3);">${escapeHtml(antes)}</span> → <strong>${escapeHtml(despues)}</strong>`;
  return escapeHtml(despues || antes);
}

function render(list) {
  document.getElementById('bitacora-count').textContent = list.length;
  const tbody = document.getElementById('bitacora-tbody');

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="loading-row" style="color:var(--text-3);">Sin registros para los filtros seleccionados</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(b => `
    <tr>
      <td style="white-space:nowrap;color:var(--text-3);font-size:.8125rem;">${formatDateTime(b.fecha)}</td>
      <td>${escapeHtml(b.usuario?.nombre ?? b.usuario?.email ?? '—')}</td>
      <td>${escapeHtml(b.accion)}</td>
      <td>${escapeHtml(ENTIDAD_LABELS[b.entidad] ?? b.entidad)}</td>
      <td style="font-size:.8125rem;">${cambioHtml(b.valor_antes, b.valor_despues)}</td>
    </tr>
  `).join('');
}
