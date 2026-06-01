-- ============================================================
-- PROYECTO OMEGA — FASE A4: sistema documental (tabla + Storage)
-- Ejecutar en: Supabase Dashboard › SQL Editor
-- Idempotente (seguro de re-ejecutar)
--
-- Crea la tabla 'documentos', su RLS por rol, un bucket PRIVADO de Storage
-- y las políticas de acceso a los archivos (también por rol).
-- ============================================================

-- ─── 1. Tabla documentos ─────────────────────────────────────
create table if not exists public.documentos (
  id                uuid primary key default uuid_generate_v4(),
  caso_id           uuid not null references public.casos(id) on delete cascade,
  tipo              text not null default 'otro'
                      check (tipo in ('evaluacion_psicologica','certificado_medico',
                                      'informe_social','documento_legal','acta_nacimiento','otro')),
  nombre            text not null,
  storage_path      text not null,
  estado            text not null default 'recibido'
                      check (estado in ('recibido','en_revision','aprobado','rechazado')),
  autor_externo     text,                 -- p.ej. "Lic. María, psicóloga" (no tiene cuenta)
  fecha_vencimiento date,                 -- 'vencido' se calcula en la UI a partir de esta fecha
  revisado_por      uuid references public.usuarios(id) on delete set null,
  fecha_revision    timestamptz,
  subido_por        uuid references public.usuarios(id) on delete set null,
  fecha             timestamptz not null default now()
);

create index if not exists documentos_caso_idx on public.documentos (caso_id, fecha desc);

alter table public.documentos enable row level security;

drop policy if exists "documentos_select" on public.documentos;
drop policy if exists "documentos_insert" on public.documentos;
drop policy if exists "documentos_update" on public.documentos;
drop policy if exists "documentos_delete" on public.documentos;
create policy "documentos_select" on public.documentos for select
  using (public.user_role() is not null);
create policy "documentos_insert" on public.documentos for insert
  with check (public.user_role() in ('admin','coordinador','trabajador_social'));
create policy "documentos_update" on public.documentos for update
  using (public.user_role() in ('admin','coordinador','trabajador_social'));
create policy "documentos_delete" on public.documentos for delete
  using (public.user_role() in ('admin','coordinador'));

-- ─── 2. Bucket PRIVADO de Storage ────────────────────────────
insert into storage.buckets (id, name, public)
values ('documentos', 'documentos', false)
on conflict (id) do nothing;

-- ─── 3. Políticas de acceso a los archivos (storage.objects) ──
-- Si el SQL Editor no te deja crear estas políticas (permisos), créalas desde
-- Dashboard › Storage › Policies sobre el bucket 'documentos' con las mismas reglas.
drop policy if exists "docs_obj_select" on storage.objects;
drop policy if exists "docs_obj_insert" on storage.objects;
drop policy if exists "docs_obj_delete" on storage.objects;
create policy "docs_obj_select" on storage.objects for select
  using (bucket_id = 'documentos' and public.user_role() is not null);
create policy "docs_obj_insert" on storage.objects for insert
  with check (bucket_id = 'documentos' and public.user_role() in ('admin','coordinador','trabajador_social'));
create policy "docs_obj_delete" on storage.objects for delete
  using (bucket_id = 'documentos' and public.user_role() in ('admin','coordinador'));
