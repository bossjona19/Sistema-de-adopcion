-- ============================================================
-- PROYECTO OMEGA — FASE A7: seguimiento post-adopción
-- Ejecutar en: Supabase Dashboard › SQL Editor
-- Idempotente (seguro de re-ejecutar)
--
-- Extiende el ciclo de vida DESPUÉS de la adopción (caso en etapa 'cierre'):
-- visitas, informes e incidencias hasta el cierre definitivo del seguimiento.
-- ============================================================

-- ─── 1. Sub-estado de post-adopción en el caso ──────────────
-- Aplica solo una vez que el caso llegó a 'cierre' (niño adoptado).
alter table public.casos
  add column if not exists estado_post text not null default 'no_iniciado'
    check (estado_post in ('no_iniciado', 'en_seguimiento', 'completado', 'cerrado'));

-- ─── 2. Registros de seguimiento post-adopción ──────────────
create table if not exists public.postadopcion (
  id            uuid primary key default uuid_generate_v4(),
  caso_id       uuid not null references public.casos(id) on delete cascade,
  tipo          text not null default 'visita'
                  check (tipo in ('visita', 'informe_psicologico', 'informe_social', 'incidencia')),
  fecha         date not null default current_date,
  responsable   uuid references public.usuarios(id) on delete set null,
  observaciones text,
  proxima_visita date,
  created_at    timestamptz not null default now()
);

create index if not exists postadopcion_caso_idx    on public.postadopcion (caso_id, fecha desc);
create index if not exists postadopcion_proxima_idx on public.postadopcion (proxima_visita) where proxima_visita is not null;

-- ─── 3. RLS: hereda la visibilidad del caso (como en B8) ────
alter table public.postadopcion enable row level security;

drop policy if exists "postadopcion_select" on public.postadopcion;
drop policy if exists "postadopcion_insert" on public.postadopcion;
drop policy if exists "postadopcion_update" on public.postadopcion;
drop policy if exists "postadopcion_delete" on public.postadopcion;

create policy "postadopcion_select" on public.postadopcion for select
  using (caso_id in (select id from public.casos));
create policy "postadopcion_insert" on public.postadopcion for insert
  with check (public.user_role() in ('admin','coordinador','trabajador_social')
              and caso_id in (select id from public.casos));
create policy "postadopcion_update" on public.postadopcion for update
  using (public.user_role() in ('admin','coordinador','trabajador_social')
         and caso_id in (select id from public.casos));
create policy "postadopcion_delete" on public.postadopcion for delete
  using (public.user_role() in ('admin','coordinador')
         and caso_id in (select id from public.casos));

-- ─── 4. Tipo de documento para informes de seguimiento ─────
alter table public.documentos drop constraint if exists documentos_tipo_check;
alter table public.documentos
  add constraint documentos_tipo_check
  check (tipo in ('evaluacion_psicologica','certificado_medico','informe_social',
                  'documento_legal','acta_nacimiento','informe_seguimiento','otro'));
