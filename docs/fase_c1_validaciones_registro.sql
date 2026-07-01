-- ============================================================
-- PROYECTO OMEGA — FASE C1: Validaciones del formulario de registro
-- Ejecutar en: Supabase Dashboard › SQL Editor
-- Idempotente (seguro de re-ejecutar)
-- ============================================================
--
-- CONTEXTO: la profesora pide que el formulario público valide:
--   (1) edad mínima legal del solicitante (Ley 46 de 2013 → 25 años),
--   (2) correos duplicados (antes NO había restricción → se permitían),
--   (3) cédulas duplicadas (ya existía uq_familias_cedula, se conserva),
--   (4) formato correcto de los campos.
--
-- Estrategia (Opción A): la validación de forma y la de duplicados vive
-- en el SERVIDOR (constraints + RLS), y el cliente traduce los errores
-- a mensajes claros. El cliente NO puede consultar duplicados porque el
-- rol 'anon' solo tiene permiso de INSERT sobre 'familias' (no SELECT).
-- ============================================================


-- ─── C1.1: Correos duplicados — índice único (case-insensitive) ──
-- Se normaliza a minúsculas para que "Juan@x.com" y "juan@x.com" cuenten
-- como el mismo correo. El índice parcial ignora filas sin email (NULL),
-- igual que el UNIQUE de cédula.
--
-- IMPORTANTE: si ya existen correos duplicados en la tabla, la creación
-- del índice FALLARÁ. Para encontrarlos primero:
--   select lower(email), count(*) from public.familias
--   where email is not null group by lower(email) having count(*) > 1;
-- Depura los duplicados desde el dashboard admin y vuelve a ejecutar.

CREATE UNIQUE INDEX IF NOT EXISTS uq_familias_email_lower
  ON public.familias (lower(email))
  WHERE email IS NOT NULL;


-- ─── C1.2: Edad mínima legal — reforzar la política RLS pública ──
-- Se recrea 'public_insert_familias' añadiendo la exigencia de edad:
-- el solicitante debe haber nacido hace 25 años o más. Esto blinda el
-- servidor aunque alguien salte el formulario y golpee la API directo.

DROP POLICY IF EXISTS "public_insert_familias" ON public.familias;

CREATE POLICY "public_insert_familias" ON public.familias
  FOR INSERT
  TO anon
  WITH CHECK (
    -- El ciudadano NO puede asignarse un estado: siempre 'pendiente'.
    estado_eval = 'pendiente'
    -- Debe aceptar las tres condiciones.
    AND acepta_terminos    = true
    AND acepta_evaluacion  = true
    AND acepta_seguimiento = true
    -- Datos mínimos obligatorios y con forma razonable.
    AND nombre_completo IS NOT NULL
    AND char_length(nombre_completo) BETWEEN 3 AND 120
    AND email IS NOT NULL
    AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    AND cedula   IS NOT NULL AND char_length(cedula)   BETWEEN 3 AND 40
    AND telefono IS NOT NULL AND char_length(telefono) BETWEEN 6 AND 30
    -- NUEVO (C1): edad mínima legal del solicitante — Ley 46 de 2013.
    AND fecha_nacimiento IS NOT NULL
    AND fecha_nacimiento <= (current_date - interval '25 years')::date
    -- La fecha de nacimiento no puede estar en el futuro.
    AND fecha_nacimiento <= current_date
  );


-- ─── VERIFICACIÓN ────────────────────────────────────────────
-- (a) El índice único de email debe existir:
select indexname from pg_indexes
 where schemaname = 'public' and tablename = 'familias'
   and indexname = 'uq_familias_email_lower';

-- (b) La política pública de insert debe seguir presente:
select policyname, cmd, roles
  from pg_policies
 where schemaname = 'public' and tablename = 'familias'
   and policyname = 'public_insert_familias';
