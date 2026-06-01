import { supabase } from '../core/supabase.js';

export const accesoService = {
  // Registra un login exitoso. Falla en silencio: nunca debe bloquear el acceso.
  async log(usuarioId, email) {
    if (!usuarioId) return;
    try {
      await supabase.from('accesos').insert({ usuario_id: usuarioId, email: email ?? null });
    } catch { /* no-op: el registro de acceso es best-effort */ }
  },
  getRecent(limit = 50) {
    return supabase.from('accesos')
      .select('email, fecha')
      .order('fecha', { ascending: false })
      .limit(limit);
  },
};
