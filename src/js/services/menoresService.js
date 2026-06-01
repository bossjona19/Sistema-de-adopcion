import { supabase } from '../core/supabase.js';

export const menoresService = {
  getAll() {
    return supabase.from('menores').select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
  },
  create(payload) {
    return supabase.from('menores').insert(payload);
  },
  update(id, payload) {
    return supabase.from('menores').update(payload).eq('id', id);
  },
  remove(id) {
    return supabase.from('menores')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
  },
  getDeleted() {
    return supabase.from('menores').select('id,nombre,deleted_at')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });
  },
  restore(id) {
    return supabase.from('menores').update({ deleted_at: null }).eq('id', id);
  },
  setEstado(id, estado) {
    return supabase.from('menores').update({ estado }).eq('id', id);
  },
};
