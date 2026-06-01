-- ============================================================
-- PROYECTO OMEGA — FASE B1: registro de accesos (logins exitosos)
-- Ejecutar en: Supabase Dashboard › SQL Editor
-- Idempotente (seguro de re-ejecutar)
--
-- Guarda cada inicio de sesión exitoso (email/password y Google).
-- Los intentos FALLIDOS no se guardan aquí: Supabase Auth ya los
-- registra en sus propios logs (Dashboard › Logs › Auth).
-- ============================================================

create table if not exists public.accesos (
  id          uuid primary key default uuid_generate_v4(),
  usuario_id  uuid references public.usuarios(id) on delete set null,
  email       text,
  fecha       timestamptz not null default now()
);

create index if not exists accesos_fecha_idx on public.accesos (fecha desc);

alter table public.accesos enable row level security;

-- Lectura: solo admin (auditoría de accesos).
drop policy if exists "accesos_select" on public.accesos;
create policy "accesos_select" on public.accesos for select
  using (public.user_role() = 'admin');

-- Inserción: cada usuario solo puede registrar SU propio acceso.
drop policy if exists "accesos_insert" on public.accesos;
create policy "accesos_insert" on public.accesos for insert
  with check (usuario_id = auth.uid());
