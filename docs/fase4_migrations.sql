-- ============================================================
-- PROYECTO OMEGA — Migración Fase 4
-- Ejecutar en: Supabase Dashboard › SQL Editor
-- Todas las sentencias son idempotentes (safe to re-run)
-- ============================================================

-- ─── 4.1: menores.genero ─────────────────────────────────────
ALTER TABLE public.menores
  ADD COLUMN IF NOT EXISTS genero text
    CHECK (genero IN ('masculino', 'femenino', 'otro'));

-- ─── 4.2: menores.fecha_nacimiento ───────────────────────────
ALTER TABLE public.menores
  ADD COLUMN IF NOT EXISTS fecha_nacimiento date;

-- ─── 4.3: casos.fecha_inicio ─────────────────────────────────
-- DEFAULT now() aplica solo a nuevos casos; los existentes quedan NULL.
-- Para backfill: UPDATE public.casos SET fecha_inicio = created_at WHERE fecha_inicio IS NULL;
ALTER TABLE public.casos
  ADD COLUMN IF NOT EXISTS fecha_inicio timestamptz DEFAULT now();

-- ─── 4.4: casos.fecha_cierre ─────────────────────────────────
ALTER TABLE public.casos
  ADD COLUMN IF NOT EXISTS fecha_cierre timestamptz;

-- Trigger: establece fecha_cierre cuando etapa cambia a 'cierre' por primera vez.
-- No sobreescribe si el caso ya tenía fecha_cierre (reapertura > re-cierre).
CREATE OR REPLACE FUNCTION public.set_caso_fecha_cierre()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.etapa = 'cierre'
     AND (OLD.etapa IS DISTINCT FROM 'cierre')
     AND NEW.fecha_cierre IS NULL
  THEN
    NEW.fecha_cierre = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_casos_fecha_cierre ON public.casos;
CREATE TRIGGER trg_casos_fecha_cierre
  BEFORE UPDATE ON public.casos
  FOR EACH ROW EXECUTE FUNCTION public.set_caso_fecha_cierre();

-- ─── 4.5: Soft delete — menores ──────────────────────────────
ALTER TABLE public.menores
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- ─── 4.6: Soft delete — familias ─────────────────────────────
ALTER TABLE public.familias
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- ─── Índices parciales (performance en queries con soft delete) ──
-- Aceleran los filtros WHERE deleted_at IS NULL en listas de admin.
CREATE INDEX IF NOT EXISTS idx_menores_active
  ON public.menores (created_at DESC) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_familias_active
  ON public.familias (fecha_solicitud DESC) WHERE deleted_at IS NULL;

-- ─── Backfill opcional: fecha_inicio para casos existentes ───
-- Descomentar si se quiere poblar fecha_inicio con created_at:
-- UPDATE public.casos SET fecha_inicio = created_at WHERE fecha_inicio IS NULL;
