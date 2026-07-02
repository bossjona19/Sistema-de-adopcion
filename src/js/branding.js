import { configService } from './services/configService.js';
import { escapeHtml } from './core/ui.js';

// Branding global (B7): aplica el nombre de la organización en toda referencia visible.
// - Título del navegador: reemplaza "Proyecto OMEGA"/"OMEGA" por el nombre configurado.
// - Cualquier elemento marcado con [data-org]: su texto pasa a ser el nombre.
// White-label: cada ONG solo cambia el nombre en Configuración, sin tocar código.
export async function applyBranding() {
  let org = { nombre: 'OMEGA', logo_url: null };
  try {
    org = await configService.get();
  } catch { /* sin conexión: se queda el contenido por defecto del HTML */ }
  const name = org?.nombre || 'OMEGA';

  if (document.title) {
    document.title = document.title.replaceAll('Proyecto OMEGA', name).replaceAll(/\bOMEGA\b/g, name);
  }
  document.querySelectorAll('[data-org]').forEach(el => { el.textContent = name; });

  // Logo de la ONG: si está configurado, reemplaza el ícono por defecto.
  // (<img> no requiere CORS para mostrarse, a diferencia del canvas del PDF.)
  if (org?.logo_url) {
    const safe = escapeHtml(org.logo_url);
    document.querySelectorAll('[data-org-logo]').forEach(el => {
      el.innerHTML = `<img src="${safe}" alt="${escapeHtml(name)}" style="width:100%;height:100%;object-fit:contain;border-radius:inherit;">`;
    });
  }
}
