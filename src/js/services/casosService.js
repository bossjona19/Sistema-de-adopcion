import { supabase } from '../core/supabase.js';

export const casosService = {
  getAll() {
    return supabase
      .from('casos')
      .select('*, familia:familias(apellido), menor:menores(nombre)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
  },
  // Página server-side con filtro por etapa. Devuelve { data, count, error }.
  getPage({ etapa = '', from = 0, to = 19 } = {}) {
    let q = supabase
      .from('casos')
      .select('*, familia:familias(apellido), menor:menores(nombre)', { count: 'exact' })
      .is('deleted_at', null);
    if (etapa) q = q.eq('etapa', etapa);
    return q.order('created_at', { ascending: false }).range(from, to);
  },
  getMenoresDisponibles(includeId = null) {
    const q = supabase.from('menores').select('id,nombre,estado')
      .is('deleted_at', null)
      .order('nombre');
    return includeId
      ? q.or(`estado.eq.disponible,id.eq.${includeId}`)
      : q.eq('estado', 'disponible');
  },
  getCasosActivos() {
    return supabase.from('casos')
      .select('familia_id')
      .is('deleted_at', null)
      .neq('etapa', 'cierre');
  },
  create(payload) {
    return supabase.from('casos').insert(payload).select('id').single();
  },
  update(id, payload) {
    return supabase.from('casos').update(payload).eq('id', id);
  },
  remove(id) {
    return supabase.from('casos')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
  },
  getDeleted() {
    return supabase
      .from('casos')
      .select('*, familia:familias(apellido), menor:menores(nombre)')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });
  },
  restore(id) {
    return supabase.from('casos')
      .update({ deleted_at: null })
      .eq('id', id);
  },
  getSeguimiento(casoId) {
    return supabase
      .from('seguimiento')
      .select('descripcion, fecha, usuario:usuarios(nombre, email)')
      .eq('caso_id', casoId)
      .order('fecha', { ascending: false });
  },
  addSeguimiento(payload) {
    return supabase.from('seguimiento').insert(payload);
  },
};
