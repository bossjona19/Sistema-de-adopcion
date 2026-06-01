import { supabase } from '../core/supabase.js';

export const usuariosService = {
  getAll() {
    return supabase
      .from('usuarios')
      .select('id, nombre, email, rol, created_at')
      .order('created_at', { ascending: true });
  },
  updateRole(id, rol) {
    return supabase.from('usuarios').update({ rol }).eq('id', id);
  },
};
