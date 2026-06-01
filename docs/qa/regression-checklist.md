# CHECKLIST DE REGRESIÓN — Proyecto OMEGA

Lista corta para correr **antes de cada release/deploy**. Si algo falla, ver el caso
completo en `test-cases.md`. Copia esta lista por release y marca el resultado.

> Release: __________  ·  Fecha: __________  ·  Probado por: __________

## Humo (5 min) — lo mínimo imprescindible
- [ ] Login email/contraseña entra al dashboard (TC-AUTH-1)
- [ ] Login Google entra sin loop (TC-AUTH-2)
- [ ] El dashboard carga KPIs y al menos una gráfica (TC-DASH-2)
- [ ] Crear un caso funciona y el niño pasa a "en proceso" (TC-CASO-1)
- [ ] Subir y **Ver** un documento funciona (TC-DOC-1, TC-DOC-3)

## Seguridad / roles
- [ ] admin ve Usuarios/Papelera/Bitácora (TC-ROLE-1)
- [ ] director es solo lectura y `#usuarios` rebota (TC-ROLE-2, 3)
- [ ] trabajador_social no ve "Eliminar" (TC-ROLE-4)
- [ ] Cambiar un rol **persiste** (no falso éxito) (ver RECOVERY §2)
- [ ] Login no autorizado es rechazado (TC-AUTH-3)

## Flujos críticos
- [ ] Cierre de caso → niño "adoptado" + `fecha_cierre` (TC-CASO-4)
- [ ] Eliminar → Papelera → Restaurar (niño/familia/caso) (TC-NIN-3/4, TC-CASO-5/6)
- [ ] Doble confirmación pide escribir nombre/código (TC-NIN-3)
- [ ] Documentos: estado, vencido, checklist, descargar (TC-DOC-5/6/7, TC-DOC-4)
- [ ] Historial del expediente en orden cronológico (TC-HIST-1)

## Auditoría y datos
- [ ] Acciones quedan en Bitácora con diff (TC-AUD-1, 3)
- [ ] Filtros de bitácora funcionan (TC-AUD-2)
- [ ] KPIs no cuentan registros borrados (TC-DASH-1)
- [ ] Se registró el login en `accesos` (TC-AUTH-6)

## PWA
- [ ] Cambios se ven al navegar entre pestañas sin F5 (TC-PWA-1)
- [ ] **Subir versión de `sw.js`** si cambiaron archivos cacheados (TC-PWA-2)

---

### Regla de oro del release
1. Aplicar migraciones SQL pendientes (ver `DATABASE.md §4`).
2. Subir versión del Service Worker si tocaste archivos cacheados.
3. Correr el **humo** + la sección afectada por el cambio.
4. Deploy en Vercel y repetir el **humo** en producción.
