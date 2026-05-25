import { supabase } from '../supabase.js';

let _userId = null;

export function setAuditUser(id) { _userId = id; }
export function getUserId()      { return _userId; }

export async function logAudit(accion, entidad) {
  if (!_userId) return;
  await supabase.from('bitacora').insert({
    usuario_id: _userId,
    accion,
    entidad,
    fecha: new Date().toISOString(),
  });
}
