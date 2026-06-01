# BACKUP — Proyecto OMEGA

Estrategia de respaldo y restauración de la base de datos (Supabase / PostgreSQL)
y de los archivos de Storage.

---

## 1. Qué hay que respaldar

| Activo | Dónde vive | Cómo se respalda |
|---|---|---|
| **Base de datos** (todas las tablas) | Supabase PostgreSQL | `pg_dump` (este directorio) + backups automáticos del plan |
| **Archivos** (bucket `documentos`) | Supabase Storage | Descarga aparte (Dashboard o API) — **NO** se incluye en `pg_dump` |
| **Esquema / migraciones** | Repositorio Git | `schema.sql` + `fase_*.sql` ya versionados |

> ⚠️ **Importante:** `pg_dump` respalda los datos, **no** los archivos del Storage.
> Los documentos subidos deben respaldarse por separado (ver §5).

## 2. Backups automáticos de Supabase

Supabase realiza backups automáticos gestionados; la **frecuencia y retención dependen
del plan** del proyecto:
- *Free:* backups diarios con retención corta (sin PITR).
- *Pro y superiores:* retención mayor y *Point-in-Time Recovery* (PITR) según el plan.

Verificar en: **Supabase › Project Settings › Database › Backups**.
Esto cubre desastres del lado de Supabase, pero **no sustituye** un export propio y
versionado (control y portabilidad).

## 3. Backup manual con `pg_dump` (recomendado, mensual)

Requiere las *PostgreSQL client tools* (`pg_dump`) instaladas.

1. Obtén la *connection string* en **Supabase › Project Settings › Database ›
   Connection string › URI** (formato
   `postgresql://postgres:[PASSWORD]@db.<ref>.supabase.co:5432/postgres`).
2. Expórtala como variable de entorno y corre el script de tu sistema:

**Windows (PowerShell):**
```powershell
$env:OMEGA_DB_URL = "postgresql://postgres:TU_PASSWORD@db.<ref>.supabase.co:5432/postgres"
.\backup.ps1
```

**Linux/macOS (bash):**
```bash
export OMEGA_DB_URL="postgresql://postgres:TU_PASSWORD@db.<ref>.supabase.co:5432/postgres"
./backup.sh
```

Genera `omega_backup_AAAAMMDD_HHMMSS.dump` (formato *custom*, comprimido).
Guarda ese archivo fuera del repositorio (no subir dumps con datos reales a Git).

## 4. Restauración

En un proyecto Supabase **de prueba** (nunca probar en producción):

```bash
pg_restore --clean --no-owner --no-privileges \
  --dbname "postgresql://postgres:PASSWORD@db.<ref-prueba>.supabase.co:5432/postgres" \
  omega_backup_AAAAMMDD_HHMMSS.dump
```

Luego verifica con `inventory.sql` (SQL Editor) que los conteos por tabla cuadran
con el origen. Ver pasos detallados en `../RECOVERY.md`.

## 5. Backup de archivos (Storage)

El bucket `documentos` es privado. Para respaldarlo:
- **Manual:** Supabase › Storage › `documentos` › descargar archivos.
- **Programático:** listar y descargar vía la API de Storage con la *service_role key*
  (script propio; no incluido aquí por requerir esa clave sensible).

## 6. Rutina mensual sugerida

- [ ] Día 1 de cada mes: ejecutar `backup.ps1`/`backup.sh`.
- [ ] Respaldar también los archivos del bucket `documentos`.
- [ ] Guardar el `.dump` + archivos en almacenamiento seguro (con fecha).
- [ ] Una vez por trimestre: **probar una restauración** en un proyecto de prueba
      y verificar con `inventory.sql`.
