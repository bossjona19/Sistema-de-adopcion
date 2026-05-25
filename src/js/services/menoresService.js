import { supabase } from '../supabase.js';

export const menoresService = {
  getAll() {
    return supabase.from('menores').select('*').order('created_at', { ascending: false });
  },
  create(payload) {
    return supabase.from('menores').insert(payload);
  },
  update(id, payload) {
    return supabase.from('menores').update(payload).eq('id', id);
  },
  remove(id) {
    return supabase.from('menores').delete().eq('id', id);
  },
  setEstado(id, estado) {
    return supabase.from('menores').update({ estado }).eq('id', id);
  },
};
