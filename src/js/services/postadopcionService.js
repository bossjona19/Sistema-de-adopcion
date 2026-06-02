import { supabase } from '../core/supabase.js';

export const postadopcionService = {
  list(casoId) {
    return supabase.from('postadopcion')
      .select('id, tipo, fecha, observaciones, proxima_visita, responsable:usuarios(nombre, email)')
      .eq('caso_id', casoId)
      .order('fecha', { ascending: false });
  },
  create(payload) {
    return supabase.from('postadopcion').insert(payload).select('id').single();
  },
  remove(id) {
    return supabase.from('postadopcion').delete().eq('id', id);
  },
};
