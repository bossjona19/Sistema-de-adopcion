# CASOS DE PRUEBA — Proyecto OMEGA

Pruebas **manuales** de los flujos críticos. Formato: cada caso tiene precondición,
pasos y resultado esperado. Marca ✅/❌ al ejecutarlas (ver `regression-checklist.md`
para la versión rápida por release).

Convención de IDs: `TC-<área>-<n>`.

---

## 1. Autenticación y sesión (AUTH)

| ID | Precondición | Pasos | Resultado esperado |
|---|---|---|---|
| TC-AUTH-1 | Usuario válido en `usuarios` | Login con correo y contraseña | Entra al dashboard |
| TC-AUTH-2 | Cuenta Google en `usuarios` | Login con Google | Entra sin loop (un solo canje PKCE) |
| TC-AUTH-3 | Cuenta Google **sin** fila en `usuarios` | Login con Google | Rechazo: vuelve a login con aviso "sin acceso" |
| TC-AUTH-4 | Sesión iniciada | Dejar la pestaña inactiva ~14 min | Aviso "se cerrará en 1 min"; a los 15 min cierra sesión |
| TC-AUTH-5 | Sesión iniciada | Mover el ratón/teclear antes de 15 min | El contador de inactividad se reinicia (no cierra) |
| TC-AUTH-6 | Login exitoso | Revisar tabla `accesos` en Supabase | Hay una fila nueva (usuario_id + email + fecha) |

## 2. Roles y permisos (ROLE) — *prueba el corazón de la seguridad*

| ID | Rol | Pasos | Resultado esperado |
|---|---|---|---|
| TC-ROLE-1 | admin | Mirar el menú | Ve **Usuarios, Papelera, Bitácora** (sección Administración) |
| TC-ROLE-2 | director | Mirar Niños/Familias/Casos | **Sin** botones crear/editar/eliminar; formularios ocultos |
| TC-ROLE-3 | director | Escribir `#usuarios` en la URL | Rebota a Dashboard (no entra) |
| TC-ROLE-4 | trabajador_social | Abrir un caso/niño | Puede crear/editar; **no** ve botón Eliminar |
| TC-ROLE-5 | coordinador | Eliminar un niño | Permitido (con doble confirmación) |
| TC-ROLE-6 | director | (Avanzado) Intentar `UPDATE` vía consola/API | RLS lo bloquea (0 filas / error), no solo la UI |

## 3. Niños y Familias (CRUD + soft delete)

| ID | Pasos | Resultado esperado |
|---|---|---|
| TC-NIN-1 | Registrar niño con nombre y estado | Aparece en la lista; KPI "Niños" sube |
| TC-NIN-2 | Editar un niño | Cambios guardados; bitácora registra el diff (campo: antes → después) |
| TC-NIN-3 | Eliminar un niño | Pide **escribir el nombre**; al confirmar desaparece de la lista |
| TC-NIN-4 | Tras TC-NIN-3, ir a Papelera (admin) y Restaurar | El niño reaparece en la lista |
| TC-FAM-1 | Registrar/editar/eliminar familia | Igual que niños; eliminar pide escribir el apellido |

## 4. Casos / flujo de adopción (CASO)

| ID | Pasos | Resultado esperado |
|---|---|---|
| TC-CASO-1 | Crear caso (familia + niño disponible) | Caso creado; el **niño pasa a "en proceso"** |
| TC-CASO-2 | Intentar asignar la misma familia a un 2º caso activo | Se impide (familia ya en caso activo) |
| TC-CASO-3 | Avanzar etapa Solicitud→Evaluación | Bitácora registra "Solicitud → Evaluación" |
| TC-CASO-4 | Llevar el caso a **Cierre** | Niño pasa a "adoptado"; se fija `fecha_cierre` (trigger) |
| TC-CASO-5 | Eliminar un caso (no cerrado) | Doble confirmación (código); niño vuelve a "disponible"; caso a Papelera |
| TC-CASO-6 | Restaurar el caso desde Papelera (admin) | Reaparece en la lista de casos |

## 5. Expediente (pestañas + documentos)

| ID | Pasos | Resultado esperado |
|---|---|---|
| TC-EXP-1 | Abrir **Expediente** de un caso | Modal con pestañas Información / Documentos / Seguimiento / Historial |
| TC-DOC-1 | Subir un PDF tipo "Evaluación psicológica" con autor externo | Aparece en la lista con estado "Recibido" |
| TC-DOC-2 | Validar tamaño: intentar subir > 10 MB | Aviso y no se sube |
| TC-DOC-3 | Pulsar **Ver** | Abre el archivo en otra pestaña (URL firmada) |
| TC-DOC-4 | Pulsar **Descargar** | Descarga el archivo con su nombre |
| TC-DOC-5 | Cambiar estado a "Aprobado" | Badge cambia; queda registrado en bitácora |
| TC-DOC-6 | Documento con `fecha_vencimiento` pasada y no aprobado | Se muestra badge **Vencido** (calculado) |
| TC-DOC-7 | Pestaña **Información** | Checklist: ✓ aprobado · ◐ subido sin aprobar · ○ falta |
| TC-DOC-8 | Eliminar documento (admin/coordinador) | Desaparece de la lista y del Storage |
| TC-NOTA-1 | Agregar nota en Seguimiento | Aparece en la lista de notas |
| TC-HIST-1 | Abrir **Historial** | Línea de tiempo cronológica: creación, etapas, notas y documentos, con autor/fecha |

## 6. Auditoría (AUDIT)

| ID | Pasos | Resultado esperado |
|---|---|---|
| TC-AUD-1 | Hacer varias acciones (crear/editar/cambiar etapa) | Cada una aparece en **Bitácora** (admin) |
| TC-AUD-2 | Filtrar bitácora por usuario / entidad / fecha | La lista se filtra correctamente |
| TC-AUD-3 | Editar mostrando diff | Columna "Cambio" muestra antes → después |
| TC-AUD-4 | (Negativo) Forzar fallo de `logAudit` (RLS) | La acción principal NO se rompe; se avisa en consola |

## 7. Dashboard (DASH)

| ID | Pasos | Resultado esperado |
|---|---|---|
| TC-DASH-1 | Soft-delete de un niño y volver al Dashboard | El KPI **no** cuenta el borrado (`deleted_at`) |
| TC-DASH-2 | Cerrar un caso y abrir Dashboard | "Adopciones por mes" y "Días prom." se actualizan |
| TC-DASH-3 | Ver "Carga de trabajo" | Orden **alfabético** (no ranking); cuenta casos activos por trabajador |
| TC-DASH-4 | Abrir Dashboard sin conexión al CDN | KPIs se muestran; gráficas se omiten sin romper |

## 8. PWA / navegación (PWA)

| ID | Pasos | Resultado esperado |
|---|---|---|
| TC-PWA-1 | Editar en Niños y cambiar a Bitácora (sin F5) | Los datos se ven actualizados al entrar (recarga por navegación) |
| TC-PWA-2 | Deploy con nueva versión de `sw.js` | Tras recargar, se sirve el contenido nuevo |

---

### Notas
- No hay framework de pruebas automatizadas (Vanilla JS). Estas pruebas son **manuales**.
- Para pruebas de permisos "de verdad" (TC-ROLE-6) usar la consola del navegador o un cliente
  REST con el token de un usuario `director` y confirmar que RLS bloquea escrituras.
