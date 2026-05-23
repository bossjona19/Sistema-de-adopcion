import { requireAuth, signOut, getUser } from './auth.js';
import { supabase } from './supabase.js';
import { initOverview } from './dashboard.js';
import { mountSidebar, setActiveNav, initMobileMenu } from '../components/sidebar.js';
import { openModal, closeModal, initModals, confirm } from '../components/modal.js';
import { toast } from '../components/toast.js';
import { getInitials, formatDate, badgeHtml } from './ui.js';

// ── Auth ──────────────────────────────────────────────────────
const session = await requireAuth();
if (!session) throw new Error('redirect');

const user = await getUser();
const displayName = user?.user_metadata?.nombre ?? user?.email?.split('@')[0] ?? 'Admin';
const initials    = getInitials(displayName);

// ── Audit trail ───────────────────────────────────────────────
async function logAudit(accion, entidad) {
  if (!user?.id) return;
  await supabase.from('bitacora').insert({
    usuario_id: user.id,
    accion,
    entidad,
    fecha: new Date().toISOString(),
  });
}

document.getElementById('header-user-name').textContent = displayName;
document.getElementById('header-avatar').textContent    = initials;

mountSidebar({ name: displayName, initials, onNavigate: navigateTo, onLogout: signOut });
initMobileMenu();
initModals();

// ── Tab routing ───────────────────────────────────────────────
const TABS      = ['overview', 'menores', 'familias', 'casos'];
const TAB_NAMES = { overview:'Dashboard', menores:'Menores', familias:'Familias', casos:'Casos' };
const loaded    = new Set();

function navigateTo(tab) {
  if (!TABS.includes(tab)) tab = 'overview';

  TABS.forEach(t => {
    document.getElementById('panel-' + t)?.classList.toggle('active', t === tab);
  });

  document.getElementById('bc-current').textContent = TAB_NAMES[tab] ?? tab;
  setActiveNav(tab);

  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('show');

  if (!loaded.has(tab)) {
    loaded.add(tab);
    initTab(tab);
  }
}

async function initTab(tab) {
  if (tab === 'overview')  return initOverview();
  if (tab === 'menores')   return setupMenores();
  if (tab === 'familias')  return setupFamilias();
  if (tab === 'casos')     return setupCasos();
}

window.addEventListener('hashchange', () => navigateTo(location.hash.slice(1)));

// ── ═══════════════════════════════════════════════ ──────────
// ── MENORES ───────────────────────────────────────────────────
// ── ═══════════════════════════════════════════════ ──────────
let _menores    = [];
let _menorEdit  = null;

async function setupMenores() {
  await loadMenores();

  document.getElementById('menores-search')?.addEventListener('input', filterMenores);
  document.getElementById('menores-filter')?.addEventListener('change', filterMenores);

  document.getElementById('btn-nuevo-menor')?.addEventListener('click', () => {
    _menorEdit = null;
    document.getElementById('form-menor').reset();
    document.getElementById('menor-modal-title').textContent = 'Registrar menor';
    openModal('modal-menor');
  });

  document.getElementById('form-menor')?.addEventListener('submit', saveMenor);
}

async function loadMenores() {
  const tbody = document.getElementById('menores-tbody');
  tbody.innerHTML = `<tr class="loading-row"><td colspan="6"><div class="spinner"></div></td></tr>`;

  const { data, error } = await supabase
    .from('menores').select('*').order('created_at', { ascending: false });

  if (error) { toast('Error al cargar menores', 'error'); return; }
  _menores = data ?? [];
  renderMenoresTable(_menores);
}

function renderMenoresTable(list) {
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
          <button class="btn btn-ghost btn-icon btn-xs" onclick="_editMenor('${m.id}')" title="Editar">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/>
            </svg>
          </button>
          <button class="btn btn-ghost btn-icon btn-xs" onclick="_deleteMenor('${m.id}')" title="Eliminar" style="color:var(--danger);">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m5 5v6m4-6v6"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filterMenores() {
  const q = (document.getElementById('menores-search')?.value ?? '').toLowerCase();
  const e = document.getElementById('menores-filter')?.value ?? '';
  renderMenoresTable(_menores.filter(m =>
    (!q || m.nombre.toLowerCase().includes(q)) && (!e || m.estado === e)
  ));
}

async function saveMenor(ev) {
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

  const { error } = _menorEdit
    ? await supabase.from('menores').update(payload).eq('id', _menorEdit)
    : await supabase.from('menores').insert(payload);

  btn.disabled = false;
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  await logAudit(_menorEdit ? 'Actualizar menor' : 'Crear menor', 'menores');
  toast(_menorEdit ? 'Menor actualizado' : 'Menor registrado', 'success');
  closeModal('modal-menor');
  await loadMenores();
}

window._editMenor = id => {
  const m = _menores.find(x => x.id === id);
  if (!m) return;
  _menorEdit = id;
  document.getElementById('m-nombre').value = m.nombre ?? '';
  document.getElementById('m-edad').value   = m.edad   ?? '';
  document.getElementById('m-estado').value = m.estado ?? 'disponible';
  document.getElementById('m-foto').value   = m.foto_url ?? '';
  document.getElementById('m-desc').value   = m.descripcion ?? '';
  document.getElementById('menor-modal-title').textContent = 'Editar menor';
  openModal('modal-menor');
};

window._deleteMenor = async id => {
  const ok = await confirm('¿Eliminar este menor del sistema?', { danger: true });
  if (!ok) return;
  const { error } = await supabase.from('menores').delete().eq('id', id);
  if (error) { toast('Error al eliminar', 'error'); return; }
  await logAudit('Eliminar menor', 'menores');
  toast('Menor eliminado', 'warning');
  await loadMenores();
};

// ── ═══════════════════════════════════════════════ ──────────
// ── FAMILIAS ──────────────────────────────────────────────────
// ── ═══════════════════════════════════════════════ ──────────
let _familias   = [];
let _familiaEdit= null;

async function setupFamilias() {
  await loadFamilias();

  document.getElementById('familias-search')?.addEventListener('input', filterFamilias);
  document.getElementById('familias-filter')?.addEventListener('change', filterFamilias);

  document.getElementById('btn-nueva-familia')?.addEventListener('click', () => {
    _familiaEdit = null;
    document.getElementById('form-familia').reset();
    document.getElementById('familia-modal-title').textContent = 'Registrar familia';
    openModal('modal-familia');
  });

  document.getElementById('form-familia')?.addEventListener('submit', saveFamilia);
}

async function loadFamilias() {
  const tbody = document.getElementById('familias-tbody');
  tbody.innerHTML = `<tr class="loading-row"><td colspan="5"><div class="spinner"></div></td></tr>`;

  const { data, error } = await supabase
    .from('familias').select('*').order('fecha_solicitud', { ascending: false });

  if (error) { toast('Error al cargar familias', 'error'); return; }
  _familias = data ?? [];
  renderFamiliasTable(_familias);
}

function renderFamiliasTable(list) {
  document.getElementById('familias-count').textContent = list.length;
  const tbody = document.getElementById('familias-tbody');

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="loading-row" style="color:var(--text-3);">Sin resultados</td></tr>`;
    return;
  }

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
        <div class="table-actions">
          <button class="btn btn-ghost btn-icon btn-xs" onclick="_editFamilia('${f.id}')" title="Editar">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/>
            </svg>
          </button>
          <button class="btn btn-ghost btn-icon btn-xs" onclick="_deleteFamilia('${f.id}')" title="Eliminar" style="color:var(--danger);">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m5 5v6m4-6v6"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filterFamilias() {
  const q = (document.getElementById('familias-search')?.value ?? '').toLowerCase();
  const e = document.getElementById('familias-filter')?.value ?? '';
  renderFamiliasTable(_familias.filter(f =>
    (!q || f.apellido.toLowerCase().includes(q) || (f.contacto ?? '').toLowerCase().includes(q)) &&
    (!e || f.estado_eval === e)
  ));
}

async function saveFamilia(ev) {
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

  const { error } = _familiaEdit
    ? await supabase.from('familias').update(payload).eq('id', _familiaEdit)
    : await supabase.from('familias').insert(payload);

  btn.disabled = false;
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  await logAudit(_familiaEdit ? 'Actualizar familia' : 'Crear familia', 'familias');
  toast(_familiaEdit ? 'Familia actualizada' : 'Familia registrada', 'success');
  closeModal('modal-familia');
  await loadFamilias();
}

window._editFamilia = id => {
  const f = _familias.find(x => x.id === id);
  if (!f) return;
  _familiaEdit = id;
  document.getElementById('f-apellido').value = f.apellido ?? '';
  document.getElementById('f-contacto').value = f.contacto ?? '';
  document.getElementById('f-estado').value   = f.estado_eval ?? 'pendiente';
  document.getElementById('f-fecha').value    = f.fecha_solicitud?.slice(0,10) ?? '';
  document.getElementById('f-notas').value    = f.notas ?? '';
  document.getElementById('familia-modal-title').textContent = 'Editar familia';
  openModal('modal-familia');
};

window._deleteFamilia = async id => {
  const ok = await confirm('¿Eliminar esta familia del sistema?', { danger: true });
  if (!ok) return;
  const { error } = await supabase.from('familias').delete().eq('id', id);
  if (error) { toast('Error al eliminar', 'error'); return; }
  await logAudit('Eliminar familia', 'familias');
  toast('Familia eliminada', 'warning');
  await loadFamilias();
};

// ── ═══════════════════════════════════════════════ ──────────
// ── CASOS ─────────────────────────────────────────────────────
// ── ═══════════════════════════════════════════════ ──────────
let _casos    = [];
let _casoEdit = null;

async function setupCasos() {
  await loadCasos();

  document.getElementById('casos-filter')?.addEventListener('change', filterCasos);

  document.getElementById('btn-nuevo-caso')?.addEventListener('click', async () => {
    _casoEdit = null;
    document.getElementById('form-caso').reset();
    document.getElementById('caso-modal-title').textContent = 'Nuevo caso de adopción';
    document.getElementById('c-familia').disabled = false;
    document.getElementById('c-menor').disabled   = false;
    await populateCasoSelects();
    openModal('modal-caso');
  });

  document.getElementById('form-caso')?.addEventListener('submit', saveCaso);
  document.getElementById('form-notas')?.addEventListener('submit', saveNota);
}

async function loadCasos() {
  const tbody = document.getElementById('casos-tbody');
  tbody.innerHTML = `<tr class="loading-row"><td colspan="5"><div class="spinner"></div></td></tr>`;

  const { data, error } = await supabase
    .from('casos')
    .select('*, familia:familias(apellido), menor:menores(nombre)')
    .order('created_at', { ascending: false });

  if (error) { toast('Error al cargar casos', 'error'); return; }
  _casos = data ?? [];
  renderCasosTable(_casos);
}

function renderCasosTable(list) {
  document.getElementById('casos-count').textContent = list.length;
  const tbody = document.getElementById('casos-tbody');

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="loading-row" style="color:var(--text-3);">Sin resultados</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(c => `
    <tr>
      <td style="font-family:var(--font-h);font-weight:600;color:var(--text-3);font-size:.8rem;">#${c.id.slice(-6).toUpperCase()}</td>
      <td>Familia ${c.familia?.apellido ?? '—'}</td>
      <td>${c.menor?.nombre ?? '—'}</td>
      <td>${badgeHtml(c.etapa)}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-ghost btn-icon btn-xs" onclick="_editCaso('${c.id}')" title="Cambiar etapa">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/>
            </svg>
          </button>
          <button class="btn btn-ghost btn-icon btn-xs" onclick="_openNotas('${c.id}')" title="Notas">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </button>
          <button class="btn btn-ghost btn-icon btn-xs" onclick="_deleteCaso('${c.id}')" title="Eliminar" style="color:var(--danger);">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m5 5v6m4-6v6"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filterCasos() {
  const e = document.getElementById('casos-filter')?.value ?? '';
  renderCasosTable(e ? _casos.filter(c => c.etapa === e) : _casos);
}

async function populateCasoSelects(selFamId = '', selMenId = '') {
  const [{ data: fams }, { data: mens }] = await Promise.all([
    supabase.from('familias').select('id,apellido').eq('estado_eval','aprobada').order('apellido'),
    supabase.from('menores').select('id,nombre').eq('estado','disponible').order('nombre'),
  ]);

  document.getElementById('c-familia').innerHTML =
    `<option value="">-- Seleccionar familia aprobada --</option>` +
    (fams ?? []).map(f => `<option value="${f.id}" ${f.id===selFamId?'selected':''}>Familia ${f.apellido}</option>`).join('');

  document.getElementById('c-menor').innerHTML =
    `<option value="">-- Seleccionar menor disponible --</option>` +
    (mens ?? []).map(m => `<option value="${m.id}" ${m.id===selMenId?'selected':''}>${m.nombre}</option>`).join('');
}

async function saveCaso(ev) {
  ev.preventDefault();
  const btn = ev.target.querySelector('[type=submit]');
  btn.disabled = true;

  const familiaId = document.getElementById('c-familia').value;
  const menorId   = document.getElementById('c-menor').value;
  const etapa     = document.getElementById('c-etapa').value;

  if (!familiaId || !menorId) {
    toast('Selecciona familia y menor', 'warning');
    btn.disabled = false;
    return;
  }

  let error;
  if (_casoEdit) {
    ({ error } = await supabase.from('casos').update({ etapa }).eq('id', _casoEdit));
    if (!error && etapa === 'cierre') {
      const c = _casos.find(x => x.id === _casoEdit);
      if (c?.menor_id) await supabase.from('menores').update({ estado:'adoptado' }).eq('id', c.menor_id);
    }
  } else {
    ({ error } = await supabase.from('casos').insert({ familia_id:familiaId, menor_id:menorId, etapa, usuario_id:user.id }));
    if (!error) await supabase.from('menores').update({ estado:'en_proceso' }).eq('id', menorId);
  }

  btn.disabled = false;
  if (error) { toast('Error: ' + error.message, 'error'); return; }
  await logAudit(_casoEdit ? 'Actualizar caso' : 'Crear caso', 'casos');
  toast(_casoEdit ? 'Caso actualizado' : 'Caso creado', 'success');
  closeModal('modal-caso');
  await loadCasos();
}

window._editCaso = async id => {
  const c = _casos.find(x => x.id === id);
  if (!c) return;
  _casoEdit = id;
  await populateCasoSelects(c.familia_id, c.menor_id);
  document.getElementById('c-familia').value  = c.familia_id;
  document.getElementById('c-menor').value    = c.menor_id;
  document.getElementById('c-etapa').value    = c.etapa;
  document.getElementById('c-familia').disabled = true;
  document.getElementById('c-menor').disabled   = true;
  document.getElementById('caso-modal-title').textContent = `Caso #${id.slice(-6).toUpperCase()} — Actualizar`;
  openModal('modal-caso');
};

window._openNotas = async id => {
  document.getElementById('notas-caso-id').value = id;
  document.getElementById('notas-desc').value    = '';
  document.getElementById('notas-list').innerHTML = `<div style="padding:16px;text-align:center;"><div class="spinner"></div></div>`;
  openModal('modal-notas');

  const { data } = await supabase
    .from('seguimiento')
    .select('descripcion,fecha')
    .eq('caso_id', id)
    .order('fecha', { ascending: false });

  const el = document.getElementById('notas-list');
  el.innerHTML = !data?.length
    ? `<p style="color:var(--text-3);font-size:.875rem;padding:12px 0;">Sin notas aún.</p>`
    : data.map(n => `
        <div style="border-left:3px solid var(--primary-dim);padding:8px 12px;margin-bottom:8px;background:var(--surface-2);border-radius:0 var(--r-sm) var(--r-sm) 0;">
          <p style="font-size:.875rem;color:var(--text-2);margin:0;">${n.descripcion}</p>
          <span style="font-size:.75rem;color:var(--text-3);">${formatDate(n.fecha)}</span>
        </div>
      `).join('');
};

async function saveNota(ev) {
  ev.preventDefault();
  const casoId = document.getElementById('notas-caso-id').value;
  const desc   = document.getElementById('notas-desc').value.trim();
  if (!desc) return;
  const { error } = await supabase.from('seguimiento').insert({
    caso_id: casoId, descripcion: desc, fecha: new Date().toISOString(), usuario_id: user.id,
  });
  if (error) { toast('Error al guardar nota', 'error'); return; }
  await logAudit('Agregar nota de seguimiento', 'seguimiento');
  toast('Nota guardada', 'success');
  window._openNotas(casoId);
}

window._deleteCaso = async id => {
  const ok = await confirm('¿Eliminar este caso? Esta acción no se puede deshacer.', { danger: true });
  if (!ok) return;
  const { error } = await supabase.from('casos').delete().eq('id', id);
  if (error) { toast('Error al eliminar', 'error'); return; }
  await logAudit('Eliminar caso', 'casos');
  toast('Caso eliminado', 'warning');
  await loadCasos();
};

// ── Init ──────────────────────────────────────────────────────
const startTab = location.hash.slice(1) || 'overview';
navigateTo(startTab);
