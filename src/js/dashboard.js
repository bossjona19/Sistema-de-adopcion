import { supabase } from './supabase.js';
import { formatDate } from './ui.js';

export async function initOverview() {
  await Promise.all([loadKPIs(), loadStages(), loadActivity()]);
}

async function loadKPIs() {
  const [a, b, c, d] = await Promise.all([
    supabase.from('menores').select('*', { count:'exact', head:true }),
    supabase.from('familias').select('*', { count:'exact', head:true }),
    supabase.from('casos').select('*', { count:'exact', head:true }).neq('etapa','cierre'),
    supabase.from('casos').select('*', { count:'exact', head:true }).eq('etapa','cierre'),
  ]);
  setKPI('kpi-menores',    a.count ?? 0);
  setKPI('kpi-familias',   b.count ?? 0);
  setKPI('kpi-casos',      c.count ?? 0);
  setKPI('kpi-cerrados',   d.count ?? 0);
}

function setKPI(id, val) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = '0';
    const target = Number(val);
    if (target === 0) return;
    let n = 0;
    const step = Math.max(1, Math.ceil(target / 20));
    const t = setInterval(() => {
      n = Math.min(n + step, target);
      el.textContent = n;
      if (n >= target) clearInterval(t);
    }, 40);
  }
}

async function loadStages() {
  const stages = ['solicitud','evaluacion','asignacion','seguimiento','cierre'];
  const labels  = { solicitud:'Solicitud', evaluacion:'Evaluación', asignacion:'Asignación', seguimiento:'Seguimiento', cierre:'Cierre' };

  const results = await Promise.all(
    stages.map(s => supabase.from('casos').select('*', { count:'exact', head:true }).eq('etapa', s))
  );
  const counts = results.map(r => r.count ?? 0);
  const max    = Math.max(...counts, 1);

  const el = document.getElementById('stage-list');
  if (!el) return;
  el.innerHTML = stages.map((s, i) => `
    <div class="stage-row">
      <span class="stage-name">${labels[s]}</span>
      <div class="stage-track">
        <div class="stage-fill" style="width:${(counts[i]/max*100).toFixed(1)}%"></div>
      </div>
      <span class="stage-count">${counts[i]}</span>
    </div>
  `).join('');
}

async function loadActivity() {
  const { data } = await supabase
    .from('bitacora')
    .select('accion, entidad, fecha')
    .order('fecha', { ascending: false })
    .limit(8);

  const el = document.getElementById('activity-list');
  if (!el) return;

  if (!data?.length) {
    el.innerHTML = `<div style="padding:20px;text-align:center;font-size:.875rem;color:var(--text-3);">Sin actividad registrada</div>`;
    return;
  }

  el.innerHTML = `<div class="activity-list">${data.map(item => `
    <div class="activity-item">
      <div class="activity-dot"></div>
      <div>
        <div class="activity-text">${item.accion} · <em>${item.entidad}</em></div>
        <div class="activity-time">${formatDate(item.fecha)}</div>
      </div>
    </div>
  `).join('')}</div>`;
}
