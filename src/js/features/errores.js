import { errorService } from '../services/errorService.js';
import { toast } from '../../components/toast.js';
import { formatDateTime, escapeHtml } from '../core/ui.js';
import { can } from '../core/auth.js';

let _wired = false;

// ── Public ───────────────────────────────────────────────────
export async function setupErrores() {
  if (!can('manage_users')) {
    document.getElementById('errores-tbody').innerHTML =
      `<tr><td colspan="4" class="loading-row" style="color:var(--text-3);">No tienes permiso para ver el monitoreo.</td></tr>`;
    return;
  }

  if (!_wired) {
    document.getElementById('errores-refresh')?.addEventListener('click', load);
    _wired = true;
  }

  await load();
}

// ── Internal ─────────────────────────────────────────────────
async function load() {
  const tbody = document.getElementById('errores-tbody');
  tbody.innerHTML = `<tr class="loading-row"><td colspan="4"><div class="spinner"></div></td></tr>`;
  const { data, error } = await errorService.getRecent();
  if (error) { toast('Error al cargar el monitoreo', 'error'); return; }
  render(data ?? []);
}

function render(list) {
  document.getElementById('errores-count').textContent = list.length;
  const tbody = document.getElementById('errores-tbody');

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="loading-row" style="color:var(--success);">Sin errores registrados 🎉</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(e => `
    <tr>
      <td style="white-space:nowrap;color:var(--text-3);font-size:.8125rem;">${formatDateTime(e.fecha)}</td>
      <td style="color:var(--danger);">${escapeHtml(e.mensaje)}</td>
      <td style="font-size:.8125rem;color:var(--text-3);">${escapeHtml(e.origen ?? '—')}</td>
      <td style="font-size:.8125rem;color:var(--text-3);max-width:220px;" class="truncate">${escapeHtml(e.url ?? '—')}</td>
    </tr>
  `).join('');
}
