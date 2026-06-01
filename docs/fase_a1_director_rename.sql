-- ============================================================
-- PROYECTO OMEGA — A1: renombrar rol 'consultor' → 'director'
-- Ejecutar en: Supabase Dashboard › SQL Editor
-- Idempotente (seguro de re-ejecutar)
--
-- Motivo: 'director' representa una persona real de la organización
-- (supervisa indicadores, solo lectura) en vez de un rol técnico genérico.
-- 'director' conserva exactamente los permisos del antiguo 'consultor':
-- SOLO lectura. Las políticas RLS no cambian (los roles de solo lectura
-- no aparecen en ninguna política de escritura).
-- ============================================================

-- 1) Liberar el CHECK para poder migrar los datos sin chocar con la restricción.
alter table public.usuarios drop constraint if exists usuarios_rol_check;

-- 2) Migrar filas existentes que aún tengan el rol viejo.
update public.usuarios set rol = 'director' where rol = 'consultor';

-- 3) Volver a poner el CHECK con el conjunto de roles definitivo.
alter table public.usuarios
  add constraint usuarios_rol_check
  check (rol in ('admin', 'coordinador', 'trabajador_social', 'director'));
