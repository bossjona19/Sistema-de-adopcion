import { menoresService } from '../services/menoresService.js';
import { logAudit } from '../services/auditService.js';
import { openModal, closeModal, confirm } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { getInitials, formatDate, badgeHtml, calcAge, diffSummary, pagerHtml } from '../core/ui.js';
import { exportCSV, exportPDF, exportExcel } from '../core/export.js';
import { getParams, setParams } from '../core/router.js';
import { can } from '../core/auth.js';

const EXPORT_COLS = [
  { label: 'Nombre',     value: m => m.nombre },
  { label: 'Edad',       value: m => calcAge(m.fecha_nacimiento) ?? m.edad ?? '' },
  { label: 'Estado',     value: m => m.estado },
  { label: 'Género',     value: m => m.genero ?? '' },
  { label: 'Registrado', value: m => formatDate(m.created_at) },
];

const PAGE_SIZE = 20;
let _list   = [];
let _editId = null;
let _wired  = false;
let _page   = 0;
let _total  = 0;
let _searchTimer = null;

// ── Public ───────────────────────────────────────────────────
export async function setupMenores() {
  if (!_wired) {
    document.getElementById('menores-search')?.addEventListener('input', () => {
      clearTimeout(_searchTimer);
      _searchTimer = setTimeout(applyFilters, 300); // debounce: búsqueda server-side
    });
    document.getElementById('menores-filter')?.addEventListener('change', applyFilters);
    document.getElementById('menores-genero')?.addEventListener('change', applyFilters);
    document.getElementById('menores-export')?.addEventListener('click', e => {
      const b = e.target.closest('[data-export]');
      if (b) exportar(b.dataset.export);
    });
    document.getElementById('menores-pager')?.addEventListener('click', e => {
      const b = e.target.closest('[data-page-action]');
      if (!b || b.disabled) return;
      if (b.dataset.pageAction === 'prev' && _page > 0) _page--;
      else if (b.dataset.pageAction === 'next') _page++;
      load();
    });

    const btnNuevo = document.getElementById('btn-nuevo-menor');
    if (btnNuevo && !can('create')) btnNuevo.style.display = 'none';
    btnNuevo?.addEventListener('click', () => {
      if (!can('create')) return;
      _editId = null;
      document.getElementById('form-menor').reset();
      document.getElementById('menor-modal-title').textContent = 'Registrar niño';
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
    _wired = true;
  }

  restoreFromUrl(); // filtros vienen de la URL (vista compartible/recargable)
  _page = 0;
  await load();
}

// Restaura search/estado/género desde los query params del hash.
function restoreFromUrl() {
  const p = getParams();
  const s = document.getElementById('menores-search');
  const e = document.getElementById('menores-filter');
  const g = document.getElementById('menores-genero');
  if (s) s.value = p.get('q')      ?? '';
  if (e) e.value = p.get('estado') ?? '';
  if (g) g.value = p.get('genero') ?? '';
}

// ── Internal ─────────────────────────────────────────────────
async function load() {
  const tbody = document.getElementById('menores-tbody');
  tbody.innerHTML = `<tr class="loading-row"><td colspan="6"><div class="spinner"></div></td></tr>`;
  const from = _page * PAGE_SIZE;
  const { data, count, error } = await menoresService.getPage({
    search: document.getElementById('menores-search')?.value.trim() ?? '',
    estado: document.getElementById('menores-filter')?.value ?? '',
    genero: document.getElementById('menores-genero')?.value ?? '',
    from, to: from + PAGE_SIZE - 1,
  });
  if (error) { toast('Error al cargar niños', 'error'); return; }
  _list  = data ?? [];
  _total = count ?? 0;
  document.getElementById('menores-count').textContent = _total;
  render(_list);
  document.getElementById('menores-pager').innerHTML = pagerHtml(_page, PAGE_SIZE, _total);
}

function render(list) {
  const tbody = document.getElementById('menores-tbody');

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="loading-row" style="color:var(--text-3);font-size:.875rem;">Sin resultados</td></tr>`;
    return;
  }

  const editable  = can('edit');
  const deletable = can('delete');

  tbody.innerHTML = list.map(m => {
    const age = calcAge(m.fecha_nacimiento) ?? m.edad;
    return `
    <tr>
      <td>
        <div class="table-name">
          ${m.foto_url
            ? `<img src="${m.foto_url}" style="width:30px;height:30px;border-radius:50%;object-fit:cover;" alt="">`
            : `<div class="avatar avatar-sm">${getInitials(m.nombre)}</div>`}
          ${m.nombre}
        </div>
      </td>
      <td>${age != null ? age + ' años' : '—'}</td>
      <td>${badgeHtml(m.estado)}</td>
      <td style="max-width:200px;" class="truncate">${m.descripcion ?? '—'}</td>
      <td>${formatDate(m.created_at)}</td>
      <td>
        ${editable || deletable ? `<div class="table-actions">
          ${editable ? `<button class="btn btn-ghost btn-icon btn-xs"
            data-action="edit-menor" data-id="${m.id}" title="Editar">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/>
            </svg>
          </button>` : ''}
          ${deletable ? `<button class="btn btn-ghost btn-icon btn-xs"
            data-action="delete-menor" data-id="${m.id}" title="Eliminar" style="color:var(--danger);">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m5 5v6m4-6v6"/>
            </svg>
          </button>` : ''}
        </div>` : '<span style="color:var(--text-3);">—</span>'}
      </td>
    </tr>
  `;
  }).join('');
}

// Búsqueda/filtro cambiaron → persistir en URL, volver a la 1ª página y recargar.
function applyFilters() {
  setParams({
    q:      document.getElementById('menores-search')?.value.trim() ?? '',
    estado: document.getElementById('menores-filter')?.value ?? '',
    genero: document.getElementById('menores-genero')?.value ?? '',
  });
  _page = 0;
  load();
}

// Exporta TODO el listado filtrado (no solo la página actual).
async function exportar(tipo) {
  const { data, error } = await menoresService.getForExport({
    search: document.getElementById('menores-search')?.value.trim() ?? '',
    estado: document.getElementById('menores-filter')?.value ?? '',
    genero: document.getElementById('menores-genero')?.value ?? '',
  });
  if (error) { toast('No se pudo exportar', 'error'); return; }
  if (!data?.length) { toast('No hay datos para exportar', 'warning'); return; }
  const stamp = new Date().toISOString().slice(0, 10);
  try {
    if (tipo === 'csv')   exportCSV(`ninos_${stamp}.csv`, EXPORT_COLS, data);
    if (tipo === 'pdf')   await exportPDF('Niños', `ninos_${stamp}.pdf`, EXPORT_COLS, data);
    if (tipo === 'excel') await exportExcel(`ninos_${stamp}.xlsx`, 'Niños', EXPORT_COLS, data);
  } catch { toast('No se pudo generar el archivo (¿sin conexión?)', 'error'); }
}

function edit(id) {
  const m = _list.find(x => x.id === id);
  if (!m) return;
  _editId = id;
  document.getElementById('m-nombre').value    = m.nombre           ?? '';
  document.getElementById('m-fecha-nac').value = m.fecha_nacimiento ?? '';
  document.getElementById('m-genero').value    = m.genero           ?? '';
  document.getElementById('m-estado').value    = m.estado           ?? 'disponible';
  document.getElementById('m-foto').value      = m.foto_url         ?? '';
  document.getElementById('m-desc').value      = m.descripcion      ?? '';
  document.getElementById('menor-modal-title').textContent = 'Editar niño';
  openModal('modal-menor');
}

async function save(ev) {
  ev.preventDefault();
  const btn = ev.target.querySelector('[type=submit]');
  btn.disabled = true;

  const payload = {
    nombre:           document.getElementById('m-nombre').value.trim(),
    fecha_nacimiento: document.getElementById('m-fecha-nac').value || null,
    genero:           document.getElementById('m-genero').value    || null,
    estado:           document.getElementById('m-estado').value,
    foto_url:         document.getElementById('m-foto').value.trim() || null,
    descripcion:      document.getElementById('m-desc').value.trim() || null,
  };

  let error, entidadId = _editId, antes = null, despues = null;
  if (_editId) {
    ({ error } = await menoresService.update(_editId, payload));
    const diff = diffSummary(_list.find(x => x.id === _editId), payload, {
      nombre: 'Nombre', estado: 'Estado', genero: 'Género',
      fecha_nacimiento: 'Nacimiento', foto_url: 'Foto', descripcion: 'Descripción',
    });
    antes = diff?.antes; despues = diff?.despues;
  } else {
    const res = await menoresService.create(payload);
    error = res.error; entidadId = res.data?.id; despues = payload.nombre;
  }

  btn.disabled = false;
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  await logAudit(_editId ? 'Actualizar niño' : 'Crear niño', 'menores', { entidadId, antes, despues });
  toast(_editId ? 'Niño actualizado' : 'Niño registrado', 'success');
  closeModal('modal-menor');
  await load();
}

async function remove(id) {
  const m = _list.find(x => x.id === id);
  const ok = await confirm(
    `Vas a eliminar a "${m?.nombre ?? 'este niño'}". El registro irá a la papelera y podrás restaurarlo.`,
    { danger: true, requireText: m?.nombre || 'ELIMINAR' }
  );
  if (!ok) return;
  const { error } = await menoresService.remove(id);
  if (error) { toast('Error al eliminar', 'error'); return; }
  await logAudit('Eliminar niño', 'menores', { entidadId: id, antes: m?.nombre });
  toast('Niño eliminado', 'warning');
  await load();
}
