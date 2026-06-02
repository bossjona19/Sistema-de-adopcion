-- ============================================================
-- PROYECTO OMEGA — FASE B4: índices para paginación y búsqueda
-- Ejecutar en: Supabase Dashboard › SQL Editor
-- Idempotente (seguro de re-ejecutar)
--
-- Soporta: paginación con .range(), filtros por estado/etapa y búsqueda
-- por texto (ilike '%term%') eficiente con índices de trigramas (pg_trgm).
-- ============================================================

-- Búsqueda de texto eficiente para ilike '%...%'
create extension if not exists pg_trgm;

create index if not exists menores_nombre_trgm   on public.menores  using gin (nombre   gin_trgm_ops);
create index if not exists familias_apellido_trgm on public.familias using gin (apellido gin_trgm_ops);
create index if not exists familias_contacto_trgm on public.familias using gin (contacto gin_trgm_ops);

-- Orden + filtro "no borrados" (índices parciales)
create index if not exists menores_order_idx  on public.menores  (created_at desc)      where deleted_at is null;
create index if not exists familias_order_idx on public.familias (fecha_solicitud desc) where deleted_at is null;
-- casos_not_deleted_idx (created_at desc) ya existe desde fase_b1_soft_delete.sql

-- Filtros por estado / etapa (acotan antes de ordenar)
create index if not exists menores_estado_idx  on public.menores  (estado)      where deleted_at is null;
create index if not exists familias_estado_idx on public.familias (estado_eval) where deleted_at is null;
create index if not exists casos_etapa_idx     on public.casos    (etapa)       where deleted_at is null;
