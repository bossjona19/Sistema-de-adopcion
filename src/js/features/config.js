import { configService } from '../services/configService.js';
import { logAudit } from '../services/auditService.js';
import { toast } from '../../components/toast.js';
import { can } from '../core/auth.js';

let _wired = false;

export async function setupConfig() {
  if (!can('manage_users')) {
    document.getElementById('config-body').innerHTML =
      `<p style="color:var(--text-3);">No tienes permiso para editar la configuración.</p>`;
    return;
  }

  if (!_wired) {
    document.getElementById('form-config')?.addEventListener('submit', save);
    _wired = true;
  }

  const org = await configService.get();
  document.getElementById('cfg-nombre').value    = org.nombre    ?? '';
  document.getElementById('cfg-contacto').value  = org.contacto  ?? '';
  document.getElementById('cfg-direccion').value = org.direccion ?? '';
  document.getElementById('cfg-logo').value      = org.logo_url  ?? '';
}

async function save(ev) {
  ev.preventDefault();
  const btn = ev.target.querySelector('[type=submit]');
  if (btn.disabled) return;
  btn.disabled = true;

  const { error } = await configService.update({
    nombre:    document.getElementById('cfg-nombre').value.trim() || 'Proyecto OMEGA',
    contacto:  document.getElementById('cfg-contacto').value.trim() || null,
    direccion: document.getElementById('cfg-direccion').value.trim() || null,
    logo_url:  document.getElementById('cfg-logo').value.trim() || null,
  });

  btn.disabled = false;
  if (error) { toast('Error al guardar: ' + error.message, 'error'); return; }
  await logAudit('Actualizar configuración', 'organizacion');
  toast('Configuración guardada · se aplicará en los próximos reportes', 'success');
}
