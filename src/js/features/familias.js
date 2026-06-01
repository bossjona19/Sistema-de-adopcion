import { familiasService } from '../services/familiasService.js';
import { logAudit } from '../services/auditService.js';
import { openModal, closeModal, confirm } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { getInitials, formatDate, badgeHtml } from '../core/ui.js';
import { can } from '../core/auth.js';

let _list   = [];
let _editId = null;

// ── Public ───────────────────────────────────────────────────
export async function setupFamilias() {
  await load();

  document.getElementById('familias-search')?.addEventListener('input', filter);
  document.getElementById('familias-filter')?.addEventListener('change', filter);

  const btnNueva = document.getElementById('btn-nueva-familia');
  if (btnNueva && !can('create')) btnNueva.style.display = 'none';
  btnNueva?.addEventListener('click', () => {
    if (!can('create')) return;
    _editId = null;
    document.getElementById('form-familia').reset();
    document.getElementById('familia-modal-title').textContent = 'Registrar familia';
    openModal('modal-familia');
  });

  document.getElementById('form-familia')?.addEventListener('submit', save);

  // Event delegation — replaces window._editFamilia / window._deleteFamilia
  document.getElementById('familias-tbody')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;
    if (action === 'edit-familia')   edit(id);
    if (action === 'delete-familia') remove(id);
  });
}

// ── Internal ─────────────────────────────────────────────────
async function load() {
  const tbody = document.getElementById('familias-tbody');
  tbody.innerHTML = `<tr class="loading-row"><td colspan="5"><div class="spinner"></div></td></tr>`;
  const { data, error } = await familiasService.getAll();
  if (error) { toast('Error al cargar familias', 'error'); return; }
  _list = data ?? [];
  render(_list);
}

function render(list) {
  document.getElementById('familias-count').textContent = list.length;
  const tbody = document.getElementById('familias-tbody');

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="loading-row" style="color:var(--text-3);">Sin resultados</td></tr>`;
    return;
  }

  const editable  = can('edit');
  const deletable = can('delete');

  tbody.innerHTML = list.map(f => `
    <tr>
      <td>
        <div class="table-name">
          <div class="avatar avatar-sm">${getInitials(f.apellido)}</div>
          Familia ${f.apellido}
        </div>
      </td>
      <td>${f.contacto ?? '—'}</td>
      <td>${badgeHtml(f.estado_eval)}</td>
      <td>${formatDate(f.fecha_solicitud)}</td>
      <td>
        ${editable || deletable ? `<div class="table-actions">
          ${editable ? `<button class="btn btn-ghost btn-icon btn-xs"
            data-action="edit-familia" data-id="${f.id}" title="Editar">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/>
            </svg>
          </button>` : ''}
          ${deletable ? `<button class="btn btn-ghost btn-icon btn-xs"
            data-action="delete-familia" data-id="${f.id}" title="Eliminar" style="color:var(--danger);">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m5 5v6m4-6v6"/>
            </svg>
          </button>` : ''}
        </div>` : '<span style="color:var(--text-3);">—</span>'}
      </td>
    </tr>
  `).join('');
}

function filter() {
  const q = (document.getElementById('familias-search')?.value ?? '').toLowerCase();
  const e = document.getElementById('familias-filter')?.value ?? '';
  render(_list.filter(f =>
    (!q || f.apellido.toLowerCase().includes(q) || (f.contacto ?? '').toLowerCase().includes(q)) &&
    (!e || f.estado_eval === e)
  ));
}

function edit(id) {
  const f = _list.find(x => x.id === id);
  if (!f) return;
  _editId = id;
  document.getElementById('f-apellido').value = f.apellido                ?? '';
  document.getElementById('f-contacto').value = f.contacto               ?? '';
  document.getElementById('f-estado').value   = f.estado_eval            ?? 'pendiente';
  document.getElementById('f-fecha').value    = f.fecha_solicitud?.slice(0, 10) ?? '';
  document.getElementById('f-notas').value    = f.notas                  ?? '';
  document.getElementById('familia-modal-title').textContent = 'Editar familia';
  openModal('modal-familia');
}

async function save(ev) {
  ev.preventDefault();
  const btn = ev.target.querySelector('[type=submit]');
  btn.disabled = true;

  const payload = {
    apellido:        document.getElementById('f-apellido').value.trim(),
    contacto:        document.getElementById('f-contacto').value.trim() || null,
    estado_eval:     document.getElementById('f-estado').value,
    fecha_solicitud: document.getElementById('f-fecha').value || new Date().toISOString().slice(0, 10),
    notas:           document.getElementById('f-notas').value.trim() || null,
  };

  const { error } = _editId
    ? await familiasService.update(_editId, payload)
    : await familiasService.create(payload);

  btn.disabled = false;
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  await logAudit(_editId ? 'Actualizar familia' : 'Crear familia', 'familias');
  toast(_editId ? 'Familia actualizada' : 'Familia registrada', 'success');
  closeModal('modal-familia');
  await load();
}

async function remove(id) {
  const f = _list.find(x => x.id === id);
  const ok = await confirm(
    `Vas a eliminar a la familia "${f?.apellido ?? '—'}". El registro irá a la papelera y podrás restaurarlo.`,
    { danger: true, requireText: f?.apellido || 'ELIMINAR' }
  );
  if (!ok) return;
  const { error } = await familiasService.remove(id);
  if (error) { toast('Error al eliminar', 'error'); return; }
  await logAudit('Eliminar familia', 'familias');
  toast('Familia eliminada', 'warning');
  await load();
}
