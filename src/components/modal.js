export function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
  el.addEventListener('click', _overlayClose);
  document.addEventListener('keydown', _escClose);
}

export function closeModal(id) {
  const el = id ? document.getElementById(id) : document.querySelector('.modal-overlay.open');
  if (!el) return;
  el.classList.remove('open');
  el.removeEventListener('click', _overlayClose);
  document.removeEventListener('keydown', _escClose);
}

function _overlayClose(e) {
  if (e.target === e.currentTarget) closeModal(e.currentTarget.id);
}
function _escClose(e) {
  if (e.key === 'Escape') closeModal();
}

// Wire up all [data-close] buttons once on DOMContentLoaded
export function initModals() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-close]');
    if (!btn) return;
    const overlay = btn.closest('.modal-overlay');
    if (overlay) closeModal(overlay.id);
  });
}

export function confirm(message, { danger = false } = {}) {
  return new Promise(resolve => {
    let overlay = document.getElementById('_confirm-modal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = '_confirm-modal';
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal" style="max-width:380px;">
          <div class="modal-header" style="padding-bottom:12px;">
            <span class="modal-title" style="font-size:.9375rem;" id="_confirm-title">Confirmar</span>
          </div>
          <div class="modal-body" style="padding-top:4px;">
            <p id="_confirm-msg" style="font-size:.875rem;color:var(--text-2);"></p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost btn-sm" id="_confirm-cancel">Cancelar</button>
            <button class="btn btn-sm" id="_confirm-ok">Confirmar</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
    }

    document.getElementById('_confirm-msg').textContent = message;
    const okBtn = document.getElementById('_confirm-ok');
    okBtn.className = danger ? 'btn btn-danger btn-sm' : 'btn btn-primary btn-sm';

    overlay.classList.add('open');

    const done = result => {
      overlay.classList.remove('open');
      resolve(result);
    };

    okBtn.onclick     = () => done(true);
    document.getElementById('_confirm-cancel').onclick = () => done(false);
    overlay.onclick = e => { if (e.target === overlay) done(false); };
  });
}
