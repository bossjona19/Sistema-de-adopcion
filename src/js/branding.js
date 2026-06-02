import { configService } from './services/configService.js';

// Branding global (B7): aplica el nombre de la organización en toda referencia visible.
// - Título del navegador: reemplaza "Proyecto OMEGA"/"OMEGA" por el nombre configurado.
// - Cualquier elemento marcado con [data-org]: su texto pasa a ser el nombre.
// White-label: cada ONG solo cambia el nombre en Configuración, sin tocar código.
export async function applyBranding() {
  let name = 'OMEGA';
  try {
    name = (await configService.get())?.nombre || name;
  } catch { /* sin conexión: se queda el texto por defecto del HTML */ }

  if (document.title) {
    document.title = document.title.replace(/Proyecto OMEGA/g, name).replace(/\bOMEGA\b/g, name);
  }
  document.querySelectorAll('[data-org]').forEach(el => { el.textContent = name; });
}
