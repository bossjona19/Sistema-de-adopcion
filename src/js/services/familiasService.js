import { supabase } from '../core/supabase.js';

export const familiasService = {
  getAll() {
    return supabase.from('familias').select('*')
      .is('deleted_at', null)
      .order('fecha_solicitud', { ascending: false });
  },
  getAprobadas() {
    return supabase.from('familias').select('id,apellido')
      .eq('estado_eval', 'aprobada')
      .is('deleted_at', null)
      .order('apellido');
  },
  create(payload) {
    return supabase.from('familias').insert(payload);
  },
  update(id, payload) {
    return supabase.from('familias').update(payload).eq('id', id);
  },
  remove(id) {
    return supabase.from('familias')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
  },
};
