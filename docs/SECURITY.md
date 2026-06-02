# SECURITY — Proyecto OMEGA

El sistema maneja **información sensible de niños y familias** (datos personales,
direcciones, informes psicológicos, documentos legales). La seguridad es prioridad.

---

## 1. Modelo de control de acceso (RBAC)

Cuatro roles, cada uno con un **conjunto de permisos** distinto:

| Acción | Admin | Coordinador | Trab. Social | Director |
|---|---|---|---|---|
| Ver expedientes | ✅ | ✅ | ✅ | ✅ |
| Crear / editar | ✅ | ✅ | ✅ | ❌ |
| Eliminar | ✅ | ✅ | ❌ | ❌ |
| Avanzar etapa | ✅ | ✅ | ✅ | ❌ |
| Subir / validar documentos | ✅ | ✅ | ✅ | ❌ |
| Gestionar usuarios / papelera / bitácora | ✅ | ❌ | ❌ | ❌ |

> **Director = solo lectura** (supervisión de indicadores). `psicologo`/`abogado` no son
> roles: su trabajo se registra como documento tipado (`autor_externo`) + nota.

### Doble plano de seguridad
- **UI (conveniencia):** `core/auth.js → can(capacidad)` oculta/deshabilita acciones.
  *Esto NO es seguridad* — se puede saltar desde la consola del navegador.
- **RLS (real):** políticas en Postgres que el cliente no puede eludir. La verdad vive aquí.

## 2. Row Level Security (RLS)

Todas las tablas tienen RLS **habilitada**. La función base:

```sql
create function public.user_role() returns text
  language sql security definer stable set search_path = public
as $$ select rol from public.usuarios where id = auth.uid() $$;
```

`security definer` evita la recursión cuando las políticas de `usuarios` la invocan.

Patrón por tabla (ver `fase_a1_rbac.sql`):
- **select:** `user_role() is not null` (cualquier usuario whitelisteado).
- **insert/update:** `user_role() in ('admin','coordinador','trabajador_social')`.
- **delete:** `user_role() in ('admin','coordinador')`.
- **usuarios** (gestión): escritura solo `admin`.
- **familias** conserva además `public_insert_familias` para el formulario público anónimo.

> Síntoma conocido: un UPDATE que afecta 0 filas por RLS **no devuelve error**. Por eso
> operaciones críticas (cambio de rol) usan `.select().maybeSingle()` para detectarlo.
> Reparación de políticas: `fix_usuarios_rls.sql`.

## 3. Autenticación

- **Email/contraseña** y **Google OAuth** (flujo **PKCE**, `detectSessionInUrl:false`).
- **Whitelist:** `requireAuth()` exige sesión **y** fila en `usuarios`; si no, cierra sesión
  y redirige a login con mensaje. Tener cuenta en Google no basta para entrar.
- **Auto-logout por inactividad:** `core/session.js` cierra sesión a los **15 min** sin
  actividad, con aviso 1 min antes (protege terminales desatendidos).
- **Clave del cliente:** `supabase.js` usa la *publishable key* (pública por diseño);
  la seguridad recae en RLS, no en ocultar la clave.

## 4. Datos sensibles y archivos

- Bucket **`documentos` privado**: nunca se sirve público; solo **URLs firmadas** temporales
  (60–120 s) para ver/descargar.
- **Soft delete** (`deleted_at`) en niños, familias y casos → nada se borra en duro desde
  la UI; se recupera en la **Papelera** (solo admin).
- **Doble confirmación** para acciones destructivas (escribir el nombre/código).

## 5. Auditoría y trazabilidad

- **Bitácora** (`bitacora`): cada acción crítica registra usuario, entidad, `entidad_id` y
  diff (`valor_antes → valor_despues`). `logAudit` ya no falla en silencio (avisa en consola).
- **Timeline por expediente**: reconstruye la historia de cada caso (creación, etapas,
  notas, documentos).
- **Accesos** (`accesos`): se registra cada login exitoso. Los **intentos fallidos** los
  guarda Supabase Auth (Dashboard › Logs › Auth).

## 6. Cabeceras y transporte

- HTTPS gestionado por Vercel.
- `vercel.json`: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`.

## 7. Protección de datos (LOPD / buenas prácticas)

- Minimización: el formulario público pide solo lo necesario.
- Acceso restringido por rol + auditoría completa de quién ve/cambia qué.
- Retención/eliminación: soft delete + papelera (recuperable) antes de purgar.

## 8. Privacidad por asignación de casos (B8) ✅

Un **trabajador social ve y opera SOLO los casos asignados a él** (`casos.usuario_id =
auth.uid()`); **admin, coordinador y director** (roles de supervisión) ven todos
(función `ve_todos_casos()`). El aislamiento **cascada** a las **notas** y **documentos**
de cada caso mediante subconsulta RLS `caso_id in (select id from casos)` — que a su vez
respeta el RLS de casos. Ver `fase_b8_asignacion.sql`.
- UI: solo admin/coordinador asignan el **responsable**; filtro "Solo mis casos".
- Alcance: niños y familias siguen siendo **catálogo compartido** del staff.

## 9. Riesgos conocidos / mejoras futuras

- **Bitácora** la ve todo el staff (no se aísla por caso); contiene metadatos de acciones.
- **Storage:** un usuario con rol podría firmar una URL de un archivo si conociera su ruta
  exacta (las filas de `documentos` sí están aisladas, así que no puede descubrirlas por la app).
- **Expiración de JWT** afinable en Supabase (config), complementaria al auto-logout.
