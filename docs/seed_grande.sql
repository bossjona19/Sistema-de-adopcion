-- ============================================================
-- PROYECTO OMEGA — Seed de carga (validar B4: paginación/rendimiento)
-- Ejecutar SOLO en un proyecto Supabase de PRUEBA. NUNCA en producción.
-- Inserta ~5.000 niños, ~2.000 familias y ~1.000 casos.
-- ============================================================

-- 5.000 niños
insert into public.menores (nombre, fecha_nacimiento, genero, estado, descripcion)
select
  'Niño Prueba ' || g,
  (date '2010-01-01' + (random() * 3000)::int),
  (array['masculino','femenino','otro'])[1 + floor(random() * 3)],
  (array['disponible','en_proceso','adoptado'])[1 + floor(random() * 3)],
  'Registro de carga #' || g
from generate_series(1, 5000) g;

-- 2.000 familias
insert into public.familias (apellido, contacto, estado_eval, fecha_solicitud)
select
  'Apellido' || g,
  'contacto' || g || '@ejemplo.com',
  (array['pendiente','aprobada','rechazada'])[1 + floor(random() * 3)],
  (current_date - (random() * 700)::int)
from generate_series(1, 2000) g;

-- 1.000 casos (empareja las primeras 1.000 familias con los primeros 1.000 niños)
insert into public.casos (familia_id, menor_id, etapa)
select f.id, m.id,
       (array['solicitud','evaluacion','asignacion','seguimiento','cierre'])[1 + floor(random() * 5)]
from (select id, row_number() over (order by created_at) rn from public.familias limit 1000) f
join (select id, row_number() over (order by created_at) rn from public.menores  limit 1000) m
  on f.rn = m.rn;

-- Verificar:
-- select 'menores' t, count(*) from public.menores
-- union all select 'familias', count(*) from public.familias
-- union all select 'casos', count(*) from public.casos;
--
-- Para LIMPIAR estos datos de prueba (¡solo en el proyecto de prueba!):
-- delete from public.casos    where etapa is not null; -- o por rango de fechas
-- delete from public.familias where apellido like 'Apellido%';
-- delete from public.menores  where nombre like 'Niño Prueba %';
