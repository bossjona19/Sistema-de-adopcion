import { supabase } from '../core/supabase.js';

export const casosService = {
  getAll() {
    return supabase
      .from('casos')
      .select('*, familia:familias(apellido), menor:menores(nombre)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
  },
  // Página server-side con filtro por etapa y (opcional) responsable. { data, count, error }.
  getPage({ etapa = '', usuarioId = '', from = 0, to = 19 } = {}) {
    let q = supabase
      .from('casos')
      .select('*, familia:familias(apellido), menor:menores(nombre), responsable:usuarios(nombre)', { count: 'exact' })
      .is('deleted_at', null);
    if (etapa)     q = q.eq('etapa', etapa);
    if (usuarioId) q = q.eq('usuario_id', usuarioId);
    return q.order('created_at', { ascending: false }).range(from, to);
  },
  getForExport({ etapa = '', usuarioId = '' } = {}) {
    let q = supabase
      .from('casos')
      .select('id, etapa, fecha_inicio, fecha_cierre, familia:familias(apellido), menor:menores(nombre), responsable:usuarios(nombre)')
      .is('deleted_at', null);
    if (etapa)     q = q.eq('etapa', etapa);
    if (usuarioId) q = q.eq('usuario_id', usuarioId);
    return q.order('created_at', { ascending: false }).range(0, 9999);
  },
  getMenoresDisponibles(includeId = null) {
    const q = supabase.from('menores').select('id,nombre,estado')
      .is('deleted_at', null)
      .order('nombre');
    return includeId
      ? q.or(`estado.eq.disponible,id.eq.${includeId}`)
      : q.eq('estado', 'disponible');
  },
  getByMenor(menorId) {
    return supabase.from('casos')
      .select('id, etapa, fecha_inicio, fecha_cierre, familia:familias(apellido)')
      .is('deleted_at', null).eq('menor_id', menorId)
      .order('created_at', { ascending: false });
  },
  getByFamilia(familiaId) {
    return supabase.from('casos')
      .select('id, etapa, fecha_inicio, fecha_cierre, menor:menores(nombre)')
      .is('deleted_at', null).eq('familia_id', familiaId)
      .order('created_at', { ascending: false });
  },
  getCasosActivos() {
    return supabase.from('casos')
      .select('familia_id')
      .is('deleted_at', null)
      .neq('etapa', 'cierre');
  },
  create(payload) {
    return supabase.from('casos').insert(payload).select('id').single();
  },
  update(id, payload) {
    return supabase.from('casos').update(payload).eq('id', id);
  },
  setEstadoPost(id, estado_post) {
    return supabase.from('casos').update({ estado_post }).eq('id', id);
  },
  remove(id) {
    return supabase.from('casos')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
  },
  getDeleted() {
    return supabase
      .from('casos')
      .select('*, familia:familias(apellido), menor:menores(nombre)')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });
  },
  restore(id) {
    return supabase.from('casos')
      .update({ deleted_at: null })
      .eq('id', id);
  },
  getSeguimiento(casoId) {
    return supabase
      .from('seguimiento')
      .select('descripcion, fecha, usuario:usuarios(nombre, email)')
      .eq('caso_id', casoId)
      .order('fecha', { ascending: false });
  },
  addSeguimiento(payload) {
    return supabase.from('seguimiento').insert(payload);
  },
};
