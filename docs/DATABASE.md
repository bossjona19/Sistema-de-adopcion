# DATABASE — Proyecto OMEGA

Esquema PostgreSQL en Supabase. Todas las tablas viven en el esquema `public`
y tienen **RLS habilitada** (ver `SECURITY.md`).

---

## 1. Tablas

### `usuarios`  (perfil + rol; extiende `auth.users`)
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | = `auth.users.id` (FK, on delete cascade) |
| nombre | text | |
| email | text unique | |
| rol | text | CHECK: `admin` · `coordinador` · `trabajador_social` · `director` |
| created_at | timestamptz | |

### `familias`
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| apellido | text | |
| contacto | text | |
| estado_eval | text | `pendiente` · `aprobada` · `rechazada` |
| fecha_solicitud | date | |
| notas | text | |
| nombre_completo, cedula, fecha_nacimiento, email, telefono, direccion | — | datos del formulario público v2 |
| deleted_at | timestamptz | **soft delete** |

### `menores`  (en la UI: "niños")
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| nombre | text | |
| fecha_nacimiento | date | edad calculada dinámicamente (`calcAge`) |
| genero | text | `masculino` · `femenino` · `otro` |
| estado | text | `disponible` · `en_proceso` · `adoptado` |
| foto_url, descripcion | text | |
| deleted_at | timestamptz | **soft delete** |

### `casos`  (expediente de adopción)
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| familia_id | uuid FK → familias | on delete restrict |
| menor_id | uuid FK → menores | on delete restrict |
| etapa | text | `solicitud → evaluacion → asignacion → seguimiento → cierre` |
| usuario_id | uuid FK → usuarios | trabajador asignado |
| fecha_inicio | timestamptz | default now() |
| fecha_cierre | timestamptz | la fija un **trigger** al pasar a `cierre` |
| created_at | timestamptz | |
| deleted_at | timestamptz | **soft delete** |

### `seguimiento`  (notas del expediente)
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| caso_id | uuid FK → casos | on delete cascade |
| descripcion | text | |
| fecha | timestamptz | |
| usuario_id | uuid FK → usuarios | autor de la nota |

### `documentos`  (archivos del expediente)
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| caso_id | uuid FK → casos | on delete cascade |
| tipo | text | `evaluacion_psicologica`·`certificado_medico`·`informe_social`·`documento_legal`·`acta_nacimiento`·`otro` |
| nombre | text | nombre original del archivo |
| storage_path | text | ruta en el bucket `documentos` |
| estado | text | `recibido`·`en_revision`·`aprobado`·`rechazado` (`vencido` se **calcula** por fecha) |
| autor_externo | text | p.ej. "Lic. María, psicóloga" (sin cuenta en el sistema) |
| fecha_vencimiento | date | |
| revisado_por, subido_por | uuid FK → usuarios | |
| fecha_revision, fecha | timestamptz | |

### `bitacora`  (auditoría)
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| usuario_id | uuid FK → usuarios | quién hizo la acción |
| accion, entidad | text | p.ej. "Actualizar caso", "casos" |
| entidad_id | uuid | a qué registro apunta (timeline por expediente) |
| valor_antes, valor_despues | text | diff legible (antes → después) |
| fecha | timestamptz | |

### `accesos`  (logins exitosos)
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| usuario_id | uuid FK → usuarios | |
| email | text | |
| fecha | timestamptz | |

## 2. Storage

- Bucket **`documentos`** — **privado**. Acceso solo vía URL firmada temporal
  (`createSignedUrl`). Ruta: `{caso_id}/{timestamp}_{archivo}`.
- Políticas en `storage.objects` por rol (select: staff; insert: admin/coordinador/trabajador_social; delete: admin/coordinador).

## 3. Relaciones (resumen)

```
auth.users 1───1 usuarios
familias 1──* casos *──1 menores
casos 1──* seguimiento
casos 1──* documentos
usuarios 1──* casos / seguimiento / documentos / bitacora / accesos
```

## 4. Migraciones (orden de aplicación)

Ejecutar en Supabase › SQL Editor. Todas son **idempotentes**.

| # | Archivo | Qué hace |
|---|---|---|
| 1 | `schema.sql` | Tablas base + RLS inicial |
| 2 | `fase2_migrations.sql` | Ajustes formulario público |
| 3 | `fase4_migrations.sql` | `menores.genero/fecha_nacimiento`, `casos.fecha_inicio/fecha_cierre` + trigger |
| 4 | `fase_a1_rbac.sql` | Roles (CHECK) + `user_role()` + RLS granular por tabla |
| 5 | `fase_a1_director_rename.sql` | `consultor` → `director` |
| 6 | `fase_b1_soft_delete.sql` | `casos.deleted_at` + índice parcial |
| 7 | `fase_b1_accesos.sql` | Tabla `accesos` + RLS |
| 8 | `fase_a2_auditoria.sql` | `bitacora.entidad_id/valor_antes/valor_despues` + índice |
| 9 | `fase_a4_documentos.sql` | Tabla `documentos` + bucket + políticas Storage |
| — | `add_admin.sql` | Alta manual de administradores |
| — | `fix_usuarios_rls.sql` | Reparación de políticas RLS de `usuarios` (si hace falta) |
| — | `seed.sql` | Datos de ejemplo (opcional) |

## 5. Alta de un usuario nuevo

1. Supabase › Authentication › Users › **Add user** (con *Auto Confirm*).
2. Insertar su perfil en `usuarios` (ver `add_admin.sql`) con el `rol` deseado.
3. Asignar/cambiar rol después desde la UI: panel **Usuarios** (solo admin).
