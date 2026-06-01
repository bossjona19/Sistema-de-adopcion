-- Inventario rápido: conteo de filas por tabla.
-- Úsalo para VERIFICAR una restauración (los conteos deben cuadrar con el origen).
-- Ejecutar en: Supabase › SQL Editor.

select 'usuarios'    as tabla, count(*) as filas from public.usuarios
union all select 'familias',    count(*) from public.familias
union all select 'menores',     count(*) from public.menores
union all select 'casos',       count(*) from public.casos
union all select 'seguimiento', count(*) from public.seguimiento
union all select 'documentos',  count(*) from public.documentos
union all select 'bitacora',    count(*) from public.bitacora
union all select 'accesos',     count(*) from public.accesos
order by tabla;

-- Chequeo extra: documentos cuyo archivo podría faltar en Storage tras una restauración
-- (la fila existe en la tabla pero el objeto debe respaldarse/restaurarse aparte).
-- select id, caso_id, nombre, storage_path from public.documentos order by fecha desc;
