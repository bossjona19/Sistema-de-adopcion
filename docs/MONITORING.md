# MONITORING — Proyecto OMEGA

Monitoreo **ligero** (sin stack pesado). Tres fuentes: el logger propio, los logs
de Supabase y Vercel.

---

## 1. Logger de errores propio (B5)

- `core/logger.js` (módulo puro) registra `window.error` y `unhandledrejection`.
- `main.js` lo inicializa lo antes posible y delega el guardado a `errorService.log`.
- Se guardan en la tabla **`errores`** (`docs/fase_b5_errores.sql`): mensaje, stack, origen,
  URL, user agent, fecha.
- Protecciones: **tope de 20 por sesión** y **dedupe** (no repite el mismo error) → no inunda
  la tabla ni entra en bucles.
- **Verlo:** panel **Monitoreo** en el dashboard (solo admin) o directo en Supabase.

## 2. Página de error amigable

- `404.html` (Vercel la sirve automáticamente para rutas inexistentes en sitios estáticos).
- "Sin permiso": `requireAuth()` cierra sesión y redirige a login con mensaje.
- Errores de carga de librerías (PDF/Excel) muestran un toast claro al usuario.

## 3. Logs de Supabase

- **Auth:** Dashboard › Logs › Auth → inicios de sesión, **intentos fallidos**, errores OAuth.
- **Postgres/API:** Dashboard › Logs → consultas con error, rechazos de RLS.
- Accesos exitosos propios: tabla `accesos` (B1).

## 4. Vercel

- **Deployments:** estado de cada build/deploy y rollback.
- **Analytics** (opcional): activar Vercel Analytics para tráfico básico.
- **Logs** de funciones/edge (no aplica mucho: el sitio es estático).

## 5. Integridad de datos

Se apoya sobre todo en **constraints de la base** (ya definidos):
- `CHECK` de dominios: `usuarios.rol`, `menores.estado`, `familias.estado_eval`,
  `casos.etapa`, `documentos.tipo/estado`.
- **FKs** entre casos↔familias/menores, seguimiento/documentos↔casos, etc.
- **Soft delete** (`deleted_at`) en vez de borrado físico.

Chequeos periódicos sugeridos (SQL Editor):
```sql
-- Casos cuyo niño o familia fue borrado (huérfanos lógicos)
select c.id from public.casos c
  join public.menores m on m.id = c.menor_id
 where c.deleted_at is null and m.deleted_at is not null;

-- Documentos sin archivo en Storage → revisar manualmente storage_path
select id, caso_id, nombre, storage_path from public.documentos order by fecha desc;
```

## 6. Rutina

- Revisar el panel **Monitoreo** y los logs de Auth tras cada release.
- Si aparece un error recurrente, reproducir con el `origen` (archivo:línea) y corregir.
