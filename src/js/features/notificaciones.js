import { notificacionesService } from '../services/notificacionesService.js';
import { formatDateTime, escapeHtml } from '../core/ui.js';

let _wired = false;

export async function setupNotificaciones() {
  const bell  = document.getElementById('notif-bell');
  const panel = document.getElementById('notif-panel');
  if (!bell || !panel) return;

  if (!_wired) {
    bell.addEventListener('click', async (e) => {
      e.stopPropagation();
      const abrir = panel.hidden;
      panel.hidden = !abrir;
      if (abrir) await openPanel();
    });
    // Cerrar al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (!panel.hidden && !panel.contains(e.target) && !bell.contains(e.target)) panel.hidden = true;
    });
    _wired = true;
  }

  await refreshBadge();
}

async function refreshBadge() {
  const n = await notificacionesService.countUnread();
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  badge.textContent = n > 99 ? '99+' : String(n);
  badge.hidden = n === 0;
}

async function openPanel() {
  const list = document.getElementById('notif-list');
  list.innerHTML = `<div style="padding:18px;text-align:center;"><div class="spinner"></div></div>`;

  const { data, error } = await notificacionesService.getRecent();
  if (error) { list.innerHTML = `<div class="notif-empty">No se pudieron cargar.</div>`; return; }

  if (!data?.length) {
    list.innerHTML = `<div class="notif-empty">No tienes notificaciones.</div>`;
  } else {
    list.innerHTML = data.map(n => `
      <div class="notif-item${n.leida ? '' : ' unread'}">
        <div class="notif-msg">${escapeHtml(n.mensaje)}</div>
        <div class="notif-time">${formatDateTime(n.fecha)}</div>
      </div>
    `).join('');
  }

  // Al abrir, marca todas como leídas y limpia el contador.
  await notificacionesService.markAllRead();
  await refreshBadge();
}
