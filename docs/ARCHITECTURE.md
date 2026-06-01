# ARCHITECTURE — Proyecto OMEGA

Sistema de Gestión de Adopciones · UTP FISC · Grupo 1SF141

---

## 1. Visión general

OMEGA es una **SPA** (single-page app) servida estáticamente, sin backend propio:
**Supabase es el backend** (PostgreSQL + Auth + Storage + API REST autogenerada).

```
Navegador (HTML/CSS/JS ES Modules + PWA)
        │  @supabase/supabase-js (CDN)
        ▼
Supabase  ── PostgreSQL (datos + RLS)
          ── Auth (email/password + Google OAuth PKCE)
          ── Storage (bucket privado "documentos")
```

**Stack:** HTML · CSS · JavaScript Vanilla (ES Modules) · Supabase · Vercel · PWA.
**Restricciones duras:** sin React/Next/TypeScript/Tailwind · sin API/servidor propio ·
librerías ligeras solo vía CDN y con carga diferida (hoy: Chart.js).

## 2. Estructura de carpetas

```
/
├── index.html            Landing pública
├── login.html            Inicio de sesión
├── dashboard.html        Panel admin (SPA por pestañas/hash)
├── solicitud.html        Formulario público de adopción
├── sw.js                 Service Worker (cache PWA)
├── manifest.json         PWA
├── vercel.json           Rewrites + headers de seguridad
└── src/
    ├── css/              styles.css · dashboard.css · auth.css
    ├── components/       modal.js · toast.js · sidebar.js · combobox.js
    └── js/
        ├── core/         supabase.js · auth.js · router.js · ui.js · session.js
        ├── services/     *Service.js (una por dominio) + auditService
        ├── features/     casos · familias · menores · usuarios · papelera · bitacora
        └── pages/        dashboard (overview) · solicitud
```

## 3. Capas y regla de dependencia

```
features / pages  →  services  →  core/supabase
        (UI)         (datos)       (cliente Supabase)
```

**La dependencia fluye en una sola dirección. Nunca al revés.**

| Capa | Responsabilidad | Puede importar de |
|---|---|---|
| `core` | Cliente Supabase, auth, router, helpers UI, sesión | (nada interno, salvo core→core) |
| `services` | Acceso a datos: una función por operación (CRUD, queries) | `core/supabase` |
| `features`/`pages` | Render, eventos, orquestación de la UI | `services`, `core`, `components` |
| `components` | UI reutilizable sin estado de dominio (modal, toast…) | — |

> Nota: `core/auth.js` y `core/session.js` NO importan servicios ni componentes
> (mantienen `core` como capa base). El registro de accesos y el auto-logout se
> cablean desde la capa superior (`main.js`, `login.html`) pasando callbacks.

## 4. Arranque (`main.js`)

1. `handleOAuthCallback()` — canjea el código OAuth (PKCE) una sola vez.
2. `requireAuth()` — verifica sesión **y** que el usuario exista en la tabla `usuarios`
   (whitelist); carga su `rol`.
3. `setAuditUser()` — fija el usuario para la bitácora.
4. Monta shell (sidebar según rol), modales, auto-logout por inactividad.
5. `initRouter()` — enruta por hash; **cada navegación recarga los datos** de la pestaña
   (los listeners se cablean una sola vez con un flag `_wired` por feature).

## 5. Decisiones de diseño clave

- **PKCE + `detectSessionInUrl:false`** → un solo canje determinista del código OAuth
  (evita el loop por doble-canje). Ver `core/supabase.js` y `core/auth.js`.
- **RBAC en dos planos**: la UI oculta acciones con `can(capacidad)`; la seguridad **real**
  la impone RLS en Supabase con la función `user_role()`. Ver `SECURITY.md`.
- **Rol = conjunto de permisos, no cargo.** Por eso `psicologo`/`abogado` no son roles:
  su trabajo se modela como documento tipado (`autor_externo`) + nota de seguimiento.
- **Agregación de métricas del lado cliente** (datasets pequeños). La paginación
  server-side y los índices para escalar son trabajo futuro (ver ROADMAP B4).
- **Soft delete** (`deleted_at`) + papelera en vez de borrado físico para datos sensibles.

## 6. Documentos relacionados

`DATABASE.md` · `SECURITY.md` · `DEPLOYMENT.md` · `USER_MANUAL.md` · `../ROADMAP.md`
