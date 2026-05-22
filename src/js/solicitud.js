import { supabase } from './supabase.js';
import { toast } from './ui.js';

// ── Load available children ──────────────────────────────────
async function loadMenores() {
  const { data, error } = await supabase
    .from('menores')
    .select('id, nombre, edad, foto_url, descripcion')
    .eq('estado', 'disponible')
    .order('nombre');

  const grid    = document.getElementById('menores-grid');
  const emptyEl = document.getElementById('menores-empty');

  if (error || !data?.length) {
    grid.style.display = 'none';
    emptyEl.style.display = 'block';
    return;
  }

  grid.innerHTML = data.map(m => `
    <div class="public-menor-card" data-id="${m.id}" data-nombre="${m.nombre}" data-edad="${m.edad ?? ''}">
      <div class="pmc-photo">
        ${m.foto_url
          ? `<img src="${m.foto_url}" alt="${m.nombre}">`
          : `<svg width="40" height="40" fill="none" stroke="#94A3B8" stroke-width="1.5" viewBox="0 0 24 24">
               <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0112 0v2"/>
             </svg>`}
        <div class="pmc-check">
          <svg width="13" height="13" fill="none" stroke="#fff" stroke-width="3" viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
      </div>
      <div class="pmc-info">
        <div class="pmc-name">${m.nombre}</div>
        <div class="pmc-age">${m.edad != null ? m.edad + ' años' : 'Edad no indicada'}</div>
        ${m.descripcion ? `<div class="pmc-desc">${m.descripcion}</div>` : ''}
      </div>
    </div>
  `).join('');

  // Selection logic
  grid.querySelectorAll('.public-menor-card').forEach(card => {
    card.addEventListener('click', () => {
      const wasSelected = card.classList.contains('selected');
      grid.querySelectorAll('.public-menor-card').forEach(c => c.classList.remove('selected'));
      if (!wasSelected) {
        card.classList.add('selected');
        setSelectedMenor(card.dataset.id, card.dataset.nombre, card.dataset.edad);
      } else {
        clearSelectedMenor();
      }
    });
  });
}

// ── Selected minor tag ───────────────────────────────────────
let selectedMenorId = null;

function setSelectedMenor(id, nombre, edad) {
  selectedMenorId = id;
  const tag = document.getElementById('selected-tag');
  tag.style.display = 'flex';
  tag.querySelector('p').textContent = nombre;
  tag.querySelector('span').textContent = edad ? `${edad} años` : '';
  document.getElementById('form-subtitle').textContent =
    'Llena tus datos de contacto para solicitar la adopción de este menor.';
}

function clearSelectedMenor() {
  selectedMenorId = null;
  const tag = document.getElementById('selected-tag');
  tag.style.display = 'none';
  document.getElementById('form-subtitle').textContent =
    'Llena tus datos de contacto. Un administrador se comunicará contigo.';
}

document.getElementById('tag-remove')?.addEventListener('click', () => {
  document.querySelectorAll('.public-menor-card').forEach(c => c.classList.remove('selected'));
  clearSelectedMenor();
});

// ── Scroll to form ───────────────────────────────────────────
document.getElementById('btn-solicitar-general')?.addEventListener('click', () => {
  document.getElementById('solicitud-section').scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('btn-ver-menores')?.addEventListener('click', () => {
  document.getElementById('galeria-section').scrollIntoView({ behavior: 'smooth' });
});

// ── Submit form ──────────────────────────────────────────────
const form = document.getElementById('solicitud-form');

form.addEventListener('submit', async e => {
  e.preventDefault();
  const saveBtn = form.querySelector('[type=submit]');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Enviando...';

  const payload = {
    apellido:        form.apellido.value.trim(),
    contacto:        form.contacto.value.trim(),
    estado_eval:     'pendiente',
    fecha_solicitud: new Date().toISOString().slice(0, 10),
    notas:           buildNotas(),
  };

  const { error } = await supabase.from('familias').insert(payload);

  saveBtn.disabled = false;
  saveBtn.textContent = 'Enviar solicitud';

  if (error) {
    toast('Error al enviar solicitud. Intenta de nuevo.', 'error');
    return;
  }

  // Show success state
  form.style.display = 'none';
  document.getElementById('form-success').style.display = 'block';
});

function buildNotas() {
  const parts = [];
  if (selectedMenorId) {
    const card = document.querySelector(`.public-menor-card[data-id="${selectedMenorId}"]`);
    parts.push(`Interesado en menor: ${card?.dataset.nombre ?? selectedMenorId} (ID: ${selectedMenorId})`);
  }
  if (form.mensaje.value.trim()) {
    parts.push(`Mensaje: ${form.mensaje.value.trim()}`);
  }
  return parts.join('\n') || null;
}

// ── Init ─────────────────────────────────────────────────────
await loadMenores();
