import { supabase } from '../core/supabase.js';

export const errorService = {
  // Guarda un error. Best-effort: nunca lanza (lo llama el logger global).
  async log(info) {
    try {
      await supabase.from('errores').insert({
        mensaje:    (info.mensaje ?? 'Error').slice(0, 500),
        stack:      info.stack ? String(info.stack).slice(0, 2000) : null,
        origen:     info.origen ?? null,
        url:        info.url ?? null,
        user_agent: navigator.userAgent,
      });
    } catch { /* telemetría best-effort */ }
  },

  getRecent(limit = 100) {
    return supabase.from('errores')
      .select('mensaje, origen, url, fecha')
      .order('fecha', { ascending: false })
      .limit(limit);
  },
};
