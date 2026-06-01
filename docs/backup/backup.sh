#!/usr/bin/env bash
# Backup de la base de datos de OMEGA (Linux / macOS)
# Requiere: pg_dump (PostgreSQL client tools en el PATH)
#
# Uso:
#   export OMEGA_DB_URL="postgresql://postgres:PASSWORD@db.<ref>.supabase.co:5432/postgres"
#   ./backup.sh
#
# Genera omega_backup_AAAAMMDD_HHMMSS.dump (formato custom, comprimido).
# NO subas el .dump al repositorio: contiene datos reales sensibles.

set -euo pipefail

: "${OMEGA_DB_URL:?Define OMEGA_DB_URL con la connection string de Supabase}"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump no está en el PATH. Instala las PostgreSQL client tools." >&2
  exit 1
fi

stamp=$(date +%Y%m%d_%H%M%S)
out="omega_backup_${stamp}.dump"

pg_dump "$OMEGA_DB_URL" --format=custom --no-owner --no-privileges --file "$out"

echo "Backup creado: $out"
echo "Recuerda respaldar también los archivos del bucket 'documentos' (ver README.md)."
