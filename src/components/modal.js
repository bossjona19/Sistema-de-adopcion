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

// confirm(message, { danger, requireText })
// Si se pasa `requireText`, el usuario debe escribir ese texto exacto para
// habilitar el botón de confirmar (doble confirmación para acciones destructivas).
export function confirm(message, { danger = false, requireText = null } = {}) {
  return new Promise(resolve => {
    let overlay = document.getElementById('_confirm-modal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = '_confirm-modal';
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal" style="max-width:400px;">
          <div class="modal-header" style="padding-bottom:12px;">
            <span class="modal-title" style="font-size:.9375rem;" id="_confirm-title">Confirmar</span>
          </div>
          <div class="modal-body" style="padding-top:4px;">
            <p id="_confirm-msg" style="font-size:.875rem;color:var(--text-2);"></p>
            <input id="_confirm-input" class="form-input" type="text" autocomplete="off"
                   style="margin-top:12px;display:none;">
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost btn-sm" id="_confirm-cancel">Cancelar</button>
            <button class="btn btn-sm" id="_confirm-ok">Confirmar</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
    }

    document.getElementById('_confirm-msg').textContent = message;
    const okBtn     = document.getElementById('_confirm-ok');
    const cancelBtn = document.getElementById('_confirm-cancel');
    const input     = document.getElementById('_confirm-input');
    okBtn.className = danger ? 'btn btn-danger btn-sm' : 'btn btn-primary btn-sm';

    const needsText = !!requireText;
    input.style.display = needsText ? '' : 'none';
    input.value = '';
    input.placeholder = needsText ? `Escribe "${requireText}" para confirmar` : '';
    okBtn.disabled = needsText;
    input.oninput = needsText
      ? () => { okBtn.disabled = input.value.trim() !== requireText; }
      : null;

    overlay.classList.add('open');
    if (needsText) setTimeout(() => input.focus(), 50);

    const done = result => {
      overlay.classList.remove('open');
      input.oninput = okBtn.onclick = cancelBtn.onclick = overlay.onclick = null;
      resolve(result);
    };

    okBtn.onclick     = () => { if (!okBtn.disabled) done(true); };
    cancelBtn.onclick = () => done(false);
    overlay.onclick   = e => { if (e.target === overlay) done(false); };
  });
}
