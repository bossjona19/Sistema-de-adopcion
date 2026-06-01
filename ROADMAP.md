# ROADMAP — Proyecto OMEGA

**De "CRUD universitario" a "software institucional"**
**Sistema de Gestión de Adopciones · UTP FISC · Grupo 1SF141**
**Creado:** 2026-05-30 · **Última actualización:** 2026-05-30

---

## Objetivo

Que una ONG o institución pueda mirar OMEGA y decir *"esto es un sistema serio,
capaz de manejar información sensible de niños y familias de forma segura y mantenible"*.
El salto NO está en añadir más módulos llamativos, sino en **profundizar lo existente**
y en cubrir lo que casi ningún proyecto universitario cubre: **seguridad, backups,
rendimiento, monitoreo, QA y documentación técnica.**

## El plan tiene DOS vías paralelas

- **Vía A · Funcional** — capacidades que ve el usuario (roles, dashboard, documentos…).
- **Vía B · Operación y madurez** — lo que hace que el sistema sea *confiable y mantenible*
  (seguridad, backups, rendimiento, monitoreo, QA, docs). **Es lo que más diferencia
  un software profesional de un CRUD grande.**

## Reglas del proyecto (restricciones)

- ✅ HTML · CSS · Vanilla JS (ES Modules) · Supabase · Vercel · PWA
- ✅ **Librerías ligeras permitidas** vía CDN si aportan valor real
  (gráficas, exportación PDF/Excel, fechas, utilidades UI)
- ❌ Sin React, Next.js, TypeScript, Tailwind · sin reescritura completa
- ❌ Sin API propia / backend custom — **Supabase ES el backend**
- ⚙️ No hay servidor propio: lo que requiera "interceptar peticiones" (intentos de login,
  expiración de sesión) se resuelve con **configuración de Supabase**, no con código backend.

## Regla de dependencia (intacta)

`features → services → core/supabase` — nunca al revés.

---

## Punto de partida (auditoría del código real, 2026-05-30)

| Capacidad | Estado actual | Brecha |
|---|---|---|
| Roles | Columna `usuarios.rol` existe (default `admin`) pero **no se usa** | Falta enforcement (UI + RLS) |
| Auditoría | `bitacora` registra `accion`+`entidad`+`usuario`+`fecha` | Falta detalle antes/después y timeline |
| Flujo de estados | **Ya existe** (`solicitud→…→cierre` + trigger `fecha_cierre`) | Reforzar con reglas de transición |
| Dashboard | KPIs + conteo por etapa + feed | Falta tiempo promedio y gráficas |
| Documentos | **No existe** (fotos = URL de texto) | Activar Storage + módulo + estados |
| Soft delete | **Existe** en `menores` y `familias` (`deleted_at`) | Extender a `casos` + doble confirmación |
| Búsqueda | Básica | Filtros combinados |
| Reportes | No existe | CSV/PDF/Excel |
| Seguridad | RLS `auth_all` genérica | Auditar por tabla y por rol |
| Backups | Automático de Supabase (no documentado) | Procedimiento + script + restauración probada |
| Rendimiento | OK con pocos datos; algunos índices parciales | Paginación server-side, índices, lazy load |
| Monitoreo / errores | Ninguno | Logger de errores + página de error amigable |
| QA | Ninguno formal | Casos de prueba + checklist de regresión |
| Docs técnicas | HANDOFF.md + este ROADMAP.md | ARCHITECTURE/DATABASE/SECURITY/DEPLOYMENT/USER_MANUAL |
| Login Google OAuth | **Roto** (loop) | Bloqueante |

---

## Stack de librerías propuesto (carga diferida vía CDN)

| Necesidad | Librería | Cómo |
|---|---|---|
| Gráficas | Chart.js | CDN, solo al abrir el dashboard |
| Export PDF | jsPDF + jspdf-autotable | CDN, solo al exportar |
| Export Excel | SheetJS (xlsx) | CDN, solo al exportar |
| Export CSV / fechas | *nativo* (Blob / Intl) | 0 KB |

---

# VÍA A — Funcional

### A0 — Estabilizar 🔧 (BLOQUEANTE) — ✅ COMPLETADO (2026-05-31)
Un login roto mata la credibilidad de cualquier demo.
**Causa raíz hallada:** doble canje del código OAuth. El cliente Supabase con
`detectSessionInUrl:true` (default) auto-canjeaba el código a la vez que
`handleOAuthCallback()` lo canjeaba a mano → el código PKCE es de un solo uso →
uno fallaba → sin sesión → loop. (El "Intento 2" del HANDOFF chocaba con el auto-canje.)
- [x] **Decisión:** mantener PKCE (más seguro) + `detectSessionInUrl:false` → un solo canje determinista
- [x] Fix de código: `supabase.js` (opciones auth), `auth.js` (callback robusto que surfacea el error), `main.js` (redirige a login con mensaje), `login.html` (muestra `oauth-failed`)
- [x] Fix bug Service Worker: `sw.js` clonaba la Response después de consumir el body → "Response body is already used" (clonar síncrono)
- [x] **ERROR REAL CAPTURADO en prod** (con DevTools "Preserve log"): `server_error / unexpected_failure / "Unable to exchange external code: 4/0A..."` → el fallo es **servidor Supabase↔Google**, NO el cliente. El loop ya no ocurre; ahora redirige limpio a login con mensaje.
- [x] **CAUSA RAÍZ:** credenciales Google desincronizadas en Supabase. Solución: cliente OAuth nuevo (`...oao25l3...`) con redirect URI `…supabase.co/auth/v1/callback` + Client ID y Secret nuevos pegados en Supabase Auth → Providers → Google
- [x] Verificado en producción: login Google entra al dashboard sin loop ✅

**Archivos:** `core/auth.js`, `main.js`, `core/supabase.js`, `login.html` · **DB:** — · **Esfuerzo:** S

---

### A1 — Roles reales (RBAC) 🥇
**Roles:** `admin` · `coordinador` · `trabajador_social` · `director` (solo lectura)

| Acción | Admin | Coordinador | Trab. Social | Director |
|---|---|---|---|---|
| Ver expedientes | ✅ | ✅ | ✅ | ✅ |
| Crear/editar | ✅ | ✅ | ✅ | ❌ |
| Eliminar | ✅ | ✅ | ❌ | ❌ |
| Avanzar etapa | ✅ | ✅ | ✅ | ❌ |
| Subir/validar documentos | ✅ | ✅ | ✅ | ❌ |
| Gestionar usuarios | ✅ | ❌ | ❌ | ❌ |

> **Director = estrictamente solo lectura** (supervisión de indicadores/reportes).
> No edita, no elimina, no cambia etapas, no sube documentos.
>
> **Decisión de diseño (2026-06-01):** un rol modela un *conjunto de permisos*, no un cargo.
> `psicologo` y `abogado` **no** son roles: en la práctica no entran al sistema. Su trabajo se
> representa como **documento tipado** (A4) + **nota de seguimiento** (A2) con un campo
> `autor_externo` (texto libre, ej. *"Lic. María, psicóloga"*) → conserva la autoría real
> sin crear cuentas ni RLS extra. Si algún día entran al sistema, se reevalúa.

- [x] Migración SQL: `CHECK` en `usuarios.rol` con los 4 valores → `docs/fase_a1_rbac.sql`
- [x] `requireAuth()` devuelve el `rol`; helper `can(accion)` + `roleLabel()` en `core/auth.js`
- [x] Ocultar/deshabilitar acciones según rol en features (menores, familias, casos + notas) y rol real en sidebar
- [x] **RLS por rol en Supabase** → `docs/fase_a1_rbac.sql` (función `user_role()` + políticas granulares por tabla/comando) *(ejecutado por el usuario en Supabase, 2026-06-01)*
- [x] **A1-parte 2:** UI para que admin asigne roles → panel "Usuarios" (solo admin): lista, búsqueda, filtro por rol y modal de cambio de rol. No permite cambiar el rol propio (anti-lockout)
- [x] Renombrar `consultor → director` en código, UI y SQL canónico
- [ ] **Correr `docs/fase_a1_director_rename.sql`** en Supabase (migra el `CHECK` y filas existentes)
- [ ] Verificar en prod: admin = todo · director = solo lectura

**Archivos:** `core/auth.js`, `features/*`, `sidebar.js`, migración SQL · **DB:** `rol` CHECK + RLS · **Esfuerzo:** M · **Depende de:** A0

---

### A2 — Auditoría + Historial de expediente 🥈
Objetivo: timeline completo y reconstruible de cada caso.
```
Caso #125
05/01  Creado por María
10/01  Etapa: Solicitud → Evaluación
15/01  Documento agregado: Evaluación Psicológica.pdf
22/01  Etapa: Evaluación → Asignación
```
- [ ] Migración: `bitacora` + `entidad_id`, `campo`, `valor_antes`, `valor_despues`
- [ ] `logAudit()` acepta diff; servicios emiten diff al actualizar
- [ ] **Timeline unificado** por expediente (cambios + etapas + documentos)
- [ ] Filtro de bitácora por usuario / entidad / fecha
- [ ] Arreglar `logAudit` que falla silencioso con error RLS (riesgo heredado)

**Archivos:** `services/auditService.js`, `services/*`, `features/*`, migración SQL · **DB:** columnas en `bitacora` · **Esfuerzo:** M · **Depende de:** A1

---

### A3 — Dashboard ejecutivo 📊
Métricas de **gestión**, no solo conteos.
- [ ] KPI **tiempo promedio de adopción** (usa `fecha_inicio`/`fecha_cierre` existentes)
- [ ] KPI **casos abiertos por trabajador social** (carga de trabajo por usuario)
- [ ] KPI familias evaluadas (aprobadas/pendientes/rechazadas)
- [ ] KPI casos cerrados por mes
- [ ] Gráficas: adopciones/mes · distribución por edad/estado/género · embudo por etapa
- [ ] Corregir KPIs que cuentan soft-deleted (`deleted_at IS NULL`)

**Archivos:** `services/dashboardService.js`, `pages/dashboard.js`, + Chart.js · **DB:** — · **Esfuerzo:** M

---

### A4 — Sistema documental 🥉
Documentos por expediente con validación de estados.
**Estados:** `recibido → en_revision → (rechazado | aprobado)` · `vencido` por fecha.
**Tipos:** `evaluacion_psicologica` · `certificado_medico` · `informe_social` · `documento_legal` · `acta_nacimiento` · `otro`.
> Aquí se modela el trabajo de psicólogo/abogado **sin darles cuenta**: su informe entra como
> documento tipado + nota de seguimiento, con `autor_externo` para conservar la autoría real.
- [ ] Bucket privado en Supabase Storage + políticas por rol
- [ ] Migración: tabla `documentos` (caso_id, tipo, nombre, storage_path, estado, fecha_revision, revisado_por, fecha_vencimiento, subido_por, **autor_externo**, fecha)
- [ ] `documentosService` (subir, listar, signed URL, cambiar estado, borrar)
- [ ] UI de subida (validación tipo/tamaño) + lista con estado y acciones por rol
- [ ] Vista de expediente con pestañas: **Información · Documentos · Seguimiento · Historial**
- [ ] Checklist visual del expediente + feed al timeline (A2)

**Archivos:** nuevos `services/documentosService.js`, `features/documentos.js`, migración SQL · **DB:** tabla `documentos` + bucket · **Esfuerzo:** L · **Depende de:** A1

---

### A5 — Búsqueda avanzada + Reportes 🔎📄
- [ ] Filtros combinados (edad, género, estado, fecha) persistentes en la URL
- [ ] Export CSV (nativo) de cualquier listado filtrado
- [ ] Export PDF (jsPDF) — ej. "Casos activos · últimos 6 meses"
- [ ] Export Excel (SheetJS) — ej. "Adopciones completadas 2026"

**Archivos:** `features/*`, nuevo `services/reportService.js`, + jsPDF/SheetJS · **DB:** — · **Esfuerzo:** M · **Depende de:** A3, A1

---

### A6 — Notificaciones in-app 🔔 (opcional, menor ROI)
- [ ] Migración: tabla `notificaciones` (usuario_id, tipo, mensaje, leida, fecha)
- [ ] Disparar en eventos del flujo · campana con contador · marcar leída

**Archivos:** nuevo `services/notificacionesService.js`, header · **DB:** tabla `notificaciones` · **Esfuerzo:** M · **Depende de:** A2

---

# VÍA B — Operación y madurez institucional

> Lo que casi nadie pone en un proyecto universitario. Aquí está el mayor diferenciador.

### B1 — Seguridad institucional 🔐 (Muy importante)
- [ ] **RLS auditada tabla por tabla** (no solo `auth_all` genérica) y por rol
- [ ] Doble confirmación para acciones destructivas (escribir nombre / modal explícito)
- [ ] **Soft delete COMPLETO** — `deleted_at` en niños, familias, **casos** y **documentos** (ya existe en niños/familias)
- [ ] **Papelera de restauración** — listar y restaurar registros borrados (solo admin)
- [ ] **Expiración de sesión** — configurar JWT/refresh en Supabase + aviso antes de expirar
- [ ] Registro de **accesos al sistema** (login exitoso) en tabla propia
- [ ] Superficiar **intentos fallidos** que Supabase Auth ya registra (logs/admin)
- [ ] Permisos por acción crítica (se apoya en A1)

**Archivos:** migraciones SQL (RLS), `core/auth.js`, `components/modal.js`, services · **DB:** RLS por rol + tabla `accesos` · **Esfuerzo:** M-L · **Depende de:** A1
**Nota stack:** sin servidor propio; expiración e intentos fallidos = configuración + logs de Supabase, no middleware.

---

### B2 — Documentación técnica 📚 (MÁXIMO ROI — casi todo es escritura)
- [ ] `ARCHITECTURE.md` — capas, regla de dependencia, decisiones
- [ ] `DATABASE.md` — tablas, relaciones, RLS, migraciones
- [ ] `SECURITY.md` — modelo de amenazas, RLS, roles, datos sensibles (LOPD)
- [ ] `DEPLOYMENT.md` — Vercel, variables, Supabase, PWA
- [ ] `USER_MANUAL.md` — guía por rol con capturas

**Archivos:** nuevos `.md` en `/docs` · **DB:** — · **Esfuerzo:** S-M · **Depende de:** nada (se puede empezar YA)

---

### B3 — Backups y recuperación 💾 (alta percepción, bajo esfuerzo)
- [ ] Documentar el respaldo automático de Supabase (frecuencia/retención del plan)
- [ ] Script de **export completo** (`pg_dump` / SQL Editor) versionado en `/docs/backup`
- [ ] **Restauración probada** en proyecto Supabase de prueba (y documentada)
- [ ] Rutina de backup mensual documentada
- [ ] `RECOVERY.md` — guía de recuperación ante errores

**Archivos:** `/docs/backup/*`, `RECOVERY.md` · **DB:** — · **Esfuerzo:** S-M · **Depende de:** nada

---

### B4 — Paginación y rendimiento ⚡ (debe escalar a miles de expedientes)
- [ ] **Paginación server-side** con `.range()` de Supabase en todos los listados
- [ ] Lazy loading / carga incremental en tablas
- [ ] Índices SQL para los filtros de A5 (revisar EXPLAIN)
- [ ] Búsquedas eficientes (índices de texto / `ilike` acotado)
- [ ] Validar comportamiento con dataset grande (seed de ~5.000 registros)

**Archivos:** `services/*`, `features/*`, migración índices · **DB:** índices · **Esfuerzo:** M · **Depende de:** A5 (filtros)

---

### B5 — Calidad y monitoreo 📈 (versión ligera, sin over-engineering)
- [ ] **Logger de errores** propio: `window.onerror`/`unhandledrejection` → tabla `errores` en Supabase
- [ ] **Página de error amigable** (404 / 500 / sin permiso)
- [ ] Logs de operaciones críticas (se apoya en A2)
- [ ] Monitoreo ligero: Vercel Analytics + revisión de logs Supabase (no montar stack pesado)
- [ ] Validación de integridad de datos (constraints DB + checks periódicos)

**Archivos:** nuevo `core/logger.js`, página de error, migración `errores` · **DB:** tabla `errores` · **Esfuerzo:** M · **Depende de:** nada

---

### B6 — QA y pruebas ✅ ("no solo lo construí, validé que funciona")
- [ ] Casos de prueba documentados (`/docs/qa/test-cases.md`)
- [ ] Checklist de regresión por release
- [ ] Validación de flujos críticos (solicitud→cierre, asignación, soft delete)
- [ ] Pruebas de **permisos por rol** (cada rol ve/hace solo lo suyo)
- [ ] Pruebas de auditoría (cada cambio queda registrado)
- [ ] Pruebas de documentos (subida, estados, permisos)

**Archivos:** `/docs/qa/*` (+ scripts de prueba ligeros opcionales) · **DB:** — · **Esfuerzo:** M · **Depende de:** A1, A2, A4

---

### B7 — Configuración institucional ⚙️ (adaptable, no atado a una sola ONG)
- [ ] Tabla `config` / `organizacion` (nombre, logo, contacto)
- [ ] Catálogos editables: tipos de documento, catálogos de estados
- [ ] Pantalla de administración para editarlos

**Archivos:** nuevo `services/configService.js`, `features/config.js`, migración SQL · **DB:** tabla `config` · **Esfuerzo:** M · **Depende de:** A1

---

### B8 — Privacidad por asignación de casos 🔒 (futuro — alto valor)
> *Idea de diseño (2026-06-01).* El salto real de profesionalismo no es tener más roles,
> sino **ROL + ASIGNACIÓN**: que un trabajador social vea **solo los casos asignados a él**,
> no todos. Con datos de niños/familias es lo correcto en privacidad.
>
> **Decisión:** se documenta como mejora futura (no prioritaria todavía).
> **Alcance pragmático elegido** (80% del valor, 20% del esfuerzo): aislar la visibilidad
> de **casos**; niños y familias siguen siendo catálogo compartido del staff. El aislamiento
> total por registro en todas las tablas es un proyecto mayor (RLS con joins, niños sin caso).

- [ ] Columna `casos.asignado_a → usuarios(id)` + UI para asignar responsable (admin/coordinador)
- [ ] RLS `casos`: `admin`/`coordinador` ven todos; `trabajador_social` solo `asignado_a = auth.uid()`
- [ ] Filtro "Mis casos" en el listado
- [ ] (Decidir) si las notas/documentos heredan el mismo aislamiento que su caso

**Archivos:** migración SQL, `casosService.js`, `features/casos.js`, RLS · **DB:** `casos.asignado_a` + RLS · **Esfuerzo:** M-L · **Depende de:** A1

---

## Orden recomendado (4 fases)

> Principio: construir y estabilizar el núcleo (seguridad incluida) ANTES de documentarlo —
> no se documenta lo que todavía va a cambiar. `HANDOFF.md` se mantiene como notas vivas
> durante el camino; la documentación *formal* (B2) llega cuando el núcleo está estable.

### 🔴 Fase Crítica — núcleo seguro
| # | Tarea | Por qué aquí |
|---|---|---|
| 1 | **A0 · OAuth** | Bloqueante; login roto invalida cualquier demo |
| 2 | **A1 · Roles (RBAC)** | Base de toda la seguridad y de muchas fases |
| 3 | **B1 · Seguridad** (RLS + sesiones + soft delete + papelera) | Se apoya en roles; lo que más importa con datos de niños |

### 🟠 Fase Profesional — capacidades de gestión
| # | Tarea | Por qué aquí |
|---|---|---|
| 4 | **A2 · Auditoría + timeline** | Trazabilidad reconstruible del expediente |
| 5 | **A4 · Documentos** | Gran institucionalizador; alimenta el timeline |
| 6 | **A3 · Dashboard** | Métricas de gestión; impacto visual en demo |

### 🟡 Fase Institucional — madurez y confianza
| # | Tarea | Por qué aquí |
|---|---|---|
| 7 | **B2 · Documentación técnica** | Ahora el núcleo es estable → documentar no se reescribe |
| 8 | **B3 · Backups y recuperación** | Alta percepción, bajo esfuerzo |
| 9 | **B6 · QA** | Validar todo lo construido antes de "entregar" |

### 🟢 Fase de Escalabilidad — escalar y pulir
| # | Tarea | Por qué aquí |
|---|---|---|
| 10 | **B4 · Paginación/rendimiento** | Escala a miles de expedientes |
| 11 | **A5 · Búsqueda + Reportes** | Usa datos, roles y paginación ya listos |
| 12 | **A6 · Notificaciones** | Menor ROI, opcional |
| 13 | **B5 · Monitoreo** | Cuando ya hay flujo real que monitorear |
| 14 | **B7 · Config institucional** | Pulido de adaptabilidad |
| 15 | **B8 · Privacidad por asignación** | Salto de privacidad real; futuro, requiere A4/A2 estables |

**Top 5 que más acercan a "software institucional":**
🔐 B1 Seguridad · 📁 A4 Documentos · 📋 A2 Auditoría/timeline · 💾 B3 Backups · ⚡ B4 Rendimiento.

---

## Descartado / fuera de alcance

- **API REST propia:** Supabase ya expone API REST automática; otra capa = complejidad sin valor.
- **Stack de monitoreo pesado** (Grafana/Sentry self-host): para un MVP basta logger propio + Vercel Analytics.
- **Multi-tenant real:** B7 da adaptabilidad básica; no se persigue SaaS multi-organización.

---

## Riesgos heredados (del HANDOFF) y dónde se cierran

- [ ] KPIs cuentan soft-deleted → **A3**
- [ ] `logAudit` falla silencioso con RLS → **A2**
- [ ] Sin paginación (>200 registros) → **B4**
- [ ] PWA icons solo SVG (iOS) → pendiente menor (puede ir en B2/A pulido)

---

## Bitácora de avance

| Fecha | Tarea | Avance | Pendiente |
|---|---|---|---|
| 2026-05-30 | — | Roadmap v1 creado y alcance aprobado | Analizar plan, elegir arranque |
| 2026-05-30 | — | Roadmap v2: añadida **Vía B** (seguridad, backups, rendimiento, monitoreo, QA, docs, config) + orden combinado | Analizar v2, decidir fase de arranque |
| 2026-05-30 | — | Roadmap v3: reordenado en **4 fases** (Crítica/Profesional/Institucional/Escalabilidad) — B2 Docs movida tras estabilizar núcleo. Consultor = solo lectura estricta. Soft delete completo + papelera. KPI casos por trabajador social | Decidir fase de arranque (A0) |
| 2026-05-31 | **A0 OAuth** | ✅ **COMPLETADO.** Fix de código (PKCE + detectSessionInUrl:false, callback robusto, mensajes de error) + fix bug SW clone. Causa raíz real: credenciales Google desincronizadas → cliente OAuth nuevo + Secret correcto en Supabase. Login Google verificado en prod | Arrancar A1 (Roles) |
| 2026-05-31 | **A1 Roles** | 🟡 Código listo (parte 1): migración RBAC+RLS (`docs/fase_a1_rbac.sql`), `can()`/`roleLabel()` en auth, gating de UI en menores/familias/casos/notas, rol real en sidebar, SW→v10 | Usuario corre el SQL + prueba; luego A1-parte 2 (UI asignar roles) |
| 2026-06-01 | **A1 Roles** | 🟢 SQL RLS ejecutado por el usuario en Supabase. **A1-parte 2 lista:** `usuariosService` + `features/usuarios.js` + panel/modal "Usuarios" (solo admin, vía `can('manage_users')` y nav condicional), búsqueda/filtro por rol, badges de rol, anti-lockout (no editas tu propio rol), SW→v11 | Verificar en prod: admin gestiona roles · director solo lectura. Luego B1 (soft delete casos, fix KPI soft-deleted) |
| 2026-06-01 | **A1 · diseño de roles** | 🧭 Decisión de diseño: rol = conjunto de permisos, no cargo. **`consultor → director`** (código, UI, SQL canónico + `docs/fase_a1_director_rename.sql`). `psicologo`/`abogado` NO son roles → su trabajo se modela en A4 (documento tipado + `autor_externo`) + nota A2. Añadido **B8 · Privacidad por asignación de casos** como mejora futura (ROL+ASIGNACIÓN) | Usuario corre `fase_a1_director_rename.sql`; seguir con B1 |
