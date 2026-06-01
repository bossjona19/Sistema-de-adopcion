# Backup de la base de datos de OMEGA (Windows / PowerShell)
# Requiere: pg_dump (PostgreSQL client tools en el PATH)
#
# Uso:
#   $env:OMEGA_DB_URL = "postgresql://postgres:PASSWORD@db.<ref>.supabase.co:5432/postgres"
#   .\backup.ps1
#
# Genera un archivo omega_backup_AAAAMMDD_HHMMSS.dump (formato custom, comprimido).
# NO subas el .dump al repositorio: contiene datos reales sensibles.

$ErrorActionPreference = "Stop"

if (-not $env:OMEGA_DB_URL) {
  Write-Error "Define primero la variable: `$env:OMEGA_DB_URL (connection string de Supabase)."
  exit 1
}

if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
  Write-Error "pg_dump no está en el PATH. Instala las PostgreSQL client tools."
  exit 1
}

$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$out   = "omega_backup_$stamp.dump"

pg_dump $env:OMEGA_DB_URL --format=custom --no-owner --no-privileges --file $out

Write-Host "Backup creado: $out"
Write-Host "Recuerda respaldar tambien los archivos del bucket 'documentos' (ver README.md)."
