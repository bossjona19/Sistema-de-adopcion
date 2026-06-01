import { casosService }    from '../services/casosService.js';
import { familiasService } from '../services/familiasService.js';
import { menoresService }  from '../services/menoresService.js';
import { documentosService } from '../services/documentosService.js';
import { logAudit, getUserId, getEntidadHistorial } from '../services/auditService.js';
import { openModal, closeModal, confirm } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { badgeHtml, formatDate, formatDateTime } from '../core/ui.js';
import { can } from '../core/auth.js';
import { createCombobox } from '../../components/combobox.js';

let _list   = [];
let _editId = null;
let _cbFam  = null;
let _cbMen  = null;
let _wired  = false;
let _docsCasoId = null;

const TIPO_DOC_LABELS = {
  evaluacion_psicologica: 'Evaluación psicológica',
  certificado_medico:     'Certificado médico',
  informe_social:         'Informe social',
  documento_legal:        'Documento legal',
  acta_nacimiento:        'Acta de nacimiento',
  otro:                   'Otro',
};
const ESTADO_DOC_LABELS = { recibido: 'Recibido', en_revision: 'En revisión', aprobado: 'Aprobado', rechazado: 'Rechazado' };
const MAX_DOC_MB = 10;

// ── Public ───────────────────────────────────────────────────
export async function setupCasos() {
  if (!_wired) {
    _cbFam = createCombobox(document.getElementById('cb-familia'), [], { placeholder: 'Buscar familia…' });
    _cbMen = createCombobox(document.getElementById('cb-menor'),   [], { placeholder: 'Buscar niño…'   });

    document.getElementById('casos-filter')?.addEventListener('change', filter);

    const btnNuevo = document.getElementById('btn-nuevo-caso');
    if (btnNuevo && !can('create')) btnNuevo.style.display = 'none';
    btnNuevo?.addEventListener('click', async e => {
      const btn = e.currentTarget;
      if (!can('create') || btn.disabled) return;
      btn.disabled = true;
      _editId = null;
      document.getElementById('c-etapa').value = 'solicitud';
      document.getElementById('caso-modal-title').textContent = 'Nuevo caso de adopción';
      _cbFam.clear();
      _cbMen.clear();
      _cbFam.setDisabled(false);
      _cbMen.setDisabled(false);
      await populateSelects();
      btn.disabled = false;
      openModal('modal-caso');
    });

    document.getElementById('form-caso')?.addEventListener('submit',  saveCaso);
    document.getElementById('form-notas')?.addEventListener('submit', saveNota);

    document.getElementById('casos-tbody')?.addEventListener('click', async e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const { action, id } = btn.dataset;
      if (action === 'edit-caso')      await editCaso(id);
      if (action === 'open-notas')     await openNotas(id);
      if (action === 'open-docs')      await openDocumentos(id);
      if (action === 'open-historial') await openHistorial(id);
      if (action === 'delete-caso')    await removeCaso(id);
    });

    // Documentos: subida + acciones de la lista (ver / cambiar estado / eliminar)
    document.getElementById('form-documento')?.addEventListener('submit', uploadDoc);
    document.getElementById('documentos-list')?.addEventListener('click', async e => {
      const btn = e.target.closest('[data-doc-action]');
      if (!btn) return;
      if (btn.dataset.docAction === 'ver')      await verDoc(btn.dataset.path);
      if (btn.dataset.docAction === 'eliminar') await eliminarDoc(btn.dataset.id, btn.dataset.path);
    });
    document.getElementById('documentos-list')?.addEventListener('change', async e => {
      const sel = e.target.closest('[data-doc-action="estado"]');
      if (sel) await cambiarEstadoDoc(sel.dataset.id, sel.value);
    });
    _wired = true;
  }

  await load();
}

// ── Internal ─────────────────────────────────────────────────
async function load() {
  const tbody = document.getElementById('casos-tbody');
  tbody.innerHTML = `<tr class="loading-row"><td colspan="5"><div class="spinner"></div></td></tr>`;
  const { data, error } = await casosService.getAll();
  if (error) { toast('Error al cargar casos', 'error'); return; }
  _list = data ?? [];
  render(_list);
}

function render(list) {
  document.getElementById('casos-count').textContent = list.length;
  const tbody = document.getElementById('casos-tbody');

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="loading-row" style="color:var(--text-3);">Sin resultados</td></tr>`;
    return;
  }

  const editable  = can('edit');
  const deletable = can('delete');

  tbody.innerHTML = list.map(c => `
    <tr>
      <td style="font-family:var(--font-h);font-weight:600;color:var(--text-3);font-size:.8rem;">
        #${c.id.slice(-6).toUpperCase()}
      </td>
      <td>Familia ${c.familia?.apellido ?? '—'}</td>
      <td>${c.menor?.nombre ?? '—'}</td>
      <td>${badgeHtml(c.etapa)}</td>
      <td>
        <div class="table-actions">
          ${editable ? `<button class="btn btn-ghost btn-icon btn-xs"
            data-action="edit-caso" data-id="${c.id}" title="Cambiar etapa">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/>
            </svg>
          </button>` : ''}
          <button class="btn btn-ghost btn-icon btn-xs"
            data-action="open-notas" data-id="${c.id}" title="Notas de seguimiento">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </button>
          <button class="btn btn-ghost btn-icon btn-xs"
            data-action="open-docs" data-id="${c.id}" title="Documentos del expediente">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
          </button>
          <button class="btn btn-ghost btn-icon btn-xs"
            data-action="open-historial" data-id="${c.id}" title="Historial del expediente">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 106 5.3L3 8"/><path d="M12 7v5l4 2"/>
            </svg>
          </button>
          ${deletable ? `<button class="btn btn-ghost btn-icon btn-xs"
            data-action="delete-caso" data-id="${c.id}" title="Eliminar" style="color:var(--danger);">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m5 5v6m4-6v6"/>
            </svg>
          </button>` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

function filter() {
  const e = document.getElementById('casos-filter')?.value ?? '';
  render(e ? _list.filter(c => c.etapa === e) : _list);
}

async function populateSelects(selFamId = '', selMenId = '') {
  const promises = [
    familiasService.getAprobadas(),
    casosService.getMenoresDisponibles(selMenId || null),
  ];
  if (!selFamId) promises.push(casosService.getCasosActivos());

  const [famRes, menRes, activosRes] = await Promise.all(promises);
  if (famRes.error || menRes.error) {
    toast('Error al cargar las opciones del caso. Intente nuevamente.', 'error');
    return;
  }
  const fams = famRes.data;
  const mens = menRes.data;

  const ocupadasIds = new Set((activosRes?.data ?? []).map(c => c.familia_id));

  _cbFam.setItems(
    (fams ?? [])
      .filter(f => !ocupadasIds.has(f.id))
      .map(f => ({ id: f.id, label: `Familia ${f.apellido}` }))
  );
  _cbMen.setItems(
    (mens ?? []).map(m => ({ id: m.id, label: m.nombre, status: m.estado }))
  );

  if (selFamId) _cbFam.setValue(selFamId);
  if (selMenId) _cbMen.setValue(selMenId);
}

async function editCaso(id) {
  const c = _list.find(x => x.id === id);
  if (!c) return;
  _editId = id;
  await populateSelects(c.familia_id, c.menor_id);
  document.getElementById('c-etapa').value = c.etapa;
  _cbFam.setDisabled(true);
  _cbMen.setDisabled(true);
  document.getElementById('caso-modal-title').textContent = `Caso #${id.slice(-6).toUpperCase()} — Actualizar`;
  openModal('modal-caso');
}

async function saveCaso(ev) {
  ev.preventDefault();
  const btn = ev.target.querySelector('[type=submit]');
  btn.disabled = true;

  const familiaId = _cbFam.getValue();
  const menorId   = _cbMen.getValue();
  const etapa     = document.getElementById('c-etapa').value;

  if (!familiaId || !menorId) {
    toast('Selecciona familia y niño', 'warning');
    btn.disabled = false;
    return;
  }

  let error, entidadId = _editId, antes = null, despues = null;
  if (_editId) {
    const before = _list.find(x => x.id === _editId);
    ({ error } = await casosService.update(_editId, { etapa }));
    if (!error && before && before.etapa !== etapa) { antes = before.etapa; despues = etapa; }
    if (!error && etapa === 'cierre' && before?.menor_id) {
      await menoresService.setEstado(before.menor_id, 'adoptado');
    }
  } else {
    const res = await casosService.create({
      familia_id: familiaId,
      menor_id:   menorId,
      etapa,
      usuario_id: getUserId(),
    });
    error = res.error; entidadId = res.data?.id;
    if (!error) {
      despues = `Etapa inicial: ${etapa}`;
      const { error: estadoErr } = await menoresService.setEstado(menorId, 'en_proceso');
      if (estadoErr) toast('Caso creado, pero no se pudo actualizar el estado del niño. Revise el módulo de Niños.', 'warning');
    }
  }

  btn.disabled = false;
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  await logAudit(_editId ? 'Actualizar caso' : 'Crear caso', 'casos', { entidadId, antes, despues });
  toast(_editId ? 'Caso actualizado' : 'Caso creado', 'success');
  closeModal('modal-caso');
  await load();
}

async function openNotas(id) {
  const notasForm = document.getElementById('form-notas');
  if (notasForm) notasForm.style.display = can('edit') ? '' : 'none'; // director: solo lectura
  document.getElementById('notas-caso-id').value = id;
  document.getElementById('notas-desc').value    = '';
  document.getElementById('notas-list').innerHTML =
    `<div style="padding:16px;text-align:center;"><div class="spinner"></div></div>`;
  openModal('modal-notas');

  const { data } = await casosService.getSeguimiento(id);
  const el = document.getElementById('notas-list');
  el.innerHTML = !data?.length
    ? `<p style="color:var(--text-3);font-size:.875rem;padding:12px 0;">Sin notas aún.</p>`
    : data.map(n => `
        <div style="border-left:3px solid var(--primary-dim);padding:8px 12px;margin-bottom:8px;
                    background:var(--surface-2);border-radius:0 var(--r-sm) var(--r-sm) 0;">
          <p style="font-size:.875rem;color:var(--text-2);margin:0;">${n.descripcion}</p>
          <span style="font-size:.75rem;color:var(--text-3);">${formatDate(n.fecha)}</span>
        </div>
      `).join('');
}

async function saveNota(ev) {
  ev.preventDefault();
  const casoId = document.getElementById('notas-caso-id').value;
  const desc   = document.getElementById('notas-desc').value.trim();
  if (!desc) return;

  const { error } = await casosService.addSeguimiento({
    caso_id:    casoId,
    descripcion: desc,
    fecha:      new Date().toISOString(),
    usuario_id: getUserId(),
  });

  if (error) { toast('Error al guardar nota', 'error'); return; }
  await logAudit('Agregar nota de seguimiento', 'seguimiento', { entidadId: casoId, despues: desc.slice(0, 80) });
  toast('Nota guardada', 'success');
  await openNotas(casoId);
}

// ── Documentos ───────────────────────────────────────────────
async function openDocumentos(id) {
  _docsCasoId = id;
  const code = id.slice(-6).toUpperCase();
  document.getElementById('documentos-title').textContent = `Documentos · Caso #${code}`;
  document.getElementById('documentos-upload').style.display = can('edit') ? '' : 'none'; // director: solo lectura
  document.getElementById('form-documento').reset();
  openModal('modal-documentos');
  await loadDocs();
}

// Calcula 'vencido' a partir de la fecha (no se guarda; solo se muestra).
function docEstado(d) {
  if (d.estado !== 'aprobado' && d.fecha_vencimiento && new Date(d.fecha_vencimiento) < new Date()) return 'vencido';
  return d.estado;
}

async function loadDocs() {
  const list = document.getElementById('documentos-list');
  list.innerHTML = `<div style="padding:16px;text-align:center;"><div class="spinner"></div></div>`;
  const { data, error } = await documentosService.list(_docsCasoId);
  if (error) { list.innerHTML = `<p style="color:var(--danger);padding:8px;">Error al cargar documentos.</p>`; return; }
  renderDocs(data ?? []);
}

function renderDocs(docs) {
  const list = document.getElementById('documentos-list');
  if (!docs.length) {
    list.innerHTML = `<p style="color:var(--text-3);padding:8px 0;">Sin documentos todavía.</p>`;
    return;
  }
  const editable  = can('edit');
  const deletable = can('delete');

  list.innerHTML = docs.map(d => `
    <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-2);">
      <div style="flex:1;min-width:0;">
        <div style="font-weight:600;font-size:.875rem;">${TIPO_DOC_LABELS[d.tipo] ?? d.tipo}</div>
        <div style="font-size:.8125rem;color:var(--text-2);" class="truncate">${d.nombre}${d.autor_externo ? ` · <em>${d.autor_externo}</em>` : ''}</div>
        <div style="font-size:.75rem;color:var(--text-3);margin-top:3px;">
          ${badgeHtml(docEstado(d))} · ${formatDate(d.fecha)}${d.fecha_vencimiento ? ` · vence ${formatDate(d.fecha_vencimiento)}` : ''}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;flex-shrink:0;">
        <button class="btn btn-ghost btn-xs" data-doc-action="ver" data-path="${d.storage_path}">Ver</button>
        ${editable ? `<select class="form-select" data-doc-action="estado" data-id="${d.id}" style="width:auto;font-size:.75rem;padding:2px 6px;">
          ${Object.entries(ESTADO_DOC_LABELS).map(([v, l]) => `<option value="${v}" ${d.estado === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>` : ''}
        ${deletable ? `<button class="btn btn-ghost btn-xs" data-doc-action="eliminar" data-id="${d.id}" data-path="${d.storage_path}" style="color:var(--danger);">Eliminar</button>` : ''}
      </div>
    </div>
  `).join('');
}

async function uploadDoc(ev) {
  ev.preventDefault();
  const file = document.getElementById('d-file').files[0];
  if (!file) { toast('Selecciona un archivo', 'warning'); return; }
  if (file.size > MAX_DOC_MB * 1024 * 1024) { toast(`El archivo supera ${MAX_DOC_MB} MB`, 'warning'); return; }

  const tipo = document.getElementById('d-tipo').value;
  const btn  = document.getElementById('d-submit');
  btn.disabled = true;
  const { error } = await documentosService.upload({
    casoId:           _docsCasoId,
    file,
    tipo,
    autorExterno:     document.getElementById('d-autor').value.trim(),
    fechaVencimiento: document.getElementById('d-vence').value || null,
    subidoPor:        getUserId(),
  });
  btn.disabled = false;
  if (error) { toast('Error al subir: ' + error.message, 'error'); return; }
  await logAudit('Subir documento', 'documentos', { entidadId: _docsCasoId, despues: `${TIPO_DOC_LABELS[tipo]}: ${file.name}` });
  toast('Documento subido', 'success');
  document.getElementById('form-documento').reset();
  await loadDocs();
}

async function verDoc(path) {
  const { url, error } = await documentosService.signedUrl(path, 120);
  if (error || !url) { toast('No se pudo abrir el documento', 'error'); return; }
  window.open(url, '_blank', 'noopener');
}

async function cambiarEstadoDoc(id, estado) {
  const { error } = await documentosService.setEstado(id, estado, getUserId());
  if (error) { toast('Error al cambiar el estado', 'error'); return; }
  await logAudit('Cambiar estado de documento', 'documentos', { entidadId: _docsCasoId, despues: ESTADO_DOC_LABELS[estado] });
  toast('Estado actualizado', 'success');
  await loadDocs();
}

async function eliminarDoc(id, path) {
  const ok = await confirm('¿Eliminar este documento? Esta acción no se puede deshacer.', { danger: true });
  if (!ok) return;
  const { error } = await documentosService.remove(id, path);
  if (error) { toast('Error al eliminar', 'error'); return; }
  await logAudit('Eliminar documento', 'documentos', { entidadId: _docsCasoId });
  toast('Documento eliminado', 'warning');
  await loadDocs();
}

const ETAPA_LABELS = {
  solicitud: 'Solicitud', evaluacion: 'Evaluación', asignacion: 'Asignación',
  seguimiento: 'Seguimiento', cierre: 'Cierre',
};
const prettyEtapa = v => ETAPA_LABELS[v] ?? v;

// Timeline unificado del expediente: combina la bitácora del caso (creación,
// cambios de etapa, restauración…) con las notas de seguimiento, en orden cronológico.
async function openHistorial(id) {
  const caso = _list.find(x => x.id === id);
  const code = id.slice(-6).toUpperCase();
  document.getElementById('historial-title').textContent =
    `Historial · Caso #${code}` + (caso ? ` · ${caso.menor?.nombre ?? '—'} / Familia ${caso.familia?.apellido ?? '—'}` : '');

  const body = document.getElementById('historial-body');
  body.innerHTML = `<div style="padding:24px;text-align:center;"><div class="spinner"></div></div>`;
  openModal('modal-historial');

  const [hist, notas, docs] = await Promise.all([
    getEntidadHistorial('casos', id),
    casosService.getSeguimiento(id),
    documentosService.list(id),
  ]);

  if (hist.error || notas.error) {
    body.innerHTML = `<p style="color:var(--danger);padding:8px;">No se pudo cargar el historial.</p>`;
    return;
  }

  const events = [];
  (hist.data ?? []).forEach(b => {
    let texto = b.accion;
    const antes = prettyEtapa(b.valor_antes), despues = prettyEtapa(b.valor_despues);
    if (b.valor_antes && b.valor_despues) texto += `: ${antes} → ${despues}`;
    else if (b.valor_despues)             texto += `: ${despues}`;
    else if (b.valor_antes)               texto += `: ${antes}`;
    events.push({ fecha: b.fecha, texto, autor: b.usuario?.nombre ?? b.usuario?.email });
  });
  (notas.data ?? []).forEach(n => {
    events.push({ fecha: n.fecha, texto: `Nota: ${n.descripcion}`, autor: n.usuario?.nombre ?? n.usuario?.email });
  });
  (docs.data ?? []).forEach(d => {
    events.push({ fecha: d.fecha, texto: `Documento agregado: ${TIPO_DOC_LABELS[d.tipo] ?? d.tipo} (${d.nombre})`, autor: d.autor_externo || null });
  });

  events.sort((a, b) => new Date(a.fecha) - new Date(b.fecha)); // cronológico ascendente

  body.innerHTML = events.length
    ? `<div class="activity-list" style="padding:0;">${events.map(e => `
        <div class="activity-item">
          <div class="activity-dot"></div>
          <div>
            <div class="activity-text">${e.texto}</div>
            <div class="activity-time">${formatDateTime(e.fecha)}${e.autor ? ' · ' + e.autor : ''}</div>
          </div>
        </div>`).join('')}</div>`
    : `<p style="color:var(--text-3);padding:8px;">Sin historial registrado todavía.</p>`;
}

async function removeCaso(id) {
  const caso = _list.find(x => x.id === id);
  const code = id.slice(-6).toUpperCase();
  const ok = await confirm(
    `Vas a eliminar el caso #${code}. Irá a la papelera y podrás restaurarlo.`,
    { danger: true, requireText: code }
  );
  if (!ok) return;
  const { error } = await casosService.remove(id);
  if (error) { toast('Error al eliminar', 'error'); return; }
  if (caso?.menor_id && caso.etapa !== 'cierre') {
    const { error: estadoErr } = await menoresService.setEstado(caso.menor_id, 'disponible');
    if (estadoErr) toast('Caso eliminado, pero no se pudo restaurar la disponibilidad del niño. Revise el módulo de Niños.', 'warning');
  }
  await logAudit('Eliminar caso', 'casos', { entidadId: id, antes: `#${code} · etapa ${caso?.etapa ?? '—'}` });
  toast('Caso eliminado', 'warning');
  await load();
}
