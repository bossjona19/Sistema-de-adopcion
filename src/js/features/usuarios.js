import { usuariosService } from '../services/usuariosService.js';
import { logAudit, getUserId } from '../services/auditService.js';
import { openModal, closeModal } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { getInitials, formatDate } from '../core/ui.js';
import { can, ROLE_LABELS } from '../core/auth.js';

let _list   = [];
let _editId = null;

// ── Public ───────────────────────────────────────────────────
export async function setupUsuarios() {
  // Defensa en profundidad: solo admin gestiona usuarios (RLS lo refuerza en Supabase).
  if (!can('manage_users')) {
    document.getElementById('usuarios-tbody').innerHTML =
      `<tr><td colspan="5" class="loading-row" style="color:var(--text-3);">No tienes permiso para gestionar usuarios.</td></tr>`;
    return;
  }

  await load();

  document.getElementById('usuarios-search')?.addEventListener('input', filter);
  document.getElementById('usuarios-filter')?.addEventListener('change', filter);
  document.getElementById('form-usuario')?.addEventListener('submit', save);

  document.getElementById('usuarios-tbody')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'edit-rol') editRole(btn.dataset.id);
  });
}

// ── Internal ─────────────────────────────────────────────────
async function load() {
  const tbody = document.getElementById('usuarios-tbody');
  tbody.innerHTML = `<tr class="loading-row"><td colspan="5"><div class="spinner"></div></td></tr>`;
  const { data, error } = await usuariosService.getAll();
  if (error) { toast('Error al cargar usuarios', 'error'); return; }
  _list = data ?? [];
  render(_list);
}

function roleBadge(rol) {
  return `<span class="badge badge-${rol}">${ROLE_LABELS[rol] ?? rol}</span>`;
}

function render(list) {
  document.getElementById('usuarios-count').textContent = list.length;
  const tbody = document.getElementById('usuarios-tbody');

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="loading-row" style="color:var(--text-3);">Sin resultados</td></tr>`;
    return;
  }

  const meId = getUserId();

  tbody.innerHTML = list.map(u => {
    const isSelf = u.id === meId;
    return `
    <tr>
      <td>
        <div class="table-name">
          <div class="avatar avatar-sm">${getInitials(u.nombre)}</div>
          ${u.nombre ?? '—'}${isSelf ? ' <span style="color:var(--text-3);font-size:.75rem;">(tú)</span>' : ''}
        </div>
      </td>
      <td>${u.email ?? '—'}</td>
      <td>${roleBadge(u.rol)}</td>
      <td>${formatDate(u.created_at)}</td>
      <td>
        ${isSelf
          ? '<span style="color:var(--text-3);" title="No puedes cambiar tu propio rol">—</span>'
          : `<button class="btn btn-ghost btn-icon btn-xs" data-action="edit-rol" data-id="${u.id}" title="Cambiar rol">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/>
              </svg>
            </button>`}
      </td>
    </tr>`;
  }).join('');
}

function filter() {
  const q = (document.getElementById('usuarios-search')?.value ?? '').toLowerCase();
  const r = document.getElementById('usuarios-filter')?.value ?? '';
  render(_list.filter(u =>
    (!q || (u.nombre ?? '').toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q)) &&
    (!r || u.rol === r)
  ));
}

function editRole(id) {
  const u = _list.find(x => x.id === id);
  if (!u) return;
  _editId = id;
  document.getElementById('u-nombre').textContent = u.nombre ?? '—';
  document.getElementById('u-email').textContent  = u.email ?? '—';
  document.getElementById('u-rol').value          = u.rol ?? 'director';
  openModal('modal-usuario');
}

async function save(ev) {
  ev.preventDefault();
  if (!_editId) return;
  const btn = ev.target.querySelector('[type=submit]');
  btn.disabled = true;

  const rol = document.getElementById('u-rol').value;
  const { error } = await usuariosService.updateRole(_editId, rol);

  btn.disabled = false;
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  await logAudit(`Cambiar rol a ${ROLE_LABELS[rol] ?? rol}`, 'usuarios', { entidadId: _editId, despues: ROLE_LABELS[rol] ?? rol });
  toast('Rol actualizado', 'success');
  closeModal('modal-usuario');
  await load();
}
