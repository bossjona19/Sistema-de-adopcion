-- ============================================================
-- PROYECTO OMEGA — FASE A2: auditoría enriquecida
-- Ejecutar en: Supabase Dashboard › SQL Editor
-- Idempotente (seguro de re-ejecutar)
--
-- Enriquece 'bitacora' para reconstruir el historial de cada expediente:
--   entidad_id     → a qué registro apunta la acción (caso, niño, familia…)
--   valor_antes    → resumen legible del estado anterior (para updates/borrados)
--   valor_despues  → resumen legible del estado nuevo (para updates/creaciones)
--
-- La política RLS de bitácora ya existe (ver fase_a1_rbac.sql):
--   select → cualquier usuario del sistema · insert → admin/coordinador/trabajador_social
-- ============================================================

alter table public.bitacora add column if not exists entidad_id    uuid;
alter table public.bitacora add column if not exists valor_antes   text;
alter table public.bitacora add column if not exists valor_despues text;

-- Acelera el timeline por expediente (todas las acciones de un registro).
create index if not exists bitacora_entidad_idx
  on public.bitacora (entidad, entidad_id, fecha desc);
