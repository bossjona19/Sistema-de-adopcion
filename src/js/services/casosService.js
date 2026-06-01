import { supabase } from '../core/supabase.js';

export const casosService = {
  getAll() {
    return supabase
      .from('casos')
      .select('*, familia:familias(apellido), menor:menores(nombre)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
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
    return supabase.from('casos').insert(payload);
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
      .select('descripcion,fecha')
      .eq('caso_id', casoId)
      .order('fecha', { ascending: false });
  },
  addSeguimiento(payload) {
    return supabase.from('seguimiento').insert(payload);
  },
};
