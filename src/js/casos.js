import { requireAuth, signOut, getUser } from './auth.js';
import { supabase } from './supabase.js';
import { showToast, openModal, closeModal, initModalClose, confirmDialog, getInitials, formatDate, badgeHtml } from './ui.js';
import { initMobileMenu, setSidebarUser } from './app.js';

const session = await requireAuth();
if (!session) throw new Error('No session');

const user = await getUser();
const displayName = user?.user_metadata?.nombre ?? user?.email?.split('@')[0] ?? 'Admin';
setSidebarUser(displayName, getInitials(displayName));
document.getElementById('logout-btn')?.addEventListener('click', signOut);
initMobileMenu();

const ETAPAS = ['solicitud', 'evaluacion', 'asignacion', 'seguimiento', 'cierre'];
const ETAPA_LABELS = {
  solicitud: 'Solicitud', evaluacion: 'Evaluación',
  asignacion: 'Asignación', seguimiento: 'Seguimiento', cierre: 'Cierre',
};

let allCasos = [];
let editingId = null;

const tbody      = document.getElementById('casos-tbody');
const countEl    = document.getElementById('total-count');
const filterEl   = document.getElementById('filter-etapa');
const form       = document.getElementById('caso-form');
const modalTitle = document.getElementById('modal-title');

// Load cases with joins
async function loadCasos() {
  const { data, error } = await supabase
    .from('casos')
    .select('*, familia:familias(apellido), menor:menores(nombre, estado)')
    .order('created_at', { ascending: false });

  if (error) { showToast('Error al cargar casos', 'error'); return; }
  allCasos = data ?? [];
  renderTable(allCasos);
}

function renderTable(list) {
  countEl.textContent = list.length;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-3);">Sin resultados</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(c => `
    <tr>
      <td style="font-weight:500;color:var(--text-1);">#${c.id.slice(-6).toUpperCase()}</td>
      <td>Familia ${c.familia?.apellido ?? '—'}</td>
      <td>${c.menor?.nombre ?? '—'}</td>
      <td>${badgeHtml(c.etapa)}</td>
      <td>${formatDate(c.created_at)}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-ghost btn-icon" onclick="editCaso('${c.id}')" title="Editar / Avanzar etapa">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn btn-ghost btn-icon" onclick="openNotes('${c.id}')" title="Notas de seguimiento">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </button>
          <button class="btn btn-ghost btn-icon" onclick="deleteCaso('${c.id}')" title="Eliminar" style="color:var(--danger);">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

filterEl.addEventListener('change', () => {
  const e = filterEl.value;
  renderTable(e ? allCasos.filter(c => c.etapa === e) : allCasos);
});

// Populate dropdowns
async function populateSelects(selectedFamiliaId = '', selectedMenorId = '') {
  const [{ data: familias }, { data: menores }] = await Promise.all([
    supabase.from('familias').select('id, apellido').eq('estado_eval', 'aprobada').order('apellido'),
    supabase.from('menores').select('id, nombre').eq('estado', 'disponible').order('nombre'),
  ]);

  const famSel = form.familia_id;
  const menSel = form.menor_id;

  famSel.innerHTML = `<option value="">-- Seleccionar familia --</option>` +
    (familias ?? []).map(f => `<option value="${f.id}" ${f.id === selectedFamiliaId ? 'selected' : ''}>Familia ${f.apellido}</option>`).join('');

  menSel.innerHTML = `<option value="">-- Seleccionar menor --</option>` +
    (menores ?? []).map(m => `<option value="${m.id}" ${m.id === selectedMenorId ? 'selected' : ''}>${m.nombre}</option>`).join('');
}

// Open new case modal
document.getElementById('btn-nuevo')?.addEventListener('click', async () => {
  editingId = null;
  form.reset();
  modalTitle.textContent = 'Nuevo caso de adopción';
  await populateSelects();
  openModal('modal-caso');
});

// Save
form.addEventListener('submit', async e => {
  e.preventDefault();
  const saveBtn = form.querySelector('[type=submit]');
  saveBtn.disabled = true;

  const payload = {
    familia_id: form.familia_id.value,
    menor_id:   form.menor_id.value,
    etapa:      form.etapa.value,
    usuario_id: user.id,
  };

  if (!payload.familia_id || !payload.menor_id) {
    showToast('Debes seleccionar una familia y un menor', 'warning');
    saveBtn.disabled = false;
    return;
  }

  let error;
  if (editingId) {
    ({ error } = await supabase.from('casos').update({ etapa: payload.etapa }).eq('id', editingId));
  } else {
    ({ error } = await supabase.from('casos').insert(payload));
    // Update minor status to en_proceso
    if (!error) {
      await supabase.from('menores').update({ estado: 'en_proceso' }).eq('id', payload.menor_id);
    }
  }

  saveBtn.disabled = false;

  if (error) { showToast('Error al guardar: ' + error.message, 'error'); return; }

  // If closed, mark minor as adoptado
  if (payload.etapa === 'cierre' && editingId) {
    const caso = allCasos.find(c => c.id === editingId);
    if (caso?.menor_id) {
      await supabase.from('menores').update({ estado: 'adoptado' }).eq('id', caso.menor_id);
    }
  }

  showToast(editingId ? 'Caso actualizado' : 'Caso creado', 'success');
  closeModal('modal-caso');
  await loadCasos();
});

window.editCaso = async id => {
  const c = allCasos.find(x => x.id === id);
  if (!c) return;
  editingId = id;
  await populateSelects(c.familia_id, c.menor_id);
  form.familia_id.value = c.familia_id;
  form.menor_id.value   = c.menor_id;
  form.etapa.value      = c.etapa;
  // Lock familia/menor when editing, only allow stage change
  form.familia_id.disabled = true;
  form.menor_id.disabled   = true;
  modalTitle.textContent = `Caso #${id.slice(-6).toUpperCase()} — Actualizar etapa`;
  openModal('modal-caso');
};

// Notes modal
window.openNotes = async id => {
  const { data: notes } = await supabase
    .from('seguimiento')
    .select('descripcion, fecha')
    .eq('caso_id', id)
    .order('fecha', { ascending: false });

  const container = document.getElementById('notes-list');
  const notesCasoId = document.getElementById('notes-caso-id');
  notesCasoId.value = id;

  container.innerHTML = !notes?.length
    ? `<p style="color:var(--text-3);font-size:.875rem;">Sin notas aún.</p>`
    : notes.map(n => `
        <div style="border-left:3px solid var(--primary-light);padding:8px 12px;margin-bottom:8px;background:var(--border-light);border-radius:0 var(--r-sm) var(--r-sm) 0;">
          <p style="font-size:.875rem;color:var(--text-2);">${n.descripcion}</p>
          <span style="font-size:.75rem;color:var(--text-3);">${formatDate(n.fecha)}</span>
        </div>
      `).join('');

  openModal('modal-notes');
};

document.getElementById('notes-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  const casoId = document.getElementById('notes-caso-id').value;
  const desc   = document.getElementById('notes-desc').value.trim();
  if (!desc) return;

  const { error } = await supabase.from('seguimiento').insert({
    caso_id:     casoId,
    descripcion: desc,
    fecha:       new Date().toISOString(),
    usuario_id:  user.id,
  });

  if (error) { showToast('Error al guardar nota', 'error'); return; }
  showToast('Nota guardada', 'success');
  document.getElementById('notes-desc').value = '';
  window.openNotes(casoId);
});

window.deleteCaso = async id => {
  const ok = await confirmDialog('¿Eliminar este caso? Esta acción no se puede deshacer.');
  if (!ok) return;
  const { error } = await supabase.from('casos').delete().eq('id', id);
  if (error) { showToast('Error al eliminar', 'error'); return; }
  showToast('Caso eliminado', 'warning');
  await loadCasos();
};

// Re-enable selects after close
document.querySelectorAll('[data-modal-close]').forEach(btn => {
  btn.addEventListener('click', () => {
    form.familia_id.disabled = false;
    form.menor_id.disabled   = false;
  });
});

initModalClose();
await loadCasos();
