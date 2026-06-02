-- ============================================================
-- PROYECTO OMEGA — FASE B8: privacidad por asignación de casos
-- Ejecutar en: Supabase Dashboard › SQL Editor
-- Idempotente (seguro de re-ejecutar)
--
-- Regla: un TRABAJADOR SOCIAL ve y opera SOLO los casos asignados a él
-- (casos.usuario_id = su id). admin/coordinador/director ven TODOS.
-- El aislamiento CASCADA a notas (seguimiento) y documentos vía subconsulta:
-- "caso_id in (select id from casos)" — esa subconsulta ya respeta el RLS de
-- casos, así que solo devuelve los casos visibles para el usuario.
--
-- niños y familias siguen siendo catálogo COMPARTIDO (no se aíslan).
-- ============================================================

-- Índice para el filtro por responsable
create index if not exists casos_usuario_idx on public.casos (usuario_id) where deleted_at is null;

-- ¿El usuario actual ve todos los casos? (roles de supervisión)
create or replace function public.ve_todos_casos()
returns boolean
language sql security definer stable
set search_path = public
as $$ select public.user_role() in ('admin', 'coordinador', 'director') $$;

-- ── casos ────────────────────────────────────────────────────
drop policy if exists "casos_select" on public.casos;
drop policy if exists "casos_insert" on public.casos;
drop policy if exists "casos_update" on public.casos;
drop policy if exists "casos_delete" on public.casos;

create policy "casos_select" on public.casos for select
  using (public.ve_todos_casos() or usuario_id = auth.uid());

create policy "casos_insert" on public.casos for insert
  with check (
    public.user_role() in ('admin', 'coordinador')
    or (public.user_role() = 'trabajador_social' and usuario_id = auth.uid())
  );

create policy "casos_update" on public.casos for update
  using (
    public.user_role() in ('admin', 'coordinador')
    or (public.user_role() = 'trabajador_social' and usuario_id = auth.uid())
  );

create policy "casos_delete" on public.casos for delete
  using (public.user_role() in ('admin', 'coordinador'));

-- ── seguimiento (notas) — hereda la visibilidad del caso ─────
drop policy if exists "seguimiento_select" on public.seguimiento;
drop policy if exists "seguimiento_insert" on public.seguimiento;
drop policy if exists "seguimiento_update" on public.seguimiento;
drop policy if exists "seguimiento_delete" on public.seguimiento;

create policy "seguimiento_select" on public.seguimiento for select
  using (caso_id in (select id from public.casos));
create policy "seguimiento_insert" on public.seguimiento for insert
  with check (public.user_role() in ('admin','coordinador','trabajador_social')
              and caso_id in (select id from public.casos));
create policy "seguimiento_update" on public.seguimiento for update
  using (public.user_role() in ('admin','coordinador','trabajador_social')
         and caso_id in (select id from public.casos));
create policy "seguimiento_delete" on public.seguimiento for delete
  using (public.user_role() in ('admin','coordinador')
         and caso_id in (select id from public.casos));

-- ── documentos — hereda la visibilidad del caso ─────────────
drop policy if exists "documentos_select" on public.documentos;
drop policy if exists "documentos_insert" on public.documentos;
drop policy if exists "documentos_update" on public.documentos;
drop policy if exists "documentos_delete" on public.documentos;

create policy "documentos_select" on public.documentos for select
  using (caso_id in (select id from public.casos));
create policy "documentos_insert" on public.documentos for insert
  with check (public.user_role() in ('admin','coordinador','trabajador_social')
              and caso_id in (select id from public.casos));
create policy "documentos_update" on public.documentos for update
  using (public.user_role() in ('admin','coordinador','trabajador_social')
         and caso_id in (select id from public.casos));
create policy "documentos_delete" on public.documentos for delete
  using (public.user_role() in ('admin','coordinador')
         and caso_id in (select id from public.casos));
