-- ============================================================
-- PROYECTO OMEGA — Migración Fase 2
-- Ejecutar en: Supabase Dashboard › SQL Editor
-- Seguro de ejecutar múltiples veces (todas las sentencias son idempotentes)
-- ============================================================

-- ─── 2.4: Columnas updated_at + triggers automáticos ─────────

ALTER TABLE public.menores
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.familias
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.casos
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Función reutilizable (CREATE OR REPLACE = idempotente)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers: DROP IF EXISTS + CREATE garantiza idempotencia
DROP TRIGGER IF EXISTS trg_menores_updated_at  ON public.menores;
DROP TRIGGER IF EXISTS trg_familias_updated_at ON public.familias;
DROP TRIGGER IF EXISTS trg_casos_updated_at    ON public.casos;

CREATE TRIGGER trg_menores_updated_at
  BEFORE UPDATE ON public.menores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_familias_updated_at
  BEFORE UPDATE ON public.familias
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_casos_updated_at
  BEFORE UPDATE ON public.casos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── 2.5: UNIQUE constraint en familias.cedula ───────────────
-- Nota: NULL no rompe el UNIQUE (dos NULLs no son iguales en SQL).
-- Registros sin cédula (campo opcional en el formulario) no se afectan.
-- IMPORTANTE: Si hay cédulas duplicadas en la tabla actual, esta sentencia
-- fallará. En ese caso, primero depura los duplicados desde el dashboard admin.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname      = 'uq_familias_cedula'
      AND conrelid     = 'public.familias'::regclass
  ) THEN
    ALTER TABLE public.familias
      ADD CONSTRAINT uq_familias_cedula UNIQUE (cedula);
  END IF;
END;
$$;
