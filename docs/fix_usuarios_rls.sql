-- ============================================================
-- PROYECTO OMEGA — FIX: RLS de la tabla usuarios (asignación de roles)
-- Ejecutar en: Supabase Dashboard › SQL Editor
-- Idempotente (seguro de re-ejecutar)
--
-- SÍNTOMA: cambiar el rol de un usuario "parecía" guardarse (toast de éxito,
-- entrada en bitácora) pero el rol no cambiaba.
-- CAUSA: el UPDATE afectaba 0 filas porque la política RLS de UPDATE de
-- 'usuarios' faltaba o no permitía al admin → Postgres no da error, solo
-- actualiza 0 filas. Este script reasegura la función y las políticas.
-- ============================================================

-- 1) Función con el rol del usuario actual (SECURITY DEFINER → evita recursión RLS).
create or replace function public.user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select rol from public.usuarios where id = auth.uid()
$$;

-- 2) Re-crear las políticas de 'usuarios' (lectura para el staff; escritura solo admin).
alter table public.usuarios enable row level security;

drop policy if exists "auth_all"        on public.usuarios;
drop policy if exists "usuarios_select" on public.usuarios;
drop policy if exists "usuarios_insert" on public.usuarios;
drop policy if exists "usuarios_update" on public.usuarios;
drop policy if exists "usuarios_delete" on public.usuarios;

create policy "usuarios_select" on public.usuarios for select
  using (public.user_role() is not null);

create policy "usuarios_insert" on public.usuarios for insert
  with check (public.user_role() = 'admin');

create policy "usuarios_update" on public.usuarios for update
  using      (public.user_role() = 'admin')
  with check (public.user_role() = 'admin');

create policy "usuarios_delete" on public.usuarios for delete
  using (public.user_role() = 'admin');

-- 3) Asegurar que el rol 'director' es válido (por si no se corrió el rename).
alter table public.usuarios drop constraint if exists usuarios_rol_check;
update public.usuarios set rol = 'director' where rol = 'consultor';
alter table public.usuarios
  add constraint usuarios_rol_check
  check (rol in ('admin', 'coordinador', 'trabajador_social', 'director'));

-- 4) VERIFICACIÓN — revisa la salida:
--    (a) deben aparecer 4 políticas (select/insert/update/delete)
--    (b) tu usuario debe tener rol = 'admin'
select policyname, cmd
  from pg_policies
 where schemaname = 'public' and tablename = 'usuarios'
 order by policyname;

select id, email, rol
  from public.usuarios
 order by created_at;
