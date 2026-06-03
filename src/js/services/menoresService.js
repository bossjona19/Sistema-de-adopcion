import { supabase } from '../core/supabase.js';

export const menoresService = {
  getAll() {
    return supabase.from('menores').select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
  },
  getById(id) {
    return supabase.from('menores').select('*').eq('id', id).maybeSingle();
  },
  // Página server-side con búsqueda y filtro. Devuelve { data, count, error }.
  getPage({ search = '', estado = '', genero = '', from = 0, to = 19 } = {}) {
    let q = supabase.from('menores').select('*', { count: 'exact' }).is('deleted_at', null);
    if (search) q = q.ilike('nombre', `%${search}%`);
    if (estado) q = q.eq('estado', estado);
    if (genero) q = q.eq('genero', genero);
    return q.order('created_at', { ascending: false }).range(from, to);
  },
  // Todas las filas que cumplen el filtro (para exportar). Acotado por seguridad.
  getForExport({ search = '', estado = '', genero = '' } = {}) {
    let q = supabase.from('menores').select('*').is('deleted_at', null);
    if (search) q = q.ilike('nombre', `%${search}%`);
    if (estado) q = q.eq('estado', estado);
    if (genero) q = q.eq('genero', genero);
    return q.order('created_at', { ascending: false }).range(0, 9999);
  },
  create(payload) {
    return supabase.from('menores').insert(payload).select('id').single();
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
