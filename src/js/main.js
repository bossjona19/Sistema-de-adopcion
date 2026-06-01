import { requireAuth, signOut, getUser, handleOAuthCallback, roleLabel, can } from './core/auth.js';
import { mountSidebar, initMobileMenu, setActiveNav } from '../components/sidebar.js';
import { initModals } from '../components/modal.js';
import { getInitials } from './core/ui.js';
import { setAuditUser } from './services/auditService.js';
import { initRouter, navigateTo } from './core/router.js';
import { initOverview } from './pages/dashboard.js';
import { setupMenores } from './features/menores.js';
import { setupFamilias } from './features/familias.js';
import { setupCasos } from './features/casos.js';
import { setupUsuarios } from './features/usuarios.js';

// ── Auth ──────────────────────────────────────────────────────
try {
  await handleOAuthCallback(); // exchange PKCE code before session check
} catch (err) {
  console.error('OAuth callback failed:', err);
  window.location.href = '/login.html?error=oauth-failed';
  throw new Error('redirect');
}
const session = await requireAuth();
if (!session) throw new Error('redirect');

const user        = await getUser();
setAuditUser(user?.id); // must precede initRouter — features call getUserId() on lazy init

const displayName = user?.user_metadata?.nombre ?? user?.email?.split('@')[0] ?? 'Admin';
const initials    = getInitials(displayName);

document.getElementById('header-user-name').textContent = displayName;
document.getElementById('header-avatar').textContent    = initials;

// ── Shell ─────────────────────────────────────────────────────
mountSidebar({ name: displayName, initials, role: roleLabel(), canManageUsers: can('manage_users'), onNavigate: navigateTo, onLogout: signOut }); // must precede initRouter — creates .nav-link nodes that setActiveNav targets
initMobileMenu();
initModals();

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
}

initRouter(initTab, setActiveNav);
