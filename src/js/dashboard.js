import { requireAuth, signOut, getUser } from './auth.js';
import { supabase } from './supabase.js';
import { getInitials, formatDate, badgeHtml } from './ui.js';
import { initMobileMenu } from './app.js';

const session = await requireAuth();
if (!session) throw new Error('No session');

const user = await getUser();
const displayName = user?.user_metadata?.nombre ?? user?.email?.split('@')[0] ?? 'Admin';
const initials = getInitials(displayName);

// Set user info in sidebar and header
['sidebar-avatar', 'header-avatar'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.textContent = initials;
});
['sidebar-username', 'header-username'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.textContent = displayName;
});

document.getElementById('greeting').textContent =
  `Bienvenido de regreso, ${displayName}`;

// Logout
document.getElementById('logout-btn')?.addEventListener('click', signOut);

// Mobile menu
initMobileMenu();

// Load KPIs
async function loadKPIs() {
  const [menores, familias, casosActivos, casosCerrados] = await Promise.all([
    supabase.from('menores').select('id', { count: 'exact', head: true }),
    supabase.from('familias').select('id', { count: 'exact', head: true }),
    supabase.from('casos').select('id', { count: 'exact', head: true }).neq('etapa', 'cierre'),
    supabase.from('casos').select('id', { count: 'exact', head: true }).eq('etapa', 'cierre'),
  ]);

  document.getElementById('kpi-menores').textContent    = menores.count    ?? 0;
  document.getElementById('kpi-familias').textContent   = familias.count   ?? 0;
  document.getElementById('kpi-casos').textContent      = casosActivos.count ?? 0;
  document.getElementById('kpi-completados').textContent = casosCerrados.count ?? 0;
}

// Load cases by stage
async function loadStages() {
  const stages = ['solicitud', 'evaluacion', 'asignacion', 'seguimiento', 'cierre'];
  const labels  = { solicitud: 'Solicitud', evaluacion: 'Evaluación', asignacion: 'Asignación', seguimiento: 'Seguimiento', cierre: 'Cierre' };

  const results = await Promise.all(
    stages.map(s =>
      supabase.from('casos').select('id', { count: 'exact', head: true }).eq('etapa', s)
    )
  );

  const counts = results.map(r => r.count ?? 0);
  const max = Math.max(...counts, 1);

  const container = document.getElementById('stage-summary');
  container.innerHTML = stages.map((s, i) => `
    <div class="stage-row">
      <span style="font-size:.8rem;color:var(--text-2);width:90px;flex-shrink:0;">${labels[s]}</span>
      <div class="stage-bar-track">
        <div class="stage-bar-fill" style="width:${(counts[i]/max*100).toFixed(1)}%"></div>
      </div>
      <span class="stage-count">${counts[i]}</span>
    </div>
  `).join('');
}

// Load activity log (bitacora)
async function loadActivity() {
  const { data, error } = await supabase
    .from('bitacora')
    .select('accion, entidad, fecha')
    .order('fecha', { ascending: false })
    .limit(8);

  const feed = document.getElementById('activity-feed');

  if (error || !data?.length) {
    feed.innerHTML = `<div class="empty-state"><p>Sin actividad registrada</p></div>`;
    return;
  }

  feed.innerHTML = data.map(item => `
    <div class="activity-item">
      <div class="activity-dot"></div>
      <div>
        <div class="activity-text">${item.accion} · <em>${item.entidad}</em></div>
        <div class="activity-time">${formatDate(item.fecha)}</div>
      </div>
    </div>
  `).join('');
}

// Run all
await Promise.all([loadKPIs(), loadStages(), loadActivity()]);
