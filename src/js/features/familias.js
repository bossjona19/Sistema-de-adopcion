import { familiasService } from '../services/familiasService.js';
import { logAudit } from '../services/auditService.js';
import { openModal, closeModal, confirm } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { getInitials, formatDate, badgeHtml, diffSummary, pagerHtml } from '../core/ui.js';
import { exportCSV, exportPDF, exportExcel } from '../core/export.js';
import { can } from '../core/auth.js';

const EXPORT_COLS = [
  { label: 'Apellido',  value: f => f.apellido },
  { label: 'Contacto',  value: f => f.contacto ?? '' },
  { label: 'Estado',    value: f => f.estado_eval },
  { label: 'Solicitud', value: f => formatDate(f.fecha_solicitud) },
];

const PAGE_SIZE = 20;
let _list   = [];
let _editId = null;
let _wired  = false;
let _page   = 0;
let _total  = 0;
let _searchTimer = null;

// ── Public ───────────────────────────────────────────────────
export async function setupFamilias() {
  if (!_wired) {
    document.getElementById('familias-search')?.addEventListener('input', () => {
      clearTimeout(_searchTimer);
      _searchTimer = setTimeout(applyFilters, 300); // debounce: búsqueda server-side
    });
    document.getElementById('familias-filter')?.addEventListener('change', applyFilters);
    document.getElementById('familias-export')?.addEventListener('click', e => {
      const b = e.target.closest('[data-export]');
      if (b) exportar(b.dataset.export);
    });
    document.getElementById('familias-pager')?.addEventListener('click', e => {
      const b = e.target.closest('[data-page-action]');
      if (!b || b.disabled) return;
      if (b.dataset.pageAction === 'prev' && _page > 0) _page--;
      else if (b.dataset.pageAction === 'next') _page++;
      load();
    });

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
    _wired = true;
  }

  await load();
}

// ── Internal ─────────────────────────────────────────────────
async function load() {
  const tbody = document.getElementById('familias-tbody');
  tbody.innerHTML = `<tr class="loading-row"><td colspan="5"><div class="spinner"></div></td></tr>`;
  const from = _page * PAGE_SIZE;
  const { data, count, error } = await familiasService.getPage({
    search: document.getElementById('familias-search')?.value.trim() ?? '',
    estado: document.getElementById('familias-filter')?.value ?? '',
    from, to: from + PAGE_SIZE - 1,
  });
  if (error) { toast('Error al cargar familias', 'error'); return; }
  _list  = data ?? [];
  _total = count ?? 0;
  document.getElementById('familias-count').textContent = _total;
  render(_list);
  document.getElementById('familias-pager').innerHTML = pagerHtml(_page, PAGE_SIZE, _total);
}

function render(list) {
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

// Búsqueda/filtro cambiaron → volver a la primera página y recargar (server-side).
function applyFilters() {
  _page = 0;
  load();
}

async function exportar(tipo) {
  const { data, error } = await familiasService.getForExport({
    search: document.getElementById('familias-search')?.value.trim() ?? '',
    estado: document.getElementById('familias-filter')?.value ?? '',
  });
  if (error) { toast('No se pudo exportar', 'error'); return; }
  if (!data?.length) { toast('No hay datos para exportar', 'warning'); return; }
  const stamp = new Date().toISOString().slice(0, 10);
  try {
    if (tipo === 'csv')   exportCSV(`familias_${stamp}.csv`, EXPORT_COLS, data);
    if (tipo === 'pdf')   await exportPDF('Familias', `familias_${stamp}.pdf`, EXPORT_COLS, data);
    if (tipo === 'excel') await exportExcel(`familias_${stamp}.xlsx`, 'Familias', EXPORT_COLS, data);
  } catch { toast('No se pudo generar el archivo (¿sin conexión?)', 'error'); }
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

  let error, entidadId = _editId, antes = null, despues = null;
  if (_editId) {
    ({ error } = await familiasService.update(_editId, payload));
    const diff = diffSummary(_list.find(x => x.id === _editId), payload, {
      apellido: 'Apellido', estado_eval: 'Evaluación', contacto: 'Contacto',
      fecha_solicitud: 'Solicitud', notas: 'Notas',
    });
    antes = diff?.antes; despues = diff?.despues;
  } else {
    const res = await familiasService.create(payload);
    error = res.error; entidadId = res.data?.id; despues = `Familia ${payload.apellido}`;
  }

  btn.disabled = false;
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  await logAudit(_editId ? 'Actualizar familia' : 'Crear familia', 'familias', { entidadId, antes, despues });
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
  await logAudit('Eliminar familia', 'familias', { entidadId: id, antes: `Familia ${f?.apellido ?? ''}`.trim() });
  toast('Familia eliminada', 'warning');
  await load();
}
