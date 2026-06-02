-- ============================================================
-- PROYECTO OMEGA — FASE B5: logger de errores
-- Ejecutar en: Supabase Dashboard › SQL Editor
-- Idempotente (seguro de re-ejecutar)
--
-- Guarda errores de cliente (window.onerror / unhandledrejection) para
-- monitoreo ligero. Lectura solo admin; inserción abierta (telemetría).
-- ============================================================

create table if not exists public.errores (
  id          uuid primary key default uuid_generate_v4(),
  mensaje     text not null,
  stack       text,
  origen      text,
  url         text,
  user_agent  text,
  fecha       timestamptz not null default now()
);

create index if not exists errores_fecha_idx on public.errores (fecha desc);

alter table public.errores enable row level security;

-- Inserción abierta: el logger debe poder registrar SIEMPRE (incluso anónimos en
-- páginas públicas). Es solo telemetría de errores; no expone datos sensibles.
drop policy if exists "errores_insert" on public.errores;
create policy "errores_insert" on public.errores for insert with check (true);

-- Lectura: solo admin.
drop policy if exists "errores_select" on public.errores;
create policy "errores_select" on public.errores for select
  using (public.user_role() = 'admin');
