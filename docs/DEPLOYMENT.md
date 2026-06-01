# DEPLOYMENT — Proyecto OMEGA

Despliegue de un sitio estático (HTML/CSS/JS) en **Vercel**, con **Supabase** como backend.
No hay build step: los archivos se sirven tal cual.

---

## 1. Requisitos

- Cuenta en **Vercel** y en **Supabase**.
- Repositorio Git con el proyecto.
- Un proyecto de Supabase con el esquema aplicado (ver `DATABASE.md`).

## 2. Configurar Supabase

1. Crear proyecto en Supabase → anotar **Project URL** y **publishable/anon key**.
2. En **SQL Editor**, ejecutar las migraciones en orden (ver `DATABASE.md §4`).
3. **Auth › Providers › Google:** habilitar y pegar Client ID + Secret de un cliente OAuth
   de Google Cloud cuyo *Authorized redirect URI* sea
   `https://<tu-proyecto>.supabase.co/auth/v1/callback`.
4. **Auth › URL Configuration:**
   - *Site URL:* el dominio de Vercel (`https://<app>.vercel.app`).
   - *Redirect URLs:* incluir el dominio con wildcard, p.ej. `https://<app>.vercel.app/**`.
5. **Storage:** la migración `fase_a4_documentos.sql` crea el bucket privado `documentos`
   y sus políticas. Si el SQL Editor no permite crear las políticas de `storage.objects`,
   crearlas a mano en Storage › Policies (mismas reglas por rol).
6. Crear el primer admin (ver `add_admin.sql`).

## 3. Variables / claves

`src/js/core/supabase.js` contiene la **Project URL** y la **publishable key**
(son públicas por diseño; la seguridad recae en RLS). Actualizarlas si cambias de proyecto.
No hay variables de entorno de build.

## 4. Desplegar en Vercel

1. Importar el repositorio en Vercel.
2. **Framework Preset:** *Other* · **Build Command:** vacío · **Output Directory:** `/` (raíz).
3. Deploy. Vercel sirve los estáticos y aplica `vercel.json`:
   - Rewrite de `/` → `/index.html`.
   - Cabeceras de seguridad globales.
   - `sw.js` con `Cache-Control: no-cache` y `Service-Worker-Allowed: /`.

## 5. PWA / Service Worker

- `sw.js` precachea los estáticos con nombre de versión `omega-vN`.
- **Al cambiar archivos cacheados hay que subir la versión** (`omega-vN` → `vN+1`) para que
  los clientes reciban lo nuevo; el SW activa `skipWaiting`/`clients.claim`.
- `manifest.json` con `start_url: "/"`.

## 6. Checklist post-deploy

- [ ] Login email/contraseña entra al dashboard.
- [ ] Login Google entra sin loop.
- [ ] Un usuario sin fila en `usuarios` es rechazado (whitelist).
- [ ] Subir/ver/descargar un documento funciona (bucket privado + URL firmada).
- [ ] Cada rol ve/hace solo lo suyo (probar admin vs. director).
- [ ] El Service Worker sirve la versión nueva (sin F5 manual tras subir versión).

## 7. Operación

- **Backups / restauración:** ver `RECOVERY.md` (ROADMAP B3, pendiente).
- **Logs:** Vercel (deploy/errores) y Supabase (Logs › Auth/DB).
- **Rollback:** redeploy de un commit anterior en Vercel.
