# RECOVERY — Proyecto OMEGA

Guía de recuperación ante errores. Empieza siempre por el escenario más leve.
Backups y restauración completa: ver `backup/README.md`.

---

## 1. Borré un registro por error (niño / familia / caso)

No se borra en duro: usa **soft delete**.
1. Inicia sesión como **administrador**.
2. Ve a **Papelera** (menú Administración).
3. Pulsa **Restaurar** en el registro.

> Las **notas** y **documentos** de un caso restaurado siguen ligados a él.

## 2. Cambié un rol y "no se guarda"

Un `UPDATE` bloqueado por RLS no da error pero afecta 0 filas. Si al cambiar un rol
el cambio no persiste:
1. Ejecuta **`fix_usuarios_rls.sql`** en el SQL Editor (recrea las políticas de `usuarios`).
2. Revisa su salida: deben existir 4 políticas y tu usuario debe tener `rol = 'admin'`.
3. Reintenta. La UI ahora avisa si el cambio no se aplicó (ya no da falso éxito).

## 3. Me quedé sin acceso de administrador (lockout)

No puedes cambiar tu propio rol desde la UI (anti-lockout). Si nadie tiene `admin`:
1. Supabase › SQL Editor:
   ```sql
   update public.usuarios set rol = 'admin' where email = 'tu-correo@ejemplo.com';
   ```
2. Vuelve a iniciar sesión.

## 4. Una migración SQL salió mal

1. Las migraciones son **idempotentes**: re-ejecutar suele ser seguro.
2. Si dejó datos inconsistentes, restaura desde el último backup en un proyecto de prueba,
   valida, y reaplica en producción (ver `backup/README.md §4`).
3. Verifica con `backup/inventory.sql`.

## 5. Pérdida de datos / corrupción → restauración completa

1. **No** escribas más en la base afectada.
2. Restaura el `.dump` más reciente en un proyecto Supabase **de prueba**:
   ```bash
   pg_restore --clean --no-owner --no-privileges \
     --dbname "postgresql://postgres:PASSWORD@db.<ref-prueba>.supabase.co:5432/postgres" \
     omega_backup_AAAAMMDD_HHMMSS.dump
   ```
3. Verifica con `backup/inventory.sql` que los conteos cuadran.
4. Restaura los **archivos del bucket** `documentos` por separado.
5. Si todo cuadra, repite el procedimiento sobre el proyecto real (o promueve el de prueba).

## 6. Un documento no abre / "No se pudo abrir"

- Las URLs son **firmadas y temporales** (caducan en ~1–2 min): vuelve a pulsar **Ver**.
- Si persiste, confirma en Supabase › Storage que el archivo existe en `documentos/`
  y que las políticas del bucket están aplicadas (`fase_a4_documentos.sql`).

## 7. Login de Google falla / hace loop

- Causa típica: credenciales Google desincronizadas en Supabase.
- Revisa **Auth › Providers › Google** (Client ID/Secret) y **Auth › URL Configuration**
  (Site URL + Redirect URLs con `/**`). Ver `DEPLOYMENT.md §2`.

## 8. El sitio sirve una versión vieja (PWA)

- El Service Worker cachea por versión `omega-vN`. Tras un deploy, si no ves los cambios:
  sube la versión del cache en `sw.js` (debe hacerse en cada cambio de archivos cacheados),
  o en el navegador: DevTools › Application › Service Workers › *Unregister* + recargar.

## 9. Revertir un despliegue

Vercel › Deployments › elige un deploy anterior estable › **Promote/Redeploy**.

---

### Contactos / referencias
`backup/README.md` (respaldos) · `SECURITY.md` (RLS/roles) · `DEPLOYMENT.md` (deploy) ·
`DATABASE.md` (esquema/migraciones).
