import { supabase } from '../core/supabase.js';

export const casosService = {
  getAll() {
    return supabase
      .from('casos')
      .select('*, familia:familias(apellido), menor:menores(nombre)')
      .order('created_at', { ascending: false });
  },
  getMenoresDisponibles(includeId = null) {
    const q = supabase.from('menores').select('id,nombre')
      .is('deleted_at', null)
      .order('nombre');
    return includeId
      ? q.or(`estado.eq.disponible,id.eq.${includeId}`)
      : q.eq('estado', 'disponible');
  },
  create(payload) {
    return supabase.from('casos').insert(payload);
  },
  update(id, payload) {
    return supabase.from('casos').update(payload).eq('id', id);
  },
  remove(id) {
    return supabase.from('casos').delete().eq('id', id);
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
