import { supabase } from '../core/supabase.js';

export const casosService = {
  getAll() {
    return supabase
      .from('casos')
      .select('*, familia:familias(apellido), menor:menores(nombre)')
      .order('created_at', { ascending: false });
  },
  getMenoresDisponibles() {
    return supabase.from('menores').select('id,nombre')
      .eq('estado', 'disponible')
      .is('deleted_at', null)
      .order('nombre');
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
