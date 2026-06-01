import { supabase } from '../core/supabase.js';

let _userId = null;

export function setAuditUser(id) { _userId = id; }
export function getUserId()      { return _userId; }

// Registra una acción en la bitácora.
// opts: { entidadId, antes, despues } — todos opcionales.
// Ya NO falla en silencio: si RLS u otra cosa rechaza el insert, avisa en consola
// y devuelve el error (el llamador puede ignorarlo; la acción principal no se bloquea).
export async function logAudit(accion, entidad, opts = {}) {
  if (!_userId) return null;
  const { entidadId = null, antes = null, despues = null } = opts;
  const { error } = await supabase.from('bitacora').insert({
    usuario_id:    _userId,
    accion,
    entidad,
    entidad_id:    entidadId,
    valor_antes:   antes,
    valor_despues: despues,
    fecha:         new Date().toISOString(),
  });
  if (error) console.warn('[bitacora] no se pudo registrar la acción:', error.message);
  return error ?? null;
}

// Bitácora con filtros opcionales (panel de auditoría).
export function getBitacora({ usuarioId = '', entidad = '', desde = '', hasta = '', limit = 200 } = {}) {
  let q = supabase.from('bitacora')
    .select('accion, entidad, entidad_id, valor_antes, valor_despues, fecha, usuario:usuarios(nombre, email)')
    .order('fecha', { ascending: false })
    .limit(limit);
  if (usuarioId) q = q.eq('usuario_id', usuarioId);
  if (entidad)   q = q.eq('entidad', entidad);
  if (desde)     q = q.gte('fecha', desde);
  if (hasta)     q = q.lte('fecha', `${hasta}T23:59:59`);
  return q;
}

// Todas las acciones registradas para un expediente concreto (para el timeline).
export function getEntidadHistorial(entidad, entidadId) {
  return supabase.from('bitacora')
    .select('accion, valor_antes, valor_despues, fecha, usuario:usuarios(nombre, email)')
    .eq('entidad', entidad)
    .eq('entidad_id', entidadId)
    .order('fecha', { ascending: true });
}
