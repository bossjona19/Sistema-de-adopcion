-- ============================================================
-- PROYECTO OMEGA — FASE A1: Roles reales (RBAC) + RLS por rol
-- Ejecutar en: Supabase Dashboard › SQL Editor
-- Idempotente (seguro de re-ejecutar)
-- ============================================================
--
-- Roles:
--   admin             → todo, incluida gestión de usuarios
--   coordinador       → crear, editar, eliminar
--   trabajador_social → crear, editar (NO eliminar)
--   director          → SOLO lectura (dashboard y reportes)
-- ============================================================

-- ─── 1. Restringir los valores válidos de rol ────────────────
alter table public.usuarios drop constraint if exists usuarios_rol_check;
alter table public.usuarios
  add constraint usuarios_rol_check
  check (rol in ('admin', 'coordinador', 'trabajador_social', 'director'));

-- ─── 2. Helper: rol del usuario autenticado ──────────────────
-- SECURITY DEFINER lee public.usuarios saltándose RLS → evita recursión
-- cuando las políticas de la propia tabla usuarios llaman a esta función.
create or replace function public.user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select rol from public.usuarios where id = auth.uid()
$$;

-- ─── 3. Políticas RLS por tabla y por comando ────────────────
-- Reemplazamos la política genérica "auth_all" por reglas granulares.
-- (Varias políticas permisivas se combinan con OR.)

-- ── menores ──────────────────────────────────────────────────
drop policy if exists "auth_all"        on public.menores;
drop policy if exists "menores_select"  on public.menores;
drop policy if exists "menores_insert"  on public.menores;
drop policy if exists "menores_update"  on public.menores;
drop policy if exists "menores_delete"  on public.menores;
create policy "menores_select" on public.menores for select
  using (public.user_role() is not null);
create policy "menores_insert" on public.menores for insert
  with check (public.user_role() in ('admin','coordinador','trabajador_social'));
create policy "menores_update" on public.menores for update
  using (public.user_role() in ('admin','coordinador','trabajador_social'));
create policy "menores_delete" on public.menores for delete
  using (public.user_role() in ('admin','coordinador'));

-- ── familias ─────────────────────────────────────────────────
-- OJO: NO tocamos "public_insert_familias" (el formulario público anónimo).
drop policy if exists "auth_all"         on public.familias;
drop policy if exists "familias_select"  on public.familias;
drop policy if exists "familias_insert"  on public.familias;
drop policy if exists "familias_update"  on public.familias;
drop policy if exists "familias_delete"  on public.familias;
create policy "familias_select" on public.familias for select
  using (public.user_role() is not null);
create policy "familias_insert" on public.familias for insert
  with check (public.user_role() in ('admin','coordinador','trabajador_social'));
create policy "familias_update" on public.familias for update
  using (public.user_role() in ('admin','coordinador','trabajador_social'));
create policy "familias_delete" on public.familias for delete
  using (public.user_role() in ('admin','coordinador'));

-- ── casos ────────────────────────────────────────────────────
drop policy if exists "auth_all"      on public.casos;
drop policy if exists "casos_select"  on public.casos;
drop policy if exists "casos_insert"  on public.casos;
drop policy if exists "casos_update"  on public.casos;
drop policy if exists "casos_delete"  on public.casos;
create policy "casos_select" on public.casos for select
  using (public.user_role() is not null);
create policy "casos_insert" on public.casos for insert
  with check (public.user_role() in ('admin','coordinador','trabajador_social'));
create policy "casos_update" on public.casos for update
  using (public.user_role() in ('admin','coordinador','trabajador_social'));
create policy "casos_delete" on public.casos for delete
  using (public.user_role() in ('admin','coordinador'));

-- ── seguimiento (notas) ──────────────────────────────────────
drop policy if exists "auth_all"            on public.seguimiento;
drop policy if exists "seguimiento_select"  on public.seguimiento;
drop policy if exists "seguimiento_insert"  on public.seguimiento;
drop policy if exists "seguimiento_update"  on public.seguimiento;
drop policy if exists "seguimiento_delete"  on public.seguimiento;
create policy "seguimiento_select" on public.seguimiento for select
  using (public.user_role() is not null);
create policy "seguimiento_insert" on public.seguimiento for insert
  with check (public.user_role() in ('admin','coordinador','trabajador_social'));
create policy "seguimiento_update" on public.seguimiento for update
  using (public.user_role() in ('admin','coordinador','trabajador_social'));
create policy "seguimiento_delete" on public.seguimiento for delete
  using (public.user_role() in ('admin','coordinador'));

-- ── bitacora (auditoría) ─────────────────────────────────────
-- Lectura para cualquier usuario del sistema; escritura para quien puede actuar.
drop policy if exists "auth_all"          on public.bitacora;
drop policy if exists "bitacora_select"   on public.bitacora;
drop policy if exists "bitacora_insert"   on public.bitacora;
create policy "bitacora_select" on public.bitacora for select
  using (public.user_role() is not null);
create policy "bitacora_insert" on public.bitacora for insert
  with check (public.user_role() in ('admin','coordinador','trabajador_social'));

-- ── usuarios ─────────────────────────────────────────────────
-- Lectura: cualquier usuario whitelisteado (necesario para requireAuth y la UI de admin).
-- Escritura: SOLO admin (gestión de usuarios).
drop policy if exists "auth_all"         on public.usuarios;
drop policy if exists "usuarios_select"  on public.usuarios;
drop policy if exists "usuarios_insert"  on public.usuarios;
drop policy if exists "usuarios_update"  on public.usuarios;
drop policy if exists "usuarios_delete"  on public.usuarios;
create policy "usuarios_select" on public.usuarios for select
  using (public.user_role() is not null);
create policy "usuarios_insert" on public.usuarios for insert
  with check (public.user_role() = 'admin');
create policy "usuarios_update" on public.usuarios for update
  using (public.user_role() = 'admin');
create policy "usuarios_delete" on public.usuarios for delete
  using (public.user_role() = 'admin');

-- ─── 4. Asignar roles (EDITAR según tus usuarios) ────────────
-- El admin actual ya tiene rol='admin' por defecto. Para otros:
--   update public.usuarios set rol = 'coordinador'       where email = 'coord@ejemplo.com';
--   update public.usuarios set rol = 'trabajador_social' where email = 'social@ejemplo.com';
--   update public.usuarios set rol = 'director'          where email = 'director@ejemplo.com';
