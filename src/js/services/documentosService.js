import { supabase } from '../core/supabase.js';

const BUCKET = 'documentos';

export const documentosService = {
  list(casoId) {
    return supabase.from('documentos')
      .select('*')
      .eq('caso_id', casoId)
      .order('fecha', { ascending: false });
  },

  // Sube el archivo al bucket privado y registra la fila en 'documentos'.
  async upload({ casoId, file, tipo, autorExterno, fechaVencimiento, subidoPor }) {
    const safeName = file.name.replace(/[^\w.\-]+/g, '_');
    const path = `${casoId}/${Date.now()}_${safeName}`;

    const up = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
    if (up.error) return { error: up.error };

    const ins = await supabase.from('documentos').insert({
      caso_id:           casoId,
      tipo,
      nombre:            file.name,
      storage_path:      path,
      autor_externo:     autorExterno  || null,
      fecha_vencimiento: fechaVencimiento || null,
      subido_por:        subidoPor,
    }).select('id').single();

    // Si falla el registro en la tabla, no dejamos el archivo huérfano en Storage.
    if (ins.error) await supabase.storage.from(BUCKET).remove([path]);
    return ins;
  },

  // URL temporal (firmada) para ver/descargar un archivo del bucket privado.
  async signedUrl(path, expiresIn = 60) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
    return { url: data?.signedUrl ?? null, error };
  },

  setEstado(id, estado, revisadoPor) {
    return supabase.from('documentos')
      .update({ estado, revisado_por: revisadoPor, fecha_revision: new Date().toISOString() })
      .eq('id', id);
  },

  async remove(id, path) {
    await supabase.storage.from(BUCKET).remove([path]);
    return supabase.from('documentos').delete().eq('id', id);
  },
};
