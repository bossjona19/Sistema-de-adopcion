import { casosService }    from '../services/casosService.js';
import { familiasService } from '../services/familiasService.js';
import { menoresService }  from '../services/menoresService.js';
import { logAudit, getUserId } from '../services/auditService.js';
import { openModal, closeModal, confirm } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { badgeHtml, formatDate } from '../core/ui.js';
import { can } from '../core/auth.js';
import { createCombobox } from '../../components/combobox.js';

let _list   = [];
let _editId = null;
let _cbFam  = null;
let _cbMen  = null;

// ── Public ───────────────────────────────────────────────────
export async function setupCasos() {
  await load();

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
    if (action === 'edit-caso')   await editCaso(id);
    if (action === 'open-notas')  await openNotas(id);
    if (action === 'delete-caso') await removeCaso(id);
  });
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
