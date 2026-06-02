import { supabase } from '../core/supabase.js';

let _cache = null;

export const configService = {
  // Datos de la organización (cacheado; una sola fila).
  async get() {
    if (_cache) return _cache;
    const { data } = await supabase.from('organizacion').select('*').limit(1).maybeSingle();
    _cache = data ?? { nombre: 'Proyecto OMEGA', contacto: null, direccion: null, logo_url: null };
    return _cache;
  },

  async update(payload) {
    const cur = await this.get();
    const res = cur?.id
      ? await supabase.from('organizacion').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', cur.id).select('*').maybeSingle()
      : await supabase.from('organizacion').insert(payload).select('*').maybeSingle();
    _cache = null; // invalidar para releer
    return res;    // { data, error }
  },
};
