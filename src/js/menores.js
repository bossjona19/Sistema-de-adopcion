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

// State
let allMenores = [];
let editingId  = null;

const ESTADOS = ['disponible', 'en_proceso', 'adoptado'];
const ESTADO_LABELS = { disponible: 'Disponible', en_proceso: 'En proceso', adoptado: 'Adoptado' };

// DOM refs
const tbody    = document.getElementById('menores-tbody');
const searchEl = document.getElementById('search-input');
const filterEl = document.getElementById('filter-estado');
const countEl  = document.getElementById('total-count');
const form     = document.getElementById('menor-form');
const modalTitle = document.getElementById('modal-title');

// Load
async function loadMenores() {
  const { data, error } = await supabase
    .from('menores')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) { showToast('Error al cargar menores', 'error'); return; }
  allMenores = data ?? [];
  renderTable(allMenores);
}

function renderTable(list) {
  countEl.textContent = list.length;

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-3);">Sin resultados</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(m => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px;">
          ${m.foto_url
            ? `<img src="${m.foto_url}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" alt="">`
            : `<div class="avatar avatar-sm">${getInitials(m.nombre)}</div>`}
          <span style="font-weight:500;color:var(--text-1);">${m.nombre}</span>
        </div>
      </td>
      <td>${m.edad ?? '—'} años</td>
      <td>${badgeHtml(m.estado)}</td>
      <td>${m.descripcion ? m.descripcion.slice(0, 60) + (m.descripcion.length > 60 ? '…' : '') : '—'}</td>
      <td>${formatDate(m.created_at)}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-ghost btn-icon" onclick="editMenor('${m.id}')" title="Editar">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="btn btn-ghost btn-icon" onclick="deleteMenor('${m.id}')" title="Eliminar" style="color:var(--danger);">
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
  const q     = searchEl.value.toLowerCase();
  const estado = filterEl.value;
  const list  = allMenores.filter(m => {
    const matchQ = !q || m.nombre.toLowerCase().includes(q);
    const matchE = !estado || m.estado === estado;
    return matchQ && matchE;
  });
  renderTable(list);
}

searchEl.addEventListener('input', filterAndRender);
filterEl.addEventListener('change', filterAndRender);

// Open modal for new
document.getElementById('btn-nuevo')?.addEventListener('click', () => {
  editingId = null;
  form.reset();
  modalTitle.textContent = 'Registrar menor';
  openModal('modal-menor');
});

// Save
form.addEventListener('submit', async e => {
  e.preventDefault();
  const saveBtn = form.querySelector('[type=submit]');
  saveBtn.disabled = true;

  const payload = {
    nombre:      form.nombre.value.trim(),
    edad:        parseInt(form.edad.value, 10),
    estado:      form.estado.value,
    foto_url:    form.foto_url.value.trim() || null,
    descripcion: form.descripcion.value.trim() || null,
  };

  let error;
  if (editingId) {
    ({ error } = await supabase.from('menores').update(payload).eq('id', editingId));
  } else {
    ({ error } = await supabase.from('menores').insert(payload));
  }

  saveBtn.disabled = false;

  if (error) { showToast('Error al guardar: ' + error.message, 'error'); return; }

  showToast(editingId ? 'Menor actualizado' : 'Menor registrado', 'success');
  closeModal('modal-menor');
  await loadMenores();
});

// Edit
window.editMenor = id => {
  const m = allMenores.find(x => x.id === id);
  if (!m) return;
  editingId = id;
  form.nombre.value      = m.nombre ?? '';
  form.edad.value        = m.edad   ?? '';
  form.estado.value      = m.estado ?? 'disponible';
  form.foto_url.value    = m.foto_url ?? '';
  form.descripcion.value = m.descripcion ?? '';
  modalTitle.textContent = 'Editar menor';
  openModal('modal-menor');
};

// Delete
window.deleteMenor = async id => {
  const ok = await confirmDialog('¿Eliminar este menor del sistema?');
  if (!ok) return;
  const { error } = await supabase.from('menores').delete().eq('id', id);
  if (error) { showToast('Error al eliminar', 'error'); return; }
  showToast('Menor eliminado', 'warning');
  await loadMenores();
};

initModalClose();
await loadMenores();
