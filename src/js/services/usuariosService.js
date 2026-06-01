import { supabase } from '../core/supabase.js';

export const usuariosService = {
  getAll() {
    return supabase
      .from('usuarios')
      .select('id, nombre, email, rol, created_at')
      .order('created_at', { ascending: true });
  },
  updateRole(id, rol) {
    // .select().maybeSingle() → si RLS filtra la fila, devuelve data=null (0 filas)
    // en vez de un falso éxito silencioso. Así el llamador detecta que no cambió.
    return supabase.from('usuarios').update({ rol }).eq('id', id).select('id, rol').maybeSingle();
  },
};
