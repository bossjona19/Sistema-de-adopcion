import { supabase } from '../core/supabase.js';

export const notificacionesService = {
  // Propias (RLS filtra por auth.uid()), más recientes primero.
  getRecent(limit = 15) {
    return supabase.from('notificaciones')
      .select('id, tipo, mensaje, leida, fecha')
      .order('fecha', { ascending: false })
      .limit(limit);
  },

  async countUnread() {
    const { count } = await supabase.from('notificaciones')
      .select('*', { count: 'exact', head: true })
      .eq('leida', false);
    return count ?? 0;
  },

  markAllRead() {
    return supabase.from('notificaciones').update({ leida: true }).eq('leida', false);
  },

  // Crea una notificación para un usuario (best-effort, no debe romper el flujo).
  async create(usuarioId, mensaje, tipo = 'info') {
    if (!usuarioId) return;
    try {
      await supabase.from('notificaciones').insert({ usuario_id: usuarioId, mensaje, tipo });
    } catch { /* no-op */ }
  },
};
