/* ── Toast ── */
let toastContainer = null;

function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

export function showToast(message, type = 'info', duration = 3500) {
  const container = getToastContainer();
  const icons = {
    success: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>`,
    error:   `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
    warning: `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>`,
    info:    `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/></svg>`,
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all .25s ease';
    setTimeout(() => toast.remove(), 260);
  }, duration);
}

/* ── Modal ── */
let activeModal = null;

export function openModal(id) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  overlay.classList.add('active');
  activeModal = overlay;
  document.addEventListener('keydown', onEsc);
}

export function closeModal(id) {
  const overlay = id ? document.getElementById(id) : activeModal;
  if (!overlay) return;
  overlay.classList.remove('active');
  activeModal = null;
  document.removeEventListener('keydown', onEsc);
}

function onEsc(e) {
  if (e.key === 'Escape') closeModal();
}

// Close modal when clicking the overlay backdrop
export function initModalClose() {
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
  document.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-overlay');
      if (modal) closeModal(modal.id);
    });
  });
}

/* ── Confirm dialog ── */
export function confirmDialog(message) {
  return new Promise(resolve => {
    const id = 'omega-confirm';
    let overlay = document.getElementById(id);

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = id;
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal" style="max-width:380px;">
          <div class="modal-header">
            <span class="modal-title" style="font-size:1rem;">Confirmar acción</span>
          </div>
          <p id="${id}-msg" style="font-size:.9rem;color:var(--text-2);"></p>
          <div class="modal-footer">
            <button class="btn btn-ghost btn-sm" id="${id}-cancel">Cancelar</button>
            <button class="btn btn-danger btn-sm" id="${id}-ok">Confirmar</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
    }

    document.getElementById(`${id}-msg`).textContent = message;
    overlay.classList.add('active');

    const cleanup = result => {
      overlay.classList.remove('active');
      resolve(result);
    };

    document.getElementById(`${id}-ok`).onclick     = () => cleanup(true);
    document.getElementById(`${id}-cancel`).onclick = () => cleanup(false);
  });
}

/* ── Spinner ── */
let spinnerEl = null;

export function showSpinner() {
  if (!spinnerEl) {
    spinnerEl = document.createElement('div');
    spinnerEl.className = 'spinner-overlay';
    spinnerEl.innerHTML = '<div class="spinner spinner-lg"></div>';
    document.body.appendChild(spinnerEl);
  }
  spinnerEl.style.display = 'flex';
}

export function hideSpinner() {
  if (spinnerEl) spinnerEl.style.display = 'none';
}

/* ── Avatar initials ── */
export function getInitials(name = '') {
  return name.trim().split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

/* ── Format date ── */
export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ── Badge HTML ── */
export function badgeHtml(value) {
  const labels = {
    disponible:  'Disponible',
    en_proceso:  'En proceso',
    adoptado:    'Adoptado',
    pendiente:   'Pendiente',
    aprobada:    'Aprobada',
    rechazada:   'Rechazada',
    solicitud:   'Solicitud',
    evaluacion:  'Evaluación',
    asignacion:  'Asignación',
    seguimiento: 'Seguimiento',
    cierre:      'Cierre',
  };
  return `<span class="badge badge-${value}">${labels[value] ?? value}</span>`;
}
