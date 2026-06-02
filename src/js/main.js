import { requireAuth, signOut, getUser, handleOAuthCallback, roleLabel, can } from './core/auth.js';
import { mountSidebar, initMobileMenu, setActiveNav } from '../components/sidebar.js';
import { initModals } from '../components/modal.js';
import { getInitials } from './core/ui.js';
import { setAuditUser } from './services/auditService.js';
import { initRouter, navigateTo } from './core/router.js';
import { initIdleTimeout } from './core/session.js';
import { initErrorLogger } from './core/logger.js';
import { accesoService } from './services/accesoService.js';
import { errorService } from './services/errorService.js';
import { toast } from '../components/toast.js';
import { initOverview } from './pages/dashboard.js';
import { setupMenores } from './features/menores.js';
import { setupFamilias } from './features/familias.js';
import { setupCasos } from './features/casos.js';
import { setupUsuarios } from './features/usuarios.js';
import { setupPapelera } from './features/papelera.js';
import { setupBitacora } from './features/bitacora.js';
import { setupErrores } from './features/errores.js';

// ── Logger global de errores (lo antes posible, para capturar todo) ──
initErrorLogger({ onError: errorService.log });

// ── Auth ──────────────────────────────────────────────────────
let didOAuthLogin = false;
try {
  didOAuthLogin = await handleOAuthCallback(); // exchange PKCE code before session check
} catch (err) {
  console.error('OAuth callback failed:', err);
  window.location.href = '/login.html?error=oauth-failed';
  throw new Error('redirect');
}
const session = await requireAuth();
if (!session) throw new Error('redirect');

const user        = await getUser();
setAuditUser(user?.id); // must precede initRouter — features call getUserId() on lazy init
if (didOAuthLogin) accesoService.log(user?.id, user?.email); // registra el login por Google

const displayName = user?.user_metadata?.nombre ?? user?.email?.split('@')[0] ?? 'Admin';
const initials    = getInitials(displayName);

document.getElementById('header-user-name').textContent = displayName;
document.getElementById('header-avatar').textContent    = initials;

// ── Shell ─────────────────────────────────────────────────────
mountSidebar({ name: displayName, initials, role: roleLabel(), canManageUsers: can('manage_users'), onNavigate: navigateTo, onLogout: signOut }); // must precede initRouter — creates .nav-link nodes that setActiveNav targets
initMobileMenu();
initModals();

// ── Cierre por inactividad (auto-logout) ──────────────────────
initIdleTimeout({
  idleMs: 15 * 60 * 1000, // cierra a los 15 min de inactividad
  warnMs: 60 * 1000,      // avisa 1 min antes
  onWarn:    () => toast('Tu sesión se cerrará por inactividad en 1 minuto.', 'warning', 8000),
  onTimeout: () => signOut(),
});

// ── Routing ───────────────────────────────────────────────────
async function initTab(tab) {
  if (tab === 'overview')  return initOverview();
  if (tab === 'menores')   return setupMenores();
  if (tab === 'familias')  return setupFamilias();
  if (tab === 'casos')     return setupCasos();
  if (tab === 'usuarios') {
    if (!can('manage_users')) return navigateTo('overview'); // no-admins fuera de la gestión de usuarios
    return setupUsuarios();
  }
  if (tab === 'papelera') {
    if (!can('manage_users')) return navigateTo('overview'); // papelera: solo admin
    return setupPapelera();
  }
  if (tab === 'bitacora') {
    if (!can('manage_users')) return navigateTo('overview'); // bitácora: solo admin
    return setupBitacora();
  }
  if (tab === 'errores') {
    if (!can('manage_users')) return navigateTo('overview'); // monitoreo: solo admin
    return setupErrores();
  }
}

initRouter(initTab, setActiveNav);
