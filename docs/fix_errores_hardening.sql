-- ============================================================
-- PROYECTO OMEGA — HARDENING: tabla public.errores (anti-abuso)
-- Ejecutar en: Supabase Dashboard › SQL Editor
-- Idempotente (seguro de re-ejecutar)
--
-- CONTEXTO: la política "errores_insert" usa `with check (true)` para permitir
-- telemetría anónima en páginas públicas (login, solicitud). Como la clave
-- `anon` es PÚBLICA, cualquiera podría escribir directo a la API e inundar la
-- tabla (spam / consumo de almacenamiento). Mantenemos la telemetría útil, pero
-- acotamos el TAMAÑO de cada fila y la TASA de inserción.
-- ============================================================

-- ─── 1) Límites de tamaño en el SERVIDOR ─────────────────────
-- El cliente ya recorta (errorService.log), pero un atacante que va directo a
-- la API no usa el cliente. La validación de verdad va en la base de datos.
alter table public.errores drop constraint if exists errores_mensaje_len;
alter table public.errores drop constraint if exists errores_stack_len;
alter table public.errores drop constraint if exists errores_origen_len;
alter table public.errores drop constraint if exists errores_url_len;
alter table public.errores drop constraint if exists errores_ua_len;
alter table public.errores
  add constraint errores_mensaje_len check (char_length(mensaje)    <= 500),
  add constraint errores_stack_len   check (stack      is null or char_length(stack)      <= 2000),
  add constraint errores_origen_len  check (origen     is null or char_length(origen)     <= 300),
  add constraint errores_url_len     check (url        is null or char_length(url)        <= 500),
  add constraint errores_ua_len      check (user_agent is null or char_length(user_agent) <= 500);

-- ─── 2) Límite de tasa contra inundaciones ───────────────────
-- Mismo patrón que public.familias_rate_limit. SECURITY DEFINER para que el
-- COUNT no dependa de RLS. Si se supera el tope, se DESCARTA la fila en silencio
-- (return null en BEFORE INSERT) para no romper la app con un error.
create or replace function public.errores_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recientes int;
  limite    constant int := 30;   -- máx. inserciones por minuto en toda la tabla
begin
  select count(*) into recientes
    from public.errores
   where fecha > now() - interval '1 minute';

  if recientes >= limite then
    return null;   -- descarta sin error: la telemetría es best-effort
  end if;

  return new;
end;
$$;

drop trigger if exists trg_errores_rate_limit on public.errores;
create trigger trg_errores_rate_limit
  before insert on public.errores
  for each row execute function public.errores_rate_limit();

-- ─── VERIFICACIÓN ────────────────────────────────────────────
-- (a) Debe existir el trigger de tasa:
select tgname from pg_trigger
 where tgrelid = 'public.errores'::regclass and not tgisinternal;

-- (b) Deben existir las 5 restricciones de longitud:
select conname from pg_constraint
 where conrelid = 'public.errores'::regclass and conname like 'errores_%_len'
 order by conname;
