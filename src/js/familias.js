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

let allFamilias = [];
let editingId   = null;

const tbody     = document.getElementById('familias-tbody');
const searchEl  = document.getElementById('search-input');
const filterEl  = document.getElementById('filter-estado');
const countEl   = document.getElementById('total-count');
const form      = document.getElementById('familia-form');
const modalTitle= document.getElementById('modal-title');

async function loadFamilias() {
  const { data, error } = await supabase
    .from('familias')
    .select('*')
    .order('fecha_solicitud', { ascending: false });

  if (error) { showToast('Error al cargar familias', 'error'); return; }
  allFamilias = data ?? [];
  renderTable(allFamilias);
}

function renderTable(list) {
  countEl.textContent = list.length;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-3);">Sin resultados</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(f => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="avatar avatar-sm">${getInitials(f.apellido)}</div>
          <span style="font-weight:500;color:var(--text-1);">Familia ${f.apellido}</span>
        </div>
      </td>
      <td>${f.contacto ?? '—'}</td>
      <td>${badgeHtml(f.estado_eval)}</td>
      <td>${formatDate(f.fecha_solicitud)}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-ghost btn-icon" onclick="editFamilia('${f.id}')" title="Editar">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn btn-ghost btn-icon" onclick="deleteFamilia('${f.id}')" title="Eliminar" style="color:var(--danger);">
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

function filterAndRender() {
  const q      = searchEl.value.toLowerCase();
  const estado = filterEl.value;
  const list   = allFamilias.filter(f => {
    const matchQ = !q || f.apellido.toLowerCase().includes(q) || (f.contacto ?? '').toLowerCase().includes(q);
    const matchE = !estado || f.estado_eval === estado;
    return matchQ && matchE;
  });
  renderTable(list);
}

searchEl.addEventListener('input', filterAndRender);
filterEl.addEventListener('change', filterAndRender);

document.getElementById('btn-nuevo')?.addEventListener('click', () => {
  editingId = null;
  form.reset();
  modalTitle.textContent = 'Registrar familia';
  openModal('modal-familia');
});

form.addEventListener('submit', async e => {
  e.preventDefault();
  const saveBtn = form.querySelector('[type=submit]');
  saveBtn.disabled = true;

  const payload = {
    apellido:        form.apellido.value.trim(),
    contacto:        form.contacto.value.trim() || null,
    estado_eval:     form.estado_eval.value,
    fecha_solicitud: form.fecha_solicitud.value || new Date().toISOString().slice(0, 10),
    notas:           form.notas.value.trim() || null,
  };

  let error;
  if (editingId) {
    ({ error } = await supabase.from('familias').update(payload).eq('id', editingId));
  } else {
    ({ error } = await supabase.from('familias').insert(payload));
  }

  saveBtn.disabled = false;

  if (error) { showToast('Error al guardar: ' + error.message, 'error'); return; }

  showToast(editingId ? 'Familia actualizada' : 'Familia registrada', 'success');
  closeModal('modal-familia');
  await loadFamilias();
});

window.editFamilia = id => {
  const f = allFamilias.find(x => x.id === id);
  if (!f) return;
  editingId = id;
  form.apellido.value        = f.apellido ?? '';
  form.contacto.value        = f.contacto ?? '';
  form.estado_eval.value     = f.estado_eval ?? 'pendiente';
  form.fecha_solicitud.value = f.fecha_solicitud?.slice(0, 10) ?? '';
  form.notas.value           = f.notas ?? '';
  modalTitle.textContent = 'Editar familia';
  openModal('modal-familia');
};

window.deleteFamilia = async id => {
  const ok = await confirmDialog('¿Eliminar esta familia del sistema?');
  if (!ok) return;
  const { error } = await supabase.from('familias').delete().eq('id', id);
  if (error) { showToast('Error al eliminar', 'error'); return; }
  showToast('Familia eliminada', 'warning');
  await loadFamilias();
};

initModalClose();
await loadFamilias();
