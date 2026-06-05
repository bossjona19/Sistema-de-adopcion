# Proyecto OMEGA — Sistema de Gestión de Adopciones

[![CI](https://github.com/bossjona19/Sistema-de-adopcion/actions/workflows/ci.yml/badge.svg)](https://github.com/bossjona19/Sistema-de-adopcion/actions/workflows/ci.yml)

Sistema institucional para la gestión integral de procesos de adopción de una ONG:
niños, familias solicitantes, expedientes de caso, documentos, seguimiento
post-adopción, auditoría y reportes — con seguridad a nivel de base de datos.

> **Contexto:** UTP FISC · Grupo 1SF141. De un CRUD universitario a un sistema con
> prácticas de software profesional (RBAC + RLS, auditoría, PWA, CI, reportes).

🔗 **Demo:** https://sistema-de-adopcion-ochre.vercel.app

---

## ✨ Características

- **Roles y permisos (RBAC):** `admin` · `coordinador` · `trabajador_social` · `director`,
  con seguridad real en **Row Level Security** (no solo en la UI).
- **Privacidad por asignación:** un trabajador social ve **solo sus casos** (y sus notas/
  documentos), gracias a RLS por propiedad con cascada.
- **Expediente por caso** con pestañas: Información (checklist) · Documentos · Seguimiento ·
  **Post-adopción** · Historial (timeline reconstruible).
- **Documentos** en Storage privado (URLs firmadas), con estados y tipos.
- **Auditoría** completa (bitácora con diff antes→después) + registro de accesos.
- **Dashboard ejecutivo** con KPIs de gestión y gráficas (Chart.js, carga diferida).
- **Reportes PDF institucionales** (niño, familia, expediente consolidado) con cabecera de la ONG.
- **Búsqueda/filtros server-side** + paginación + export CSV/PDF/Excel.
- **White-label:** el nombre y logo de la ONG se aplican en toda la app y los reportes.
- **PWA** con Service Worker (network-first, resiliente).
- **Seguridad:** PKCE, whitelist de acceso, soft delete + papelera, doble confirmación,
  auto-logout por inactividad, recuperación de contraseña y **CSP**.

## 🧱 Stack

HTML · CSS · **JavaScript Vanilla (ES Modules, sin build)** · **Supabase**
(PostgreSQL + Auth + Storage) · **Vercel** · **PWA**.
Librerías ligeras vía CDN con carga diferida: Chart.js, jsPDF + autotable, SheetJS.

## 📁 Estructura

```
/                      index · login · dashboard · solicitud · recuperar · restablecer · 404
sw.js · manifest.json · vercel.json
src/
  css/                 styles · dashboard · auth
  components/          modal · toast · sidebar · combobox
  js/
    core/              supabase · auth · router · ui · session · logger · export · branding
    services/          *Service.js (acceso a datos por dominio)
    features/          casos · familias · menores · usuarios · papelera · bitacora · errores · config · notificaciones
    pages/             dashboard (overview) · solicitud
test/                  ui.test.js (pruebas de lógica pura)
.github/workflows/     ci.yml
docs/                  migraciones SQL + documentación técnica
```

**Regla de dependencia:** `features / pages → services → core/supabase` (una sola dirección).

## 🚀 Puesta en marcha

Requisitos: cuenta de **Supabase** y **Vercel**.

1. **Supabase:** crear proyecto y ejecutar las migraciones de `docs/` en orden
   (ver [`docs/DATABASE.md`](docs/DATABASE.md) §4). La de A4 crea el bucket `documentos`.
2. **Auth:** habilitar Google (opcional) y agregar los *Redirect URLs*
   (`/dashboard.html` y `/restablecer.html`). Detalle en [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).
3. **Claves:** `src/js/core/supabase.js` tiene la URL del proyecto y la *publishable key*
   (públicas por diseño; la seguridad recae en RLS).
4. **Vercel:** importar el repo. Framework **Other**, sin build command. Deploy.
5. Crear el primer admin (`docs/add_admin.sql`) y configurar la ONG en **Configuración**.

## 🧪 Desarrollo y pruebas

Sin dependencias. Requiere Node 18+.

```bash
npm test             # pruebas unitarias (runner nativo de Node)
node --check sw.js   # chequeo de sintaxis de un archivo
```

**CI (GitHub Actions):** en cada push/PR a `main` se valida la sintaxis de todo el JS
y se corren las pruebas (`.github/workflows/ci.yml`).

## 👥 Roles

| Rol | Puede |
|---|---|
| **Administrador** | Todo, incl. usuarios, papelera, bitácora, monitoreo y configuración |
| **Coordinador** | Crear/editar/eliminar, avanzar etapas, asignar responsables, documentos |
| **Trabajador Social** | Crear/editar y documentar **solo sus casos** |
| **Director** | Solo lectura (dashboard, expedientes, reportes) |

## 📚 Documentación

- [`ARCHITECTURE.md`](docs/ARCHITECTURE.md) — capas y decisiones
- [`DATABASE.md`](docs/DATABASE.md) — tablas, RLS, orden de migraciones
- [`SECURITY.md`](docs/SECURITY.md) — RBAC, RLS, datos sensibles
- [`DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Supabase + Vercel + PWA
- [`MONITORING.md`](docs/MONITORING.md) · [`RECOVERY.md`](docs/RECOVERY.md) · [`backup/`](docs/backup/) · [`qa/`](docs/qa/)
- [`USER_MANUAL.md`](docs/USER_MANUAL.md) — guía por rol
- [`ROADMAP.md`](ROADMAP.md) — plan y bitácora de avance

## 🔒 Seguridad

La autorización se impone en la base de datos con **RLS** (por rol y por propiedad),
no en el cliente. La UI solo oculta acciones por conveniencia. Headers de seguridad
(CSP, X-Frame-Options, nosniff) en `vercel.json`. Detalle en [`docs/SECURITY.md`](docs/SECURITY.md).

> Maneja datos sensibles de menores: usar con datos reales solo en entornos controlados
> y conforme a la legislación de protección de datos aplicable.

## 👤 Autor

Jonathan Quintero — UTP FISC, Grupo 1SF141.
