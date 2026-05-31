# HANDOFF — Proyecto OMEGA
**Sistema de Gestión de Adopciones · UTP FISC · Grupo 1SF141 · Semestre I 2026**
**Última actualización:** 2026-05-30

---

## Current State

El MVP está completo y funcional. Desplegado en Vercel.

| Módulo | Estado |
|---|---|
| Landing page (`/`) | ✅ Funcional |
| Formulario público de solicitud (`/solicitud.html`) | ✅ Funcional |
| Login email/password | ✅ Funcional |
| Login Google OAuth | ❌ Loop — no entra al dashboard |
| Dashboard / KPIs | ✅ Funcional |
| Módulo Niños | ✅ Funcional |
| Módulo Familias | ✅ Funcional |
| Módulo Casos | ✅ Funcional |
| Notas de seguimiento | ✅ Funcional |
| Bitácora de auditoría | ✅ Funcional |
| PWA / Service Worker | ✅ Funcional (cache omega-v8) |
| Agregar admins manualmente | ✅ Documentado (vía Supabase SQL) |

**Stack:** HTML · CSS · Vanilla JS ES Modules · Supabase (PostgreSQL + Auth) · Vercel · PWA  
**Restricción dura:** Sin React, Next.js, TypeScript, ni Tailwind.

---

## Files In Flight

Archivos con cambios recientes que deben estar desplegados en Vercel para que funcionen:

| Archivo | Cambio | Estado |
|---|---|---|
| `src/js/core/auth.js` | `handleOAuthCallback()` añadido para intercambio PKCE | ⚠️ Pendiente de verificar en prod |
| `src/js/main.js` | Llama `handleOAuthCallback()` antes de `requireAuth()` | ⚠️ Pendiente de verificar en prod |
| `src/components/combobox.js` | Enter no envía form · focus regresa al trigger | ✅ Desplegado |
| `src/js/features/casos.js` | Error handling `setEstado` · debounce btn nuevo caso | ✅ Desplegado |
| `manifest.json` | `start_url` cambiado de `/login.html` a `/` | ✅ Desplegado |
| `sw.js` | `omega-v8` · `skipWaiting` y `clients.claim` al inicio | ✅ Desplegado |

---

## Changes

### Sesión actual — Fixes aplicados

**F-01 · CRÍTICO** `combobox.js`
Enter dentro del input de búsqueda enviaba el formulario padre.
```js
search.addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });
```

**F-02 · CRÍTICO** `casos.js > saveCaso`
`setEstado('en_proceso')` al crear caso no tenía manejo de error.
```js
const { error: estadoErr } = await menoresService.setEstado(menorId, 'en_proceso');
if (estadoErr) toast('Caso creado, pero no se pudo actualizar el estado del niño...', 'warning');
```

**F-03 · Recomendado** `combobox.js`
Foco se perdía al seleccionar item (iba al body).
```js
close(); root.focus();
```

**F-04 · Recomendado** `casos.js > btn-nuevo-caso`
Doble-click abría el modal en estado inconsistente.
```js
btn.disabled = true; await populateSelects(); btn.disabled = false; openModal(...);
```

**F-05 · PWA** `manifest.json`
`start_url` apuntaba a `/login.html` en vez de la landing page.
```json
"start_url": "/"
```

**F-06 · PWA** `sw.js`
`skipWaiting` y `clients.claim` estaban encadenados al final de promesas.
Ahora se llaman al inicio del handler para forzar activación inmediata.

**F-07 · OAuth** `auth.js` + `main.js`
Race condition PKCE: `requireAuth()` corría antes de que el intercambio de código completara.
```js
// auth.js
export async function handleOAuthCallback() {
  const code = new URLSearchParams(window.location.search).get('code');
  if (!code) return;
  await supabase.auth.exchangeCodeForSession(code);
  window.history.replaceState({}, '', window.location.pathname);
}

// main.js — antes de requireAuth()
await handleOAuthCallback();
```

### Sesión anterior — Bugs críticos resueltos

| ID | Descripción |
|---|---|
| BUG-01 | `populateSelects` sin manejo de error → comboboxes vacíos sin feedback |
| BUG-02 | `setEstado` en `removeCaso` fallaba silenciosamente → menor bloqueado en `en_proceso` |
| BUG-03 | Tab fuera del combobox no cerraba el dropdown |
| BUG-04 | Edición de caso rota: menor con `estado='en_proceso'` no aparecía en selector |
| BUG-05 | Familia podía asignarse a dos casos activos simultáneamente |
| BUG-06 | `removeCaso` no restauraba estado del menor a `disponible` |

### Cambios de producto

- Terminología UI: `menores` → `niños` en toda la interfaz visible (backend/DB sigue siendo `menores`)
- Campo `fecha_nacimiento` reemplaza a `edad` como dato persistente; edad se calcula dinámicamente con `calcAge()`
- Campo `genero` añadido al formulario de niños
- Combobox personalizado con búsqueda para selección de familia/niño en casos

---

## Failed Attempts

### Google OAuth — Loop sin entrar al dashboard

**Síntoma:** Google OAuth abre correctamente, el usuario confirma, regresa a la app pero queda en el login en loop.

**Confirmado como descartado:**
- ✅ Site URL en Supabase apunta a Vercel
- ✅ Redirect URLs en Supabase incluye el dominio de Vercel
- ✅ Cuenta Google existe en Supabase Auth (`quinterojonathan108@gmail.com`)
- ✅ UUID de Google está en la tabla `usuarios`
- ✅ Google Cloud Console tiene el callback URL de Supabase configurado

**Intento 1:** Cambiar `start_url` en `manifest.json` → no resolvió el OAuth.

**Intento 2:** Fix PKCE — `handleOAuthCallback()` explícito antes de `requireAuth()` → desplegado pero el usuario reporta que "sale error" sin especificar cuál.

**Bloqueante actual:** El usuario reportó "salee error" pero no se pudo obtener:
- El texto exacto del error
- La URL en la que aparece el error
- Si es error de consola o pantalla

**Diagnóstico pendiente de confirmar:**
- ¿El Redirect URL en Supabase tiene el wildcard `/**`? (ej. `https://app.vercel.app/**`)
- ¿Qué URL aparece brevemente después de confirmar en Google?
- ¿Qué dice la consola del navegador (F12) al momento del error?

---

## Next Steps

### Prioridad 1 — Resolver Google OAuth (bloqueante)

**Paso A — Verificar Redirect URLs en Supabase**
Ir a Supabase → Authentication → URL Configuration → Redirect URLs.
Asegurarse de que exista la entrada con wildcard:
```
https://tu-app.vercel.app/**
```
Sin el `/**`, Supabase no acepta redirecciones a subrutas como `/dashboard.html`.

**Paso B — Obtener el error exacto**
Abrir DevTools (F12) → Console → intentar login con Google → copiar el error rojo.
También anotar la URL exacta en la que aparece el error.

**Paso C — Si el error es de `exchangeCodeForSession`**
El código PKCE puede expirar (~10 min) o el `code_verifier` puede haberse perdido.
Alternativa a evaluar: cambiar a `flowType: 'implicit'` en el cliente Supabase:
```js
// src/js/core/supabase.js
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { flowType: 'implicit' }
});
```
Esto elimina la dependencia del intercambio PKCE async y funciona de forma inmediata.

### Prioridad 2 — Cómo agregar admins

Cada administrador nuevo requiere dos pasos:
1. Crear usuario en Supabase → Authentication → Users → Add user (con "Auto Confirm")
2. Insertar su UUID en la tabla `usuarios`:
```sql
INSERT INTO usuarios (id) VALUES ('uuid-del-usuario');
```

### Prioridad 3 — Riesgos aceptados MVP (no bloquean entrega)

- KPI del dashboard cuenta registros soft-deleted (número puede estar inflado)
- PWA icons solo en SVG (iOS no muestra ícono correcto al instalar)
- Sin paginación en tablas (degradación con >200 registros)
- `logAudit` falla silenciosamente si `bitacora` tiene error de RLS

---

## Arquitectura rápida

```
/
├── index.html              Landing page pública
├── login.html              Login admin
├── dashboard.html          SPA admin (tabs: overview / niños / familias / casos)
├── solicitud.html          Formulario público de adopción
├── sw.js                   Service Worker (cache: omega-v8)
├── manifest.json           PWA manifest (start_url: /)
├── vercel.json             Headers de seguridad + rewrite
└── src/
    ├── css/                styles.css · dashboard.css · auth.css
    ├── components/         modal.js · toast.js · sidebar.js · combobox.js
    └── js/
        ├── core/           supabase.js · auth.js · router.js · ui.js
        ├── services/       casosService · familiasService · menoresService · auditService · dashboardService
        ├── features/       casos.js · familias.js · menores.js
        └── pages/          dashboard.js · solicitud.js
```

**Regla de dependencia (una sola dirección):**
`features` → `services` → `core/supabase` — nunca al revés.

**Tablas Supabase:** `menores` · `familias` · `casos` · `seguimiento` · `bitacora` · `usuarios`

**RLS:** `auth_all` para usuarios autenticados · `public_insert_familias` para el formulario público.
**NO modificar:** RLS, tabla `usuarios`, `auth.js` whitelist, estructura SQL.
