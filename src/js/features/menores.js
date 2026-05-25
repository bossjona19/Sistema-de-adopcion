import { menoresService } from '../services/menoresService.js';
import { logAudit } from '../services/auditService.js';
import { openModal, closeModal, confirm } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { getInitials, formatDate, badgeHtml } from '../ui.js';

let _list   = [];
let _editId = null;

// ── Public ───────────────────────────────────────────────────
export async function setupMenores() {
  await load();

  document.getElementById('menores-search')?.addEventListener('input', filter);
  document.getElementById('menores-filter')?.addEventListener('change', filter);

  document.getElementById('btn-nuevo-menor')?.addEventListener('click', () => {
    _editId = null;
    document.getElementById('form-menor').reset();
    document.getElementById('menor-modal-title').textContent = 'Registrar menor';
    openModal('modal-menor');
  });

  document.getElementById('form-menor')?.addEventListener('submit', save);

  // Event delegation — replaces window._editMenor / window._deleteMenor
  document.getElementById('menores-tbody')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const { action, id } = btn.dataset;
    if (action === 'edit-menor')   edit(id);
    if (action === 'delete-menor') remove(id);
  });
}

// ── Internal ─────────────────────────────────────────────────
async function load() {
  const tbody = document.getElementById('menores-tbody');
  tbody.innerHTML = `<tr class="loading-row"><td colspan="6"><div class="spinner"></div></td></tr>`;
  const { data, error } = await menoresService.getAll();
  if (error) { toast('Error al cargar menores', 'error'); return; }
  _list = data ?? [];
  render(_list);
}

function render(list) {
  document.getElementById('menores-count').textContent = list.length;
  const tbody = document.getElementById('menores-tbody');

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="loading-row" style="color:var(--text-3);font-size:.875rem;">Sin resultados</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(m => `
    <tr>
      <td>
        <div class="table-name">
          ${m.foto_url
            ? `<img src="${m.foto_url}" style="width:30px;height:30px;border-radius:50%;object-fit:cover;" alt="">`
            : `<div class="avatar avatar-sm">${getInitials(m.nombre)}</div>`}
          ${m.nombre}
        </div>
      </td>
      <td>${m.edad != null ? m.edad + ' años' : '—'}</td>
      <td>${badgeHtml(m.estado)}</td>
      <td style="max-width:200px;" class="truncate">${m.descripcion ?? '—'}</td>
      <td>${formatDate(m.created_at)}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-ghost btn-icon btn-xs"
            data-action="edit-menor" data-id="${m.id}" title="Editar">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/>
            </svg>
          </button>
          <button class="btn btn-ghost btn-icon btn-xs"
            data-action="delete-menor" data-id="${m.id}" title="Eliminar" style="color:var(--danger);">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m5 5v6m4-6v6"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filter() {
  const q = (document.getElementById('menores-search')?.value ?? '').toLowerCase();
  const e = document.getElementById('menores-filter')?.value ?? '';
  render(_list.filter(m =>
    (!q || m.nombre.toLowerCase().includes(q)) && (!e || m.estado === e)
  ));
}

function edit(id) {
  const m = _list.find(x => x.id === id);
  if (!m) return;
  _editId = id;
  document.getElementById('m-nombre').value = m.nombre      ?? '';
  document.getElementById('m-edad').value   = m.edad        ?? '';
  document.getElementById('m-estado').value = m.estado      ?? 'disponible';
  document.getElementById('m-foto').value   = m.foto_url    ?? '';
  document.getElementById('m-desc').value   = m.descripcion ?? '';
  document.getElementById('menor-modal-title').textContent = 'Editar menor';
  openModal('modal-menor');
}

async function save(ev) {
  ev.preventDefault();
  const btn = ev.target.querySelector('[type=submit]');
  btn.disabled = true;

  const payload = {
    nombre:      document.getElementById('m-nombre').value.trim(),
    edad:        parseInt(document.getElementById('m-edad').value, 10) || null,
    estado:      document.getElementById('m-estado').value,
    foto_url:    document.getElementById('m-foto').value.trim() || null,
    descripcion: document.getElementById('m-desc').value.trim() || null,
  };

  const { error } = _editId
    ? await menoresService.update(_editId, payload)
    : await menoresService.create(payload);

  btn.disabled = false;
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  await logAudit(_editId ? 'Actualizar menor' : 'Crear menor', 'menores');
  toast(_editId ? 'Menor actualizado' : 'Menor registrado', 'success');
  closeModal('modal-menor');
  await load();
}

async function remove(id) {
  const ok = await confirm('¿Eliminar este menor del sistema?', { danger: true });
  if (!ok) return;
  const { error } = await menoresService.remove(id);
  if (error) { toast('Error al eliminar', 'error'); return; }
  await logAudit('Eliminar menor', 'menores');
  toast('Menor eliminado', 'warning');
  await load();
}
