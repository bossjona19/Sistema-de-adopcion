-- ============================================================
-- PROYECTO OMEGA — AUDITORÍA DE SEGURIDAD (solo lectura)
-- Ejecutar en: Supabase Dashboard › SQL Editor
-- No modifica nada. Revisa la salida de cada bloque.
--
-- Objetivo: verificar que las políticas RLS documentadas estén REALMENTE
-- activas en producción (el código del repo no prueba el estado del servidor).
-- ============================================================

-- ─── A) Tablas en 'public' SIN RLS habilitado ────────────────
-- rls_activo = false es RIESGO ALTO: la clave anon (pública) puede leer/escribir
-- esa tabla sin restricción. TODAS deben estar en true.
select relname as tabla, relrowsecurity as rls_activo
  from pg_class
 where relnamespace = 'public'::regnamespace and relkind = 'r'
 order by relrowsecurity asc, relname;

-- ─── B) Tablas con RLS activo pero SIN ninguna política ───────
-- Sin políticas, RLS deniega todo (o algo se quedó a medias). Revisar cada una.
select t.relname as tabla_sin_politicas
  from pg_class t
 where t.relnamespace = 'public'::regnamespace and t.relkind = 'r' and t.relrowsecurity
   and not exists (
     select 1 from pg_policies p
      where p.schemaname = 'public' and p.tablename = t.relname);

-- ─── C) ¿Quedó alguna política 'auth_all' antigua? ───────────
-- Debe devolver 0 filas. Si aparece, una política demasiado permisiva (cualquier
-- autenticado) sigue viva y ANULA las reglas por rol (las políticas se unen con OR).
select schemaname, tablename, policyname, cmd, roles
  from pg_policies
 where schemaname = 'public' and policyname = 'auth_all';

-- ─── D) Inventario completo de políticas por tabla y comando ──
-- Compara contra lo documentado en fase_a1_rbac.sql / fix_*.sql.
select tablename, policyname, cmd, roles, qual as using_expr, with_check
  from pg_policies
 where schemaname = 'public'
 order by tablename, cmd, policyname;

-- ─── E) Almacenamiento: documentos de menores ────────────────
-- Los buckets con documentos NO deben ser públicos (es_publico = false).
select name as bucket, public as es_publico from storage.buckets order by name;

-- Políticas de acceso a los objetos de Storage (deben exigir sesión/rol):
select policyname, cmd, roles
  from pg_policies
 where schemaname = 'storage' and tablename = 'objects'
 order by policyname;

-- ─── F) Funciones SECURITY DEFINER y su search_path ──────────
-- Toda función SECURITY DEFINER debe fijar search_path (evita secuestro por
-- esquemas maliciosos). user_role() y los rate-limit deben aparecer con su set.
select p.proname as funcion, p.prosecdef as security_definer, p.proconfig as settings
  from pg_proc p
 where p.pronamespace = 'public'::regnamespace and p.prosecdef
 order by p.proname;
