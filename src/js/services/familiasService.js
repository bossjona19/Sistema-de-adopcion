import { supabase } from '../core/supabase.js';

export const familiasService = {
  getAll() {
    return supabase.from('familias').select('*')
      .is('deleted_at', null)
      .order('fecha_solicitud', { ascending: false });
  },
  getById(id) {
    return supabase.from('familias').select('*').eq('id', id).maybeSingle();
  },
  // Página server-side con búsqueda (apellido/contacto) y filtro. Devuelve { data, count, error }.
  getPage({ search = '', estado = '', from = 0, to = 19 } = {}) {
    let q = supabase.from('familias').select('*', { count: 'exact' }).is('deleted_at', null);
    if (search) q = q.or(`apellido.ilike.%${search}%,contacto.ilike.%${search}%`);
    if (estado) q = q.eq('estado_eval', estado);
    return q.order('fecha_solicitud', { ascending: false }).range(from, to);
  },
  getForExport({ search = '', estado = '' } = {}) {
    let q = supabase.from('familias').select('*').is('deleted_at', null);
    if (search) q = q.or(`apellido.ilike.%${search}%,contacto.ilike.%${search}%`);
    if (estado) q = q.eq('estado_eval', estado);
    return q.order('fecha_solicitud', { ascending: false }).range(0, 9999);
  },
  getAprobadas() {
    return supabase.from('familias').select('id,apellido')
      .eq('estado_eval', 'aprobada')
      .is('deleted_at', null)
      .order('apellido');
  },
  create(payload) {
    return supabase.from('familias').insert(payload).select('id').single();
  },
  update(id, payload) {
    return supabase.from('familias').update(payload).eq('id', id);
  },
  remove(id) {
    return supabase.from('familias')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
  },
  getDeleted() {
    return supabase.from('familias').select('id,apellido,deleted_at')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });
  },
  restore(id) {
    return supabase.from('familias').update({ deleted_at: null }).eq('id', id);
  },
};
