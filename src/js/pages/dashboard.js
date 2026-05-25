import { dashboardService } from '../services/dashboardService.js';
import { formatDate } from '../core/ui.js';

export async function initOverview() {
  await Promise.all([loadKPIs(), loadStages(), loadActivity()]);
}

async function loadKPIs() {
  const kpis = await dashboardService.getKPIs();
  setKPI('kpi-menores',  kpis.menores);
  setKPI('kpi-familias', kpis.familias);
  setKPI('kpi-casos',    kpis.activos);
  setKPI('kpi-cerrados', kpis.cerrados);
}

function setKPI(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
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

async function loadStages() {
  const LABELS = {
    solicitud:   'Solicitud',
    evaluacion:  'Evaluación',
    asignacion:  'Asignación',
    seguimiento: 'Seguimiento',
    cierre:      'Cierre',
  };

  const etapas = await dashboardService.getEtapas();
  const max    = Math.max(...etapas.map(e => e.count), 1);

  const el = document.getElementById('stage-list');
  if (!el) return;
  el.innerHTML = etapas.map(({ etapa, count }) => `
    <div class="stage-row">
      <span class="stage-name">${LABELS[etapa]}</span>
      <div class="stage-track">
        <div class="stage-fill" style="width:${(count / max * 100).toFixed(1)}%"></div>
      </div>
      <span class="stage-count">${count}</span>
    </div>
  `).join('');
}

async function loadActivity() {
  const { data } = await dashboardService.getActivity();
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
