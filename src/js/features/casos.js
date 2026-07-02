import { casosService }    from '../services/casosService.js';
import { familiasService } from '../services/familiasService.js';
import { menoresService }  from '../services/menoresService.js';
import { documentosService } from '../services/documentosService.js';
import { postadopcionService } from '../services/postadopcionService.js';
import { usuariosService } from '../services/usuariosService.js';
import { configService } from '../services/configService.js';
import { notificacionesService } from '../services/notificacionesService.js';
import { logAudit, getUserId, getEntidadHistorial } from '../services/auditService.js';
import { openModal, closeModal, confirm } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { badgeHtml, formatDate, formatDateTime, pagerHtml, calcAge, escapeHtml, estadoMenorLabel, prefEdadLabel } from '../core/ui.js';
import { exportCSV, exportPDF, exportExcel, reportePDF } from '../core/export.js';
import { getParams, setParams } from '../core/router.js';
import { can, getRole } from '../core/auth.js';
import { createCombobox } from '../../components/combobox.js';

// Solo admin/coordinador asignan el responsable de un caso (B8).
const puedeAsignar = () => ['admin', 'coordinador'].includes(getRole());
let _responsablesLoaded = false;

// Ley 46 de 2013: la diferencia de edad entre adoptante y adoptado debe ser
// de al menos 18 años y no mayor de 45.
const DIF_EDAD_MIN = 18;
const DIF_EDAD_MAX = 45;

// Valida la diferencia de edad legal entre una familia y un niño.
// Devuelve { ok, msg?, warn? }. Si falta alguna fecha, ok=true con aviso.
function validarDiferenciaEdad(fam, men) {
  const edadFam = calcAge(fam?.fecha_nacimiento);
  const edadMen = calcAge(men?.fecha_nacimiento);
  if (edadFam == null || edadMen == null) {
    return { ok: true, warn: 'No se pudo verificar la diferencia de edad legal: falta la fecha de nacimiento de la familia o del niño.' };
  }
  const dif = edadFam - edadMen;
  if (dif < DIF_EDAD_MIN || dif > DIF_EDAD_MAX) {
    return {
      ok: false,
      msg: `Diferencia de edad no permitida: familia ${edadFam} años, niño ${edadMen} años (diferencia ${dif}). La Ley 46/2013 exige entre ${DIF_EDAD_MIN} y ${DIF_EDAD_MAX} años.`,
    };
  }
  return { ok: true };
}

// Comprueba el filtro de edad antes de crear un caso. Muestra el aviso/error
// y devuelve true solo si el caso puede crearse.
async function pasaFiltroEdad(familiaId, menorId) {
  const [famRes, menRes] = await Promise.all([
    familiasService.getById(familiaId),
    menoresService.getById(menorId),
  ]);
  const chk = validarDiferenciaEdad(famRes?.data, menRes?.data);
  if (chk.warn) toast(chk.warn, 'warning');
  if (!chk.ok) { toast(chk.msg, 'error'); return false; }
  return true;
}

let _list   = [];
let _editId = null;
let _cbFam  = null;
let _cbMen  = null;
let _wired  = false;
let _docsCasoId = null;
let _expCasoId  = null;
let _savingPost = false; // evita doble-submit en post-adopción

const PAGE_SIZE = 20;
let _page  = 0;
let _total = 0;

const EXPORT_COLS = [
  { label: 'ID',      value: c => '#' + c.id.slice(-6).toUpperCase() },
  { label: 'Familia', value: c => c.familia?.apellido ?? '' },
  { label: 'Niño',    value: c => c.menor?.nombre ?? '' },
  { label: 'Etapa',   value: c => c.etapa },
  { label: 'Inicio',  value: c => formatDate(c.fecha_inicio) },
  { label: 'Cierre',  value: c => c.fecha_cierre ? formatDate(c.fecha_cierre) : '' },
];

const TIPO_DOC_LABELS = {
  evaluacion_psicologica: 'Evaluación psicológica',
  certificado_medico:     'Certificado médico',
  informe_social:         'Informe social',
  documento_legal:        'Documento legal',
  acta_nacimiento:        'Acta de nacimiento',
  informe_seguimiento:    'Informe de seguimiento',
  otro:                   'Otro',
};
const POST_TIPO_LABELS = {
  visita:              'Visita de seguimiento',
  informe_psicologico: 'Informe psicológico',
  informe_social:      'Informe social',
  incidencia:          'Incidencia',
};
const POST_ESTADO_LABELS = {
  no_iniciado:   'No iniciado',
  en_seguimiento:'En seguimiento',
  completado:    'Seguimiento completado',
  cerrado:       'Cerrado',
};
const ESTADO_DOC_LABELS = { recibido: 'Recibido', en_revision: 'En revisión', aprobado: 'Aprobado', rechazado: 'Rechazado' };
const MAX_DOC_MB = 10;

// ── Public ───────────────────────────────────────────────────
export async function setupCasos() {
  if (!_wired) {
    _cbFam = createCombobox(document.getElementById('cb-familia'), [], { placeholder: 'Buscar familia…' });
    _cbMen = createCombobox(document.getElementById('cb-menor'),   [], { placeholder: 'Buscar niño…'   });

    document.getElementById('casos-filter')?.addEventListener('change', applyFilters);
    document.getElementById('casos-mine')?.addEventListener('change', applyFilters);
    document.getElementById('casos-export')?.addEventListener('click', e => {
      const b = e.target.closest('[data-export]');
      if (b) exportar(b.dataset.export);
    });
    document.getElementById('casos-pager')?.addEventListener('click', e => {
      const b = e.target.closest('[data-page-action]');
      if (!b || b.disabled) return;
      if (b.dataset.pageAction === 'prev' && _page > 0) _page--;
      else if (b.dataset.pageAction === 'next') _page++;
      load();
    });

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
      const respSel = document.getElementById('c-responsable');
      if (respSel) respSel.value = '';
      btn.disabled = false;
      openModal('modal-caso');
    });

    document.getElementById('form-caso')?.addEventListener('submit',  saveCaso);
    document.getElementById('form-notas')?.addEventListener('submit', saveNota);

    document.getElementById('casos-tbody')?.addEventListener('click', async e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const { action, id } = btn.dataset;
      if (action === 'edit-caso')       await editCaso(id);
      if (action === 'open-expediente') await openExpediente(id);
      if (action === 'delete-caso')     await removeCaso(id);
    });

    // Pestañas del expediente
    document.getElementById('expediente-tabs')?.addEventListener('click', e => {
      const b = e.target.closest('[data-exptab]');
      if (b) showExpTab(b.dataset.exptab);
    });
    document.getElementById('exp-pdf')?.addEventListener('click', reporteCasoConsolidado);

    // Post-adopción: registrar entrada / cambiar estado del seguimiento
    document.getElementById('exp-post')?.addEventListener('click', async e => {
      if (e.target.closest('[data-post-action="add"]')) await addPost();
      if (e.target.closest('[data-post-action="pdf"]')) await exportarPostPDF();
    });
    document.getElementById('exp-post')?.addEventListener('change', async e => {
      const sel = e.target.closest('[data-post-action="estado"]');
      if (sel) await cambiarEstadoPost(sel.value);
    });

    // Documentos: subida + acciones de la lista (ver / cambiar estado / eliminar)
    document.getElementById('form-documento')?.addEventListener('submit', uploadDoc);
    document.getElementById('documentos-list')?.addEventListener('click', async e => {
      const btn = e.target.closest('[data-doc-action]');
      if (!btn) return;
      if (btn.dataset.docAction === 'ver')       await verDoc(btn.dataset.path);
      if (btn.dataset.docAction === 'descargar') await descargarDoc(btn.dataset.path, btn.dataset.nombre);
      if (btn.dataset.docAction === 'eliminar')  await eliminarDoc(btn.dataset.id, btn.dataset.path);
    });
    document.getElementById('documentos-list')?.addEventListener('change', async e => {
      const sel = e.target.closest('[data-doc-action="estado"]');
      if (sel) await cambiarEstadoDoc(sel.dataset.id, sel.value);
    });
    _wired = true;
  }

  const p = getParams(); // restaura filtros desde la URL
  const f = document.getElementById('casos-filter');
  const m = document.getElementById('casos-mine');
  if (f) f.value = p.get('etapa') ?? '';
  if (m) m.checked = p.get('mias') === '1';
  _page = 0;
  await load();
}

// ── Internal ─────────────────────────────────────────────────
async function load() {
  const tbody = document.getElementById('casos-tbody');
  tbody.innerHTML = `<tr class="loading-row"><td colspan="5"><div class="spinner"></div></td></tr>`;
  const from = _page * PAGE_SIZE;
  const { data, count, error } = await casosService.getPage({
    etapa: document.getElementById('casos-filter')?.value ?? '',
    usuarioId: document.getElementById('casos-mine')?.checked ? getUserId() : '',
    from, to: from + PAGE_SIZE - 1,
  });
  if (error) { toast('Error al cargar casos', 'error'); return; }
  _list  = data ?? [];
  _total = count ?? 0;
  document.getElementById('casos-count').textContent = _total;
  render(_list);
  document.getElementById('casos-pager').innerHTML = pagerHtml(_page, PAGE_SIZE, _total);
}

function render(list) {
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
      <td>Familia ${escapeHtml(c.familia?.apellido ?? '—')}</td>
      <td>${escapeHtml(c.menor?.nombre ?? '—')}</td>
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
          <button class="btn btn-ghost btn-xs"
            data-action="open-expediente" data-id="${c.id}" title="Abrir expediente">
            <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-right:3px;">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
            </svg>
            Expediente
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

// Filtros cambiaron → persistir en URL, volver a la 1ª página y recargar.
function applyFilters() {
  setParams({
    etapa: document.getElementById('casos-filter')?.value ?? '',
    mias:  document.getElementById('casos-mine')?.checked ? '1' : '',
  });
  _page = 0;
  load();
}

async function exportar(tipo) {
  const { data, error } = await casosService.getForExport({
    etapa: document.getElementById('casos-filter')?.value ?? '',
    usuarioId: document.getElementById('casos-mine')?.checked ? getUserId() : '',
  });
  if (error) { toast('No se pudo exportar', 'error'); return; }
  if (!data?.length) { toast('No hay datos para exportar', 'warning'); return; }
  const stamp = new Date().toISOString().slice(0, 10);
  try {
    if (tipo === 'csv')   exportCSV(`casos_${stamp}.csv`, EXPORT_COLS, data);
    if (tipo === 'pdf')   await exportPDF('Casos de adopción', `casos_${stamp}.pdf`, EXPORT_COLS, data);
    if (tipo === 'excel') await exportExcel(`casos_${stamp}.xlsx`, 'Casos', EXPORT_COLS, data);
  } catch { toast('No se pudo generar el archivo (¿sin conexión?)', 'error'); }
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

  // Responsable: solo admin/coordinador pueden asignar (B8).
  const grp = document.getElementById('c-responsable-group');
  if (grp) {
    if (puedeAsignar()) { grp.style.display = ''; await fillResponsables(); }
    else grp.style.display = 'none';
  }
}

async function fillResponsables() {
  if (_responsablesLoaded) return;
  const sel = document.getElementById('c-responsable');
  if (!sel) return;
  const { data } = await usuariosService.getAll();
  (data ?? []).filter(u => u.rol !== 'director').forEach(u => {
    const o = document.createElement('option');
    o.value = u.id;
    o.textContent = u.nombre || u.email;
    sel.appendChild(o);
  });
  _responsablesLoaded = true;
}

async function editCaso(id) {
  const c = _list.find(x => x.id === id);
  if (!c) return;
  _editId = id;
  await populateSelects(c.familia_id, c.menor_id);
  document.getElementById('c-etapa').value = c.etapa;
  const respSel = document.getElementById('c-responsable');
  if (respSel) respSel.value = c.usuario_id ?? '';
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

  const responsableSel = document.getElementById('c-responsable')?.value || '';

  let error, entidadId = _editId, antes = null, despues = null;
  if (_editId) {
    const before = _list.find(x => x.id === _editId);
    const payload = { etapa };
    if (puedeAsignar()) payload.usuario_id = responsableSel || null; // reasignar responsable
    ({ error } = await casosService.update(_editId, payload));
    if (!error && before && before.etapa !== etapa) { antes = before.etapa; despues = etapa; }
    if (!error && etapa === 'cierre' && before?.menor_id) {
      await menoresService.setEstado(before.menor_id, 'adoptado');
    }
  } else {
    // Ley 46/2013: la diferencia de edad familia–niño debe estar en el rango legal.
    if (!await pasaFiltroEdad(familiaId, menorId)) { btn.disabled = false; return; }
    const res = await casosService.create({
      familia_id: familiaId,
      menor_id:   menorId,
      etapa,
      usuario_id: puedeAsignar() ? (responsableSel || getUserId()) : getUserId(),
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

  // A6: notificar al responsable asignado (si no es quien hace el cambio)
  const asignadoId = puedeAsignar() ? (responsableSel || null) : null;
  if (asignadoId && asignadoId !== getUserId()) {
    notificacionesService.create(asignadoId, `Se te asignó el caso #${(entidadId || _editId).slice(-6).toUpperCase()}`, 'asignacion');
  }

  toast(_editId ? 'Caso actualizado' : 'Caso creado', 'success');
  closeModal('modal-caso');
  await load();
}

async function renderNotas(id) {
  const notasForm = document.getElementById('form-notas');
  if (notasForm) notasForm.style.display = can('edit') ? '' : 'none'; // director: solo lectura
  document.getElementById('notas-caso-id').value = id;
  document.getElementById('notas-desc').value    = '';
  document.getElementById('notas-list').innerHTML =
    `<div style="padding:16px;text-align:center;"><div class="spinner"></div></div>`;

  const { data } = await casosService.getSeguimiento(id);
  const el = document.getElementById('notas-list');
  el.innerHTML = !data?.length
    ? `<p style="color:var(--text-3);font-size:.875rem;padding:12px 0;">Sin notas aún.</p>`
    : data.map(n => `
        <div style="border-left:3px solid var(--primary-dim);padding:8px 12px;margin-bottom:8px;
                    background:var(--surface-2);border-radius:0 var(--r-sm) var(--r-sm) 0;">
          <p style="font-size:.875rem;color:var(--text-2);margin:0;">${escapeHtml(n.descripcion)}</p>
          <span style="font-size:.75rem;color:var(--text-3);">${formatDate(n.fecha)}</span>
        </div>
      `).join('');
}

async function saveNota(ev) {
  ev.preventDefault();
  const btn = ev.target.querySelector('[type=submit]');
  if (btn?.disabled) return;            // ya se está guardando (anti doble-submit)
  const casoId = document.getElementById('notas-caso-id').value;
  const desc   = document.getElementById('notas-desc').value.trim();
  if (!desc) return;
  if (btn) btn.disabled = true;

  const { error } = await casosService.addSeguimiento({
    caso_id:    casoId,
    descripcion: desc,
    fecha:      new Date().toISOString(),
    usuario_id: getUserId(),
  });

  if (btn) btn.disabled = false;
  if (error) { toast('Error al guardar nota', 'error'); return; }
  await logAudit('Agregar nota de seguimiento', 'seguimiento', { entidadId: casoId, despues: desc.slice(0, 80) });
  toast('Nota guardada', 'success');
  await renderNotas(casoId);
}

// ── Expediente (pestañas) ────────────────────────────────────
const CHECKLIST = [
  { tipo: 'evaluacion_psicologica', label: 'Evaluación psicológica' },
  { tipo: 'certificado_medico',     label: 'Certificado médico' },
  { tipo: 'informe_social',         label: 'Informe social' },
  { tipo: 'documento_legal',        label: 'Documento legal' },
  { tipo: 'acta_nacimiento',        label: 'Acta de nacimiento' },
];

async function openExpediente(id) {
  _expCasoId  = id;
  _docsCasoId = id; // las funciones de documentos usan _docsCasoId
  const caso = _list.find(x => x.id === id);
  const code = id.slice(-6).toUpperCase();
  document.getElementById('expediente-title').textContent =
    `Expediente · #${code}` + (caso ? ` · ${caso.menor?.nombre ?? '—'} / Familia ${caso.familia?.apellido ?? '—'}` : '');
  document.getElementById('documentos-upload').style.display = can('edit') ? '' : 'none';
  document.getElementById('form-documento')?.reset();
  openModal('modal-expediente');
  await showExpTab('info');
}

async function showExpTab(tab) {
  document.querySelectorAll('#expediente-tabs .exp-tab')
    .forEach(b => b.classList.toggle('active', b.dataset.exptab === tab));
  document.querySelectorAll('#modal-expediente .exp-panel')
    .forEach(p => p.classList.toggle('active', p.dataset.exppanel === tab));

  if (tab === 'info')      await renderInfo(_expCasoId);
  if (tab === 'docs')      await loadDocs();
  if (tab === 'notas')     await renderNotas(_expCasoId);
  if (tab === 'post')      await renderPost(_expCasoId);
  if (tab === 'historial') await renderHistorial(_expCasoId);
}

async function renderInfo(id) {
  const caso = _list.find(x => x.id === id);
  const cont = document.getElementById('exp-info');
  cont.innerHTML = `<div style="padding:12px;text-align:center;"><div class="spinner"></div></div>`;

  const { data: docs } = await documentosService.list(id);
  const present  = new Set((docs ?? []).map(d => d.tipo));
  const approved = new Set((docs ?? []).filter(d => d.estado === 'aprobado').map(d => d.tipo));

  const checklist = CHECKLIST.map(item => {
    let icon, color, estado;
    if (approved.has(item.tipo))     { icon = '✓'; color = 'var(--success)'; estado = badgeHtml('aprobado'); }
    else if (present.has(item.tipo)) { icon = '◐'; color = 'var(--warning)'; estado = badgeHtml('en_revision'); }
    else                             { icon = '○'; color = 'var(--text-3)'; estado = `<span style="font-size:.75rem;color:var(--text-3);">Falta</span>`; }
    return `<div style="display:flex;align-items:center;gap:9px;padding:6px 0;border-bottom:1px solid var(--border-2);">
      <span style="color:${color};font-weight:700;width:14px;text-align:center;">${icon}</span>
      <span style="font-size:.875rem;color:var(--text-2);">${item.label}</span>
      <span style="margin-left:auto;">${estado}</span>
    </div>`;
  }).join('');

  cont.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:7px;margin-bottom:18px;">
      <div><span style="color:var(--text-3);font-size:.8125rem;">Niño:</span> <strong>${escapeHtml(caso?.menor?.nombre ?? '—')}</strong></div>
      <div><span style="color:var(--text-3);font-size:.8125rem;">Familia:</span> <strong>${escapeHtml(caso?.familia?.apellido ?? '—')}</strong></div>
      <div style="display:flex;align-items:center;gap:8px;"><span style="color:var(--text-3);font-size:.8125rem;">Etapa:</span> ${badgeHtml(caso?.etapa ?? '—')}</div>
    </div>
    <div class="card-title" style="font-size:.8125rem;margin-bottom:4px;">Checklist de documentos</div>
    ${checklist}`;
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
        <div style="font-size:.8125rem;color:var(--text-2);" class="truncate">${escapeHtml(d.nombre)}${d.autor_externo ? ` · <em>${escapeHtml(d.autor_externo)}</em>` : ''}</div>
        <div style="font-size:.75rem;color:var(--text-3);margin-top:3px;">
          ${badgeHtml(docEstado(d))} · ${formatDate(d.fecha)}${d.fecha_vencimiento ? ` · vence ${formatDate(d.fecha_vencimiento)}` : ''}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;flex-shrink:0;">
        <div style="display:flex;gap:4px;">
          <button class="btn btn-ghost btn-xs" data-doc-action="ver" data-path="${escapeHtml(d.storage_path)}" title="Ver">Ver</button>
          <button class="btn btn-ghost btn-xs" data-doc-action="descargar" data-path="${escapeHtml(d.storage_path)}" data-nombre="${escapeHtml(d.nombre)}" title="Descargar">Descargar</button>
        </div>
        ${editable ? `<select class="form-select" data-doc-action="estado" data-id="${d.id}" style="width:auto;font-size:.75rem;padding:2px 6px;">
          ${Object.entries(ESTADO_DOC_LABELS).map(([v, l]) => `<option value="${v}" ${d.estado === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>` : ''}
        ${deletable ? `<button class="btn btn-ghost btn-xs" data-doc-action="eliminar" data-id="${d.id}" data-path="${escapeHtml(d.storage_path)}" style="color:var(--danger);">Eliminar</button>` : ''}
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

async function descargarDoc(path, nombre) {
  const { url, error } = await documentosService.signedUrl(path, 120, nombre || true);
  if (error || !url) { toast('No se pudo descargar el documento', 'error'); return; }
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre || '';
  document.body.appendChild(a);
  a.click();
  a.remove();
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

// ── Post-adopción (A7) ───────────────────────────────────────
async function renderPost(id) {
  const caso = _list.find(x => x.id === id);
  const cont = document.getElementById('exp-post');
  if (!caso) { cont.innerHTML = ''; return; }

  if (caso.etapa !== 'cierre') {
    cont.innerHTML = `<p style="color:var(--text-3);padding:10px 0;">
      El seguimiento post-adopción se habilita cuando el caso llega a <strong>Cierre</strong> (adopción finalizada).</p>`;
    return;
  }

  cont.innerHTML = `<div style="padding:12px;text-align:center;"><div class="spinner"></div></div>`;
  const { data, error } = await postadopcionService.list(id);
  if (error) { cont.innerHTML = `<p style="color:var(--danger);padding:8px;">No se pudo cargar el seguimiento.</p>`; return; }

  const editable = can('edit');
  const estado = caso.estado_post ?? 'no_iniciado';
  const hoy = new Date().toISOString().slice(0, 10);
  const prox = (data ?? []).map(r => r.proxima_visita).filter(d => d && d >= hoy).sort()[0];

  const lista = (data ?? []).length
    ? data.map(r => `
        <div style="border-left:3px solid var(--primary-dim);padding:8px 12px;margin-bottom:8px;background:var(--surface-2);border-radius:0 var(--r-sm) var(--r-sm) 0;">
          <div style="display:flex;justify-content:space-between;gap:8px;">
            <strong style="font-size:.8125rem;">${POST_TIPO_LABELS[r.tipo] ?? r.tipo}</strong>
            <span style="font-size:.75rem;color:var(--text-3);">${formatDate(r.fecha)}</span>
          </div>
          ${r.observaciones ? `<p style="font-size:.875rem;color:var(--text-2);margin:4px 0 0;">${escapeHtml(r.observaciones)}</p>` : ''}
          <div style="font-size:.75rem;color:var(--text-3);margin-top:3px;">
            ${r.responsable?.nombre ? 'Responsable: ' + escapeHtml(r.responsable.nombre) : ''}${r.proxima_visita ? ` · Próxima visita: ${formatDate(r.proxima_visita)}` : ''}
          </div>
        </div>`).join('')
    : `<p style="color:var(--text-3);font-size:.875rem;padding:8px 0;">Sin registros de seguimiento.</p>`;

  const estadoCtrl = editable
    ? `<select class="form-select" data-post-action="estado" style="width:auto;">
        ${Object.entries(POST_ESTADO_LABELS).map(([v, l]) => `<option value="${v}" ${estado === v ? 'selected' : ''}>${l}</option>`).join('')}
       </select>`
    : `<span class="badge badge-${estado === 'cerrado' ? 'cierre' : estado === 'completado' ? 'aprobado' : 'en_revision'}">${POST_ESTADO_LABELS[estado]}</span>`;

  const form = editable ? `
    <hr style="margin:14px 0;">
    <div class="form-row">
      <div class="form-group">
        <label class="form-label" for="post-tipo">Tipo *</label>
        <select class="form-select" id="post-tipo">
          ${Object.entries(POST_TIPO_LABELS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="post-fecha">Fecha</label>
        <input class="form-input" id="post-fecha" type="date" value="${hoy}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label" for="post-obs">Observaciones</label>
      <textarea class="form-textarea" id="post-obs" style="min-height:60px;" placeholder="Detalle de la visita / informe…"></textarea>
    </div>
    <div class="form-group">
      <label class="form-label" for="post-proxima">Próxima visita (opcional)</label>
      <input class="form-input" id="post-proxima" type="date">
    </div>
    <div style="display:flex;justify-content:flex-end;">
      <button class="btn btn-primary btn-sm" data-post-action="add">Registrar seguimiento</button>
    </div>` : '';

  cont.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
      <span style="font-size:.8125rem;color:var(--text-3);">Estado del seguimiento:</span>
      ${estadoCtrl}
      ${(data ?? []).length ? `<button class="btn btn-ghost btn-xs" data-post-action="pdf" style="margin-left:auto;">PDF</button>` : ''}
    </div>
    ${prox ? `<div style="font-size:.8125rem;color:var(--text-2);margin-bottom:12px;">📅 Próxima visita programada: <strong>${formatDate(prox)}</strong></div>` : ''}
    ${lista}
    ${form}`;
}

async function addPost() {
  if (_savingPost) return;          // bloquea el doble-click mientras guarda
  _savingPost = true;
  const btn = document.querySelector('#exp-post [data-post-action="add"]');
  if (btn) btn.disabled = true;
  try {
    const tipo    = document.getElementById('post-tipo')?.value;
    const fecha   = document.getElementById('post-fecha')?.value || new Date().toISOString().slice(0, 10);
    const obs     = document.getElementById('post-obs')?.value.trim();
    const proxima = document.getElementById('post-proxima')?.value || null;

    const { error } = await postadopcionService.create({
      caso_id: _expCasoId, tipo, fecha,
      observaciones: obs || null, proxima_visita: proxima, responsable: getUserId(),
    });
    if (error) { toast('Error al registrar: ' + error.message, 'error'); if (btn) btn.disabled = false; return; }

    // Primer registro → arranca el seguimiento automáticamente.
    const caso = _list.find(x => x.id === _expCasoId);
    if (caso && caso.estado_post === 'no_iniciado') {
      await casosService.setEstadoPost(_expCasoId, 'en_seguimiento');
      caso.estado_post = 'en_seguimiento';
    }
    await logAudit(`Seguimiento post-adopción: ${POST_TIPO_LABELS[tipo] ?? tipo}`, 'postadopcion', { entidadId: _expCasoId, despues: obs?.slice(0, 80) });
    toast('Seguimiento registrado', 'success');
    await renderPost(_expCasoId); // re-render → botón nuevo, ya habilitado
  } finally {
    _savingPost = false;
  }
}

// Expediente consolidado para impresión: info + documentos + notas + post-adopción + historial.
async function reporteCasoConsolidado() {
  const id = _expCasoId;
  const caso = _list.find(x => x.id === id);
  if (!caso) return;
  const code = id.slice(-6).toUpperCase();

  const [org, menorRes, familiaRes, docs, notas, post, hist] = await Promise.all([
    configService.get(),
    menoresService.getById(caso.menor_id),
    familiasService.getById(caso.familia_id),
    documentosService.list(id),
    casosService.getSeguimiento(id),
    postadopcionService.list(id),
    getEntidadHistorial('casos', id),
  ]);
  const m = menorRes.data ?? {};
  const f = familiaRes.data ?? {};
  const edad = calcAge(m.fecha_nacimiento);

  const bloques = [
    { heading: 'Información del expediente', lines: [
      `Caso: #${code}`,
      `Etapa actual: ${ETAPA_LABELS[caso.etapa] ?? caso.etapa}`,
      `Estado post-adopción: ${POST_ESTADO_LABELS[caso.estado_post] ?? caso.estado_post ?? '—'}`,
      `Responsable: ${caso.responsable?.nombre ?? '—'}`,
      `Fecha de inicio: ${caso.fecha_inicio ? formatDate(caso.fecha_inicio) : '—'}`,
      `Fecha de cierre: ${caso.fecha_cierre ? formatDate(caso.fecha_cierre) : '—'}`,
    ] },
    { heading: 'Datos del niño', lines: [
      `Nombre: ${m.nombre ?? caso.menor?.nombre ?? '—'}`,
      `Edad: ${edad != null ? edad + ' años' : '—'}`,
      `Fecha de nacimiento: ${m.fecha_nacimiento ? formatDate(m.fecha_nacimiento) : '—'}`,
      `Género: ${m.genero ?? '—'}`,
      `Estado: ${estadoMenorLabel(m.estado)}`,
      `Descripción: ${m.descripcion ?? '—'}`,
    ] },
    { heading: 'Datos de la familia', lines: [
      `Apellido: ${f.apellido ?? caso.familia?.apellido ?? '—'}`,
      `Solicitante: ${f.nombre_completo ?? '—'}`,
      `Cédula: ${f.cedula ?? '—'}`,
      `Contacto: ${f.contacto ?? '—'}`,
      `Email: ${f.email ?? '—'}`,
      `Teléfono: ${f.telefono ?? '—'}`,
      `Dirección: ${f.direccion ?? '—'}`,
      `Estado de evaluación: ${f.estado_eval ?? '—'}`,
      `Fecha de solicitud: ${f.fecha_solicitud ? formatDate(f.fecha_solicitud) : '—'}`,
    ] },
    { heading: 'Perfil del solicitante', lines: [
      `Estado civil: ${f.estado_civil ?? '—'}`,
      `Ocupación: ${f.ocupacion ?? '—'}`,
      `Ingresos aprox.: ${f.ingresos_aprox ?? '—'}`,
      `N° de hijos: ${f.num_hijos ?? '—'}`,
      `Personas en el hogar: ${f.num_personas_hogar ?? '—'}`,
      `Experiencia con niños: ${f.experiencia_ninos ?? '—'}`,
      `Etapa de desarrollo preferida: ${prefEdadLabel(f.preferencia_edad)}`,
    ] },
    { heading: 'Motivación para adoptar', lines: [ f.motivacion ?? '—' ] },
    { heading: 'Documentos', table: {
      columns: ['Tipo', 'Nombre', 'Estado', 'Fecha'],
      rows: (docs.data ?? []).map(d => [TIPO_DOC_LABELS[d.tipo] ?? d.tipo, d.nombre, d.estado, formatDate(d.fecha)]),
    } },
    { heading: 'Seguimiento (notas)', table: {
      columns: ['Fecha', 'Descripción'],
      rows: (notas.data ?? []).map(n => [formatDate(n.fecha), n.descripcion]),
    } },
    { heading: 'Post-adopción', table: {
      columns: ['Fecha', 'Tipo', 'Observaciones', 'Próxima visita'],
      rows: (post.data ?? []).map(r => [formatDate(r.fecha), POST_TIPO_LABELS[r.tipo] ?? r.tipo, r.observaciones ?? '', r.proxima_visita ? formatDate(r.proxima_visita) : '']),
    } },
    { heading: 'Historial de cambios', table: {
      columns: ['Fecha', 'Acción', 'Cambio'],
      rows: (hist.data ?? []).map(h => [formatDate(h.fecha), h.accion, [h.valor_antes, h.valor_despues].filter(Boolean).join(' → ')]),
    } },
  ];

  try {
    await reportePDF(org, `Expediente consolidado · Caso #${code}`, bloques, `expediente_${code}.pdf`);
  } catch { toast('No se pudo generar el expediente', 'error'); }
}

async function exportarPostPDF() {
  const { data } = await postadopcionService.list(_expCasoId);
  if (!data?.length) { toast('No hay seguimiento para exportar', 'warning'); return; }
  const code = _expCasoId.slice(-6).toUpperCase();
  const cols = [
    { label: 'Fecha',          value: r => formatDate(r.fecha) },
    { label: 'Tipo',           value: r => POST_TIPO_LABELS[r.tipo] ?? r.tipo },
    { label: 'Responsable',    value: r => r.responsable?.nombre ?? '' },
    { label: 'Observaciones',  value: r => r.observaciones ?? '' },
    { label: 'Próxima visita', value: r => r.proxima_visita ? formatDate(r.proxima_visita) : '' },
  ];
  try {
    await exportPDF(`Seguimiento post-adopción · Caso #${code}`, `seguimiento_${code}.pdf`, cols, data);
  } catch { toast('No se pudo generar el PDF', 'error'); }
}

async function cambiarEstadoPost(estado) {
  const { error } = await casosService.setEstadoPost(_expCasoId, estado);
  if (error) { toast('Error al cambiar el estado', 'error'); return; }
  const caso = _list.find(x => x.id === _expCasoId);
  if (caso) caso.estado_post = estado;
  await logAudit('Cambiar estado post-adopción', 'postadopcion', { entidadId: _expCasoId, despues: POST_ESTADO_LABELS[estado] });
  toast('Estado actualizado', 'success');
  await renderPost(_expCasoId);
}

const ETAPA_LABELS = {
  solicitud: 'Solicitud', evaluacion: 'Evaluación', asignacion: 'Asignación',
  seguimiento: 'Seguimiento', cierre: 'Cierre',
};
const prettyEtapa = v => ETAPA_LABELS[v] ?? v;

// Timeline unificado del expediente: combina la bitácora del caso (creación,
// cambios de etapa, restauración…) con las notas de seguimiento, en orden cronológico.
async function renderHistorial(id) {
  const body = document.getElementById('historial-body');
  body.innerHTML = `<div style="padding:24px;text-align:center;"><div class="spinner"></div></div>`;

  const [hist, notas, docs, post] = await Promise.all([
    getEntidadHistorial('casos', id),
    casosService.getSeguimiento(id),
    documentosService.list(id),
    postadopcionService.list(id),
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
  (post.data ?? []).forEach(r => {
    events.push({ fecha: r.fecha, texto: `Post-adopción · ${POST_TIPO_LABELS[r.tipo] ?? r.tipo}${r.observaciones ? ': ' + r.observaciones : ''}`, autor: r.responsable?.nombre ?? null });
  });

  events.sort((a, b) => new Date(a.fecha) - new Date(b.fecha)); // cronológico ascendente

  body.innerHTML = events.length
    ? `<div class="activity-list" style="padding:0;">${events.map(e => `
        <div class="activity-item">
          <div class="activity-dot"></div>
          <div>
            <div class="activity-text">${escapeHtml(e.texto)}</div>
            <div class="activity-time">${formatDateTime(e.fecha)}${e.autor ? ' · ' + escapeHtml(e.autor) : ''}</div>
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
