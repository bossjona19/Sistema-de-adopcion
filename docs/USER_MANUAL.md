# MANUAL DE USUARIO — Proyecto OMEGA

Guía rápida del Sistema de Gestión de Adopciones. Pensada por rol.

---

## 1. Acceso

- Entra a la app y pulsa **Iniciar sesión**.
- Inicia con **correo y contraseña** o con **Google**.
- Si tu cuenta no está autorizada, verás un aviso: contacta al administrador.
- Por seguridad, la sesión se **cierra sola tras 15 minutos** de inactividad
  (te avisa 1 minuto antes).

## 2. Roles y qué puede hacer cada uno

| Rol | Para quién | Qué puede hacer |
|---|---|---|
| **Administrador** | Responsable del sistema | Todo, incluida gestión de usuarios, papelera y bitácora |
| **Coordinador** | Supervisa casos | Crear, editar, eliminar, avanzar etapas, documentos |
| **Trabajador Social** | Lleva expedientes | Crear y editar; subir documentos (no eliminar) |
| **Director** | Dirección | **Solo lectura**: ver expedientes, dashboard y reportes |

## 3. El panel (Dashboard)

Al entrar verás métricas de gestión:
- KPIs: niños, familias, casos activos/cerrados y **días promedio de adopción**.
- Gráficas: adopciones por mes, casos por trabajador, niños por estado y por género.
- Bitácora de actividad reciente y embudo por etapa.

Menú lateral: **Dashboard · Niños · Familias · Casos** (y para admin: **Usuarios ·
Papelera · Bitácora**).

## 4. Niños y Familias

- Botón **Registrar** para crear; ícono de **lápiz** para editar.
- Buscador y filtro por estado.
- **Eliminar** pide escribir el nombre/apellido para confirmar; el registro va a la
  **Papelera** (recuperable por el admin).

## 5. Casos (expedientes)

- **Nuevo caso:** elige familia y niño (con buscador) y la etapa.
- Etapas: **Solicitud → Evaluación → Asignación → Seguimiento → Cierre**.
  Al cerrar, el niño pasa a "adoptado" y se registra la fecha de cierre.
- Botón **Expediente** (en cada caso) abre la ficha con 4 pestañas:

### Pestaña Información
Datos del caso + **checklist de documentos**:
✓ verde = aprobado · ◐ ámbar = subido sin aprobar · ○ gris = falta.

### Pestaña Documentos
- **Subir:** elige tipo (evaluación psicológica, certificado médico, informe social,
  documento legal, acta de nacimiento, otro), opcionalmente **autor externo**
  (ej. el psicólogo que firma el informe) y fecha de vencimiento. Máx. 10 MB.
- **Ver:** abre el archivo en otra pestaña. **Descargar:** lo baja para enviarlo.
- **Estado:** recibido → en revisión → aprobado/rechazado (se marca **vencido** solo).

### Pestaña Seguimiento
Notas cronológicas del caso (visitas, observaciones…).

### Pestaña Historial
Línea de tiempo completa: creación, cambios de etapa, notas y documentos, con autor y fecha.

## 6. Solo administrador

- **Usuarios:** ver el equipo y **cambiar el rol** de cada quien (no puedes cambiar el tuyo).
  Para *crear* un usuario nuevo: créalo primero en Supabase (Auth) y luego asígnale rol aquí.
- **Papelera:** ver y **restaurar** niños, familias y casos eliminados.
- **Bitácora:** registro de auditoría con filtros por usuario, entidad y fecha.

## 7. Formulario público de solicitud

Las familias interesadas pueden enviar su solicitud desde la página pública
(`/solicitud.html`) sin necesidad de cuenta. La solicitud queda registrada para su evaluación.

## 8. Consejos

- Si no ves un cambio recién hecho, normalmente ya se refresca al cambiar de sección;
  si algo se ve raro, recarga la página.
- Mantén los documentos con su **estado actualizado**: el checklist del expediente
  depende de ello.
