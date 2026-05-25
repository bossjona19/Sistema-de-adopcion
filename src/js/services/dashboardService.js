import { supabase } from '../supabase.js';

export const dashboardService = {
  async getKPIs() {
    const [menores, familias, activos, cerrados] = await Promise.all([
      supabase.from('menores').select('*',  { count: 'exact', head: true }),
      supabase.from('familias').select('*', { count: 'exact', head: true }),
      supabase.from('casos').select('*',    { count: 'exact', head: true }).neq('etapa', 'cierre'),
      supabase.from('casos').select('*',    { count: 'exact', head: true }).eq('etapa',  'cierre'),
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
      stages.map(s => supabase.from('casos').select('*', { count: 'exact', head: true }).eq('etapa', s))
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
};
