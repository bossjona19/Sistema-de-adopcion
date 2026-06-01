import { dashboardService } from '../services/dashboardService.js';
import { formatDate } from '../core/ui.js';

const COLORS = {
  blue: '#378ADD', green: '#16A34A', amber: '#D97706',
  purple: '#7C3AED', red: '#D93025', gray: '#9CA3AF',
};

let _chartPromise = null;
const _charts = {}; // instancias vivas, para destruir antes de re-render

export async function initOverview() {
  await Promise.all([loadKPIs(), loadStages(), loadActivity(), loadGestion()]);
}

// ── Chart.js (carga diferida vía CDN, solo al abrir el dashboard) ──
function loadChartJs() {
  if (window.Chart) return Promise.resolve(window.Chart);
  if (_chartPromise) return _chartPromise;
  _chartPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
    s.onload  = () => resolve(window.Chart);
    s.onerror = () => reject(new Error('No se pudo cargar Chart.js'));
    document.head.appendChild(s);
  });
  return _chartPromise;
}

function paint(id, config) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  _charts[id]?.destroy();           // evita "Canvas is already in use" al re-navegar
  _charts[id] = new window.Chart(canvas, config);
}

// ── KPIs ──────────────────────────────────────────────────────
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

// ── KPIs de gestión + gráficas ────────────────────────────────
async function loadGestion() {
  const dias = await dashboardService.getTiempoPromedio();
  const elTiempo = document.getElementById('kpi-tiempo');
  if (elTiempo) elTiempo.textContent = dias == null ? '—' : dias;

  let Chart;
  try {
    Chart = await loadChartJs();
  } catch {
    return; // sin conexión al CDN: los KPIs ya se mostraron; omitimos gráficas
  }
  if (!Chart) return;

  const [mes, porTrab, dist] = await Promise.all([
    dashboardService.getCerradosPorMes(6),
    dashboardService.getCasosPorTrabajador(),
    dashboardService.getMenoresDist(),
  ]);

  const baseOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };

  // Adopciones cerradas por mes (barras)
  paint('chart-mes', {
    type: 'bar',
    data: {
      labels: mes.map(m => m.label),
      datasets: [{ data: mes.map(m => m.count), backgroundColor: COLORS.green, borderRadius: 4 }],
    },
    options: { ...baseOpts, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } },
  });

  // Casos por trabajador social (barras horizontales)
  paint('chart-trabajador', {
    type: 'bar',
    data: {
      labels: porTrab.map(t => t.nombre),
      datasets: [{ data: porTrab.map(t => t.count), backgroundColor: COLORS.blue, borderRadius: 4 }],
    },
    options: { ...baseOpts, indexAxis: 'y', scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } },
  });

  // Niños por estado (dona)
  paint('chart-estado', {
    type: 'doughnut',
    data: {
      labels: ['Disponible', 'En proceso', 'Adoptado'],
      datasets: [{
        data: [dist.estado.disponible, dist.estado.en_proceso, dist.estado.adoptado],
        backgroundColor: [COLORS.blue, COLORS.amber, COLORS.green],
      }],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
  });

  // Niños por género (dona)
  paint('chart-genero', {
    type: 'doughnut',
    data: {
      labels: ['Masculino', 'Femenino', 'Otro', 'Sin especificar'],
      datasets: [{
        data: [dist.genero.masculino, dist.genero.femenino, dist.genero.otro, dist.genero.sin],
        backgroundColor: [COLORS.blue, COLORS.purple, COLORS.amber, COLORS.gray],
      }],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
  });
}

// ── Embudo por etapa ──────────────────────────────────────────
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

// ── Feed de actividad ─────────────────────────────────────────
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
