// Inicializa el branding (nombre/logo de la ONG) en páginas públicas.
// Externalizado para permitir una CSP sin 'unsafe-inline' en script-src.
import { applyBranding } from '../branding.js';

applyBranding();
