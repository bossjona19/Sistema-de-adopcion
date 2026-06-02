-- ============================================================
-- PROYECTO OMEGA — FASE B7: configuración institucional
-- Ejecutar en: Supabase Dashboard › SQL Editor
-- Idempotente (seguro de re-ejecutar)
--
-- Datos de la organización (una sola fila): nombre, contacto, dirección, logo.
-- Se usan en la cabecera de los reportes PDF (A8) y en el panel.
-- ============================================================

create table if not exists public.organizacion (
  id         uuid primary key default uuid_generate_v4(),
  nombre     text not null default 'Proyecto OMEGA',
  contacto   text,
  direccion  text,
  logo_url   text,
  updated_at timestamptz not null default now()
);

-- Fila única por defecto (si aún no existe).
insert into public.organizacion (nombre)
select 'Proyecto OMEGA'
where not exists (select 1 from public.organizacion);

alter table public.organizacion enable row level security;

-- Lectura: abierta (es branding; la usa todo el que arma un reporte).
drop policy if exists "organizacion_select" on public.organizacion;
create policy "organizacion_select" on public.organizacion for select using (true);

-- Escritura: solo admin.
drop policy if exists "organizacion_update" on public.organizacion;
create policy "organizacion_update" on public.organizacion for update
  using (public.user_role() = 'admin') with check (public.user_role() = 'admin');
drop policy if exists "organizacion_insert" on public.organizacion;
create policy "organizacion_insert" on public.organizacion for insert
  with check (public.user_role() = 'admin');
