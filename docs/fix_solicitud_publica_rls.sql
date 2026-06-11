-- ============================================================
-- PROYECTO OMEGA — FIX + HARDENING: Formulario público de solicitud
-- Ejecutar en: Supabase Dashboard › SQL Editor
-- Idempotente (seguro de re-ejecutar)
-- ============================================================
--
-- CONTEXTO (hallazgo de pentest):
--   El pentest de RLS (test/security/pentest-rls.mjs) detectó que un
--   ciudadano anónimo NO podía enviar una solicitud: el insert en
--   'familias' devolvía 42501 (violación de RLS). Es decir, la política
--   pública documentada en schema.sql NO estaba activa en producción
--   → el formulario público estaba ROTO.
--
-- DECISIÓN: el formulario debe funcionar para el público, PERO con
-- protección en capas (defensa en profundidad):
--
--   CAPA 1 — Política RLS endurecida (este archivo):
--            permite el insert anónimo SOLO si los datos son válidos y
--            el ciudadano no intenta auto-aprobarse. Mueve la validación
--            del cliente (no confiable) al servidor.
--   CAPA 2 — Trigger de límite de tasa (este archivo):
--            frena inundaciones de spam por la API.
--   CAPA 3 — CAPTCHA (trabajo futuro, fuera de este archivo).
-- ============================================================


-- ─── CAPA 1: Política de inserción pública, endurecida ───────
-- Solo aplica al rol anónimo ('anon'). El personal autenticado
-- inserta por la política 'familias_insert' (ver fase_a1_rbac.sql).
-- Las políticas se combinan con OR, así que ambas coexisten.

drop policy if exists "public_insert_familias" on public.familias;

create policy "public_insert_familias" on public.familias
  for insert
  to anon
  with check (
    -- El ciudadano NO puede asignarse un estado: siempre 'pendiente'.
    estado_eval = 'pendiente'
    -- Debe aceptar las tres condiciones (validado en servidor, no solo en el cliente).
    and acepta_terminos    = true
    and acepta_evaluacion  = true
    and acepta_seguimiento = true
    -- Datos mínimos obligatorios y con forma razonable.
    and nombre_completo is not null
    and char_length(nombre_completo) between 3 and 120
    and email is not null
    and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    and cedula   is not null and char_length(cedula)   between 3 and 40
    and telefono is not null and char_length(telefono) between 6 and 30
  );


-- ─── CAPA 2: Límite de tasa contra inundaciones (anti-spam) ──
-- Un atacante que va directo a la API se salta el honeypot del
-- formulario. Este trigger pone un techo: máximo N solicitudes
-- anónimas por minuto en toda la tabla. Frena floods masivos sin
-- afectar el uso normal ni al personal autenticado.

create or replace function public.familias_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recientes int;
  limite    constant int := 10;  -- máx. solicitudes anónimas por minuto
begin
  -- Solo limita al público anónimo; el personal autenticado no se ve afectado.
  if auth.role() = 'anon' then
    select count(*) into recientes
      from public.familias
     where created_at > now() - interval '1 minute';

    if recientes >= limite then
      raise exception 'Demasiadas solicitudes en este momento. Intente nuevamente en unos minutos.'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_familias_rate_limit on public.familias;
create trigger trg_familias_rate_limit
  before insert on public.familias
  for each row
  execute function public.familias_rate_limit();


-- ─── VERIFICACIÓN ────────────────────────────────────────────
-- (a) Debe existir la política pública de insert sobre 'familias':
select policyname, cmd, roles
  from pg_policies
 where schemaname = 'public' and tablename = 'familias'
 order by policyname;

-- (b) Debe existir el trigger de límite de tasa:
select tgname
  from pg_trigger
 where tgrelid = 'public.familias'::regclass
   and not tgisinternal;

-- ─── LIMPIEZA de filas de prueba del pentest (si las hubiera) ─
delete from public.familias where apellido like 'PENTEST_%';
delete from public.menores  where nombre   like 'PENTEST_%';
