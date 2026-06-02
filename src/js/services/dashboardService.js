import { supabase } from '../core/supabase.js';

export const dashboardService = {
  async getKPIs() {
    const [menores, familias, activos, cerrados] = await Promise.all([
      supabase.from('menores').select('*',  { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('familias').select('*', { count: 'exact', head: true }).is('deleted_at', null),
      supabase.from('casos').select('*',    { count: 'exact', head: true }).is('deleted_at', null).neq('etapa', 'cierre'),
      supabase.from('casos').select('*',    { count: 'exact', head: true }).is('deleted_at', null).eq('etapa',  'cierre'),
    ]);
    return {
      menores:  menores.count  ?? 0,
      familias: familias.count ?? 0,
      activos:  activos.count  ?? 0,
      cerrados: cerrados.count ?? 0,
    };
  },

  async getEtapas() {
    const stages = ['solicitud', 'evaluacion', 'asignacion', 'seguimiento', 'cierre'];
    const results = await Promise.all(
      stages.map(s => supabase.from('casos').select('*', { count: 'exact', head: true }).is('deleted_at', null).eq('etapa', s))
    );
    return stages.map((etapa, i) => ({ etapa, count: results[i].count ?? 0 }));
  },

  getActivity(limit = 8) {
    return supabase
      .from('bitacora')
      .select('accion, entidad, fecha')
      .order('fecha', { ascending: false })
      .limit(limit);
  },

  // Días promedio entre fecha_inicio y fecha_cierre de los casos cerrados.
  async getTiempoPromedio() {
    const { data, error } = await supabase.from('casos')
      .select('fecha_inicio, fecha_cierre')
      .is('deleted_at', null)
      .not('fecha_cierre', 'is', null);
    if (error || !data?.length) return null;
    const dias = data
      .map(c => (new Date(c.fecha_cierre) - new Date(c.fecha_inicio)) / 86400000)
      .filter(d => d >= 0);
    if (!dias.length) return null;
    return Math.round(dias.reduce((a, b) => a + b, 0) / dias.length);
  },

  async getFamiliasPorEstado() {
    const { data } = await supabase.from('familias').select('estado_eval').is('deleted_at', null);
    const r = { aprobada: 0, pendiente: 0, rechazada: 0 };
    (data ?? []).forEach(f => { if (r[f.estado_eval] != null) r[f.estado_eval]++; });
    return r;
  },

  // Carga de trabajo: casos abiertos (no cerrados) por trabajador asignado.
  // Orden ALFABÉTICO a propósito: es distribución de carga, NO un ranking de desempeño.
  async getCasosPorTrabajador() {
    const { data } = await supabase.from('casos')
      .select('usuario:usuarios(nombre, email)')
      .is('deleted_at', null)
      .neq('etapa', 'cierre');
    const map = new Map();
    (data ?? []).forEach(c => {
      const nombre = c.usuario?.nombre ?? c.usuario?.email ?? 'Sin asignar';
      map.set(nombre, (map.get(nombre) ?? 0) + 1);
    });
    return [...map.entries()]
      .map(([nombre, count]) => ({ nombre, count }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  },

  // Casos cerrados por mes en los últimos N meses (buckets continuos).
  async getCerradosPorMes(meses = 6) {
    const { data } = await supabase.from('casos')
      .select('fecha_cierre')
      .is('deleted_at', null)
      .not('fecha_cierre', 'is', null);
    const buckets = [];
    const now = new Date();
    for (let i = meses - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({
        key:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('es-ES', { month: 'short' }),
        count: 0,
      });
    }
    const idx = Object.fromEntries(buckets.map((b, i) => [b.key, i]));
    (data ?? []).forEach(c => {
      const d = new Date(c.fecha_cierre);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (idx[key] != null) buckets[idx[key]].count++;
    });
    return buckets;
  },

  // Resumen de seguimiento post-adopción: casos en seguimiento + próximas visitas.
  async getSeguimientoResumen() {
    const hoy = new Date().toISOString().slice(0, 10);
    const [enSeg, vis] = await Promise.all([
      supabase.from('casos').select('*', { count: 'exact', head: true })
        .is('deleted_at', null).eq('estado_post', 'en_seguimiento'),
      supabase.from('postadopcion')
        .select('proxima_visita, caso:casos(id, menor:menores(nombre), familia:familias(apellido))')
        .not('proxima_visita', 'is', null)
        .order('proxima_visita', { ascending: true })
        .limit(8),
    ]);
    const visitas = (vis.data ?? []).map(v => ({
      proxima_visita: v.proxima_visita,
      vencida:        v.proxima_visita < hoy,
      casoId:         v.caso?.id ?? '',
      nino:           v.caso?.menor?.nombre ?? '—',
      familia:        v.caso?.familia?.apellido ?? '—',
    }));
    return { enSeguimiento: enSeg.count ?? 0, visitas };
  },

  // Distribución de niños por estado y por género.
  async getMenoresDist() {
    const { data } = await supabase.from('menores').select('estado, genero').is('deleted_at', null);
    const estado = { disponible: 0, en_proceso: 0, adoptado: 0 };
    const genero = { masculino: 0, femenino: 0, otro: 0, sin: 0 };
    (data ?? []).forEach(m => {
      if (estado[m.estado] != null) estado[m.estado]++;
      if (m.genero && genero[m.genero] != null) genero[m.genero]++; else genero.sin++;
    });
    return { estado, genero };
  },
};
