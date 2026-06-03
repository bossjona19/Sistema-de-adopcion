-- ============================================================
-- PROYECTO OMEGA — FASE A6: notificaciones in-app
-- Ejecutar en: Supabase Dashboard › SQL Editor
-- Idempotente (seguro de re-ejecutar)
--
-- Cada usuario ve SOLO sus notificaciones. Se generan en eventos del flujo
-- (p.ej. al asignarse un caso a un trabajador social).
-- ============================================================

create table if not exists public.notificaciones (
  id          uuid primary key default uuid_generate_v4(),
  usuario_id  uuid not null references public.usuarios(id) on delete cascade,
  tipo        text not null default 'info',
  mensaje     text not null,
  leida       boolean not null default false,
  fecha       timestamptz not null default now()
);

create index if not exists notificaciones_user_idx on public.notificaciones (usuario_id, leida, fecha desc);

alter table public.notificaciones enable row level security;

-- Lectura / actualización / borrado: SOLO las propias.
drop policy if exists "notif_select" on public.notificaciones;
create policy "notif_select" on public.notificaciones for select using (usuario_id = auth.uid());
drop policy if exists "notif_update" on public.notificaciones;
create policy "notif_update" on public.notificaciones for update using (usuario_id = auth.uid());
drop policy if exists "notif_delete" on public.notificaciones;
create policy "notif_delete" on public.notificaciones for delete using (usuario_id = auth.uid());

-- Inserción: cualquier usuario del sistema puede crear una notificación
-- (ej. un coordinador asigna un caso y notifica al trabajador responsable).
drop policy if exists "notif_insert" on public.notificaciones;
create policy "notif_insert" on public.notificaciones for insert
  with check (public.user_role() is not null);
