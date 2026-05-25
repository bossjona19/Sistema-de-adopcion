import { requireAuth, signOut, getUser } from './core/auth.js';
import { mountSidebar, initMobileMenu, setActiveNav } from '../components/sidebar.js';
import { initModals } from '../components/modal.js';
import { getInitials } from './core/ui.js';
import { setAuditUser } from './services/auditService.js';
import { initRouter, navigateTo } from './core/router.js';
import { initOverview } from './pages/dashboard.js';
import { setupMenores } from './features/menores.js';
import { setupFamilias } from './features/familias.js';
import { setupCasos } from './features/casos.js';

// ── Auth ──────────────────────────────────────────────────────
const session = await requireAuth();
if (!session) throw new Error('redirect');

const user        = await getUser();
setAuditUser(user?.id); // must precede initRouter — features call getUserId() on lazy init

const displayName = user?.user_metadata?.nombre ?? user?.email?.split('@')[0] ?? 'Admin';
const initials    = getInitials(displayName);

document.getElementById('header-user-name').textContent = displayName;
document.getElementById('header-avatar').textContent    = initials;

// ── Shell ─────────────────────────────────────────────────────
mountSidebar({ name: displayName, initials, onNavigate: navigateTo, onLogout: signOut }); // must precede initRouter — creates .nav-link nodes that setActiveNav targets
initMobileMenu();
initModals();

// ── Routing ───────────────────────────────────────────────────
async function initTab(tab) {
  if (tab === 'overview')  return initOverview();
  if (tab === 'menores')   return setupMenores();
  if (tab === 'familias')  return setupFamilias();
  if (tab === 'casos')     return setupCasos();
}

initRouter(initTab, setActiveNav);
