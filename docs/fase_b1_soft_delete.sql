-- ============================================================
-- PROYECTO OMEGA — FASE B1: soft delete completo
-- Ejecutar en: Supabase Dashboard › SQL Editor
-- Idempotente (seguro de re-ejecutar)
--
-- 'menores' y 'familias' ya tienen 'deleted_at'. Falta 'casos'.
-- (Los documentos llegarán en A4 con su propia columna.)
--
-- No se tocan las políticas RLS: el filtrado de borrados se hace en
-- las consultas (`deleted_at is null`), y la papelera (restaurar) usa
-- la política UPDATE ya existente. La restricción "solo admin" para la
-- papelera se aplica en la UI (nav + gating).
-- ============================================================

alter table public.casos
  add column if not exists deleted_at timestamptz;

-- Índice parcial: acelera el filtro habitual "no borrados".
create index if not exists casos_not_deleted_idx
  on public.casos (created_at desc)
  where deleted_at is null;
