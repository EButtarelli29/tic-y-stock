# VetConnect — Guía de Despliegue a Producción

> Stack: **Backend** (Express + Prisma + Supabase PostgreSQL) · **Web** (React + Vite) · **Mobile** (Expo / React Native, EAS Build).
> Para correr el proyecto en tu máquina (dev/localhost), ver `RUN_GUIDE.md`. Esta guía cubre cómo llevarlo a un entorno real (HTTPS, dominio propio, builds de producción).

---

> ✅ **Hallazgos P0→P3 de `CODE_AUDIT.md` resueltos (14-ago, commit `36d76f0`):** registro solo `CLIENT`, `password` oculto en respuestas, revocación de sesiones por `tokenVersion`, `/uploads` tras auth, rutas admin con `authorize()`, concurrencia en `completeConsultation`/`createReview`, dedup de mensajes (`clientMsgId`), cuota de media y correcciones UX/a11y. **Sigue bloqueante de borde:** rotar secretos + purgar git (ítems 3–5 abajo). El `userInterfaceStyle` de `app.json` volvió a `light` (la app se veía "en negro" con `automatic` + modo oscuro del SO).

## 0. Checklist pre-lanzamiento (leer primero)

Estos ítems son **bloqueantes** antes de cualquier build de producción. La mayoría ya están hechos (S13) pero varios siguen pendientes manualmente.

| # | Ítem | Estado | Dónde |
|---|------|--------|-------|
| 1 | `.env` fuera de git | ✅ hecho | `.gitignore` + `.env.example` en las 3 capas |
| 2 | Migraciones alineadas al schema | ✅ hecho | `prisma migrate deploy` en arranque |
| 3 | **Rotar `JWT_SECRET`** (no usar placeholder) | ⚠️ **pendiente** | `backend/.env` |
| 4 | **Rotar credenciales Supabase** (expuestas en historial) | ⚠️ **pendiente (CRÍTICO)** | Supabase → DB → password |
| 5 | **Purgar historial git** de los `.env` | ⚠️ **pendiente** | `git filter-repo` / BFG + re-clonar |
| 6 | `eas.json` apuntando a HTTPS real (no `localhost:3001`) | ⚠️ **pendiente** | `mobile/eas.json` |
| 7 | `eas.projectId` configurado | ⚠️ **pendiente** | `mobile/app.json` / `eas.json` |
| 8 | Almacenamiento de imágenes persistente (no disco efímero) | ⚠️ **pendiente recomendado** | Cloudinary/S3 |
| 9 | Rate limiting en `/register` y `/refresh` | ✅ hecho (S16) | `backend/src/app.ts` |
| 10 | Mensaje de registro genérico (anti-enumeración) | ✅ hecho (S16) | `auth.controller.ts` |
| 11 | Adoptar `packages/shared` (web/mobile no lo importan: 0 imports) | ⚠️ pendiente | `ADR-008` / `DECISIONS.md` |
| 12 | CORS de WebSocket restrictivo (ahora `*`; validar origen en `socket.ts`) | ⚠️ pendiente | `mobile/src/lib/socket.ts` |
| 13 | Video LiveKit end-to-end (cliente usa WebView, no el SDK) | ⚠️ pendiente | `mobile/src/screens/CallScreen.tsx` |

> **Nota sobre el registro de veterinarios:** el backend ignora el campo `role` y siempre crea cuentas `CLIENT`. El alta de `VET` es manual (directo en BD o panel admin). La web ya advierte esto en el selector. No se debe prometer "registro de veterinarios" en marketing hasta implementar el flujo.

---

## 1. Variables de entorno de producción

### 1.1 Backend (`backend/.env`)

```dotenv
# -- Base de datos Supabase (pooler de sesión para queries, directa para migraciones) --
DATABASE_URL="postgresql://postgres.<REF>:PASSWORD@aws-1-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.<REF>:PASSWORD@aws-1-<region>.pooler.supabase.com:5432/postgres"

# -- JWT (OBLIGATORIO generar uno nuevo y secreto) --
JWT_SECRET="<openssl rand -hex 32>"

# -- Feature flags --
REFRESH_TOKENS=true

# -- Servidor --
PORT=3001
NODE_ENV=production

# -- CORS: solo los orígenes de producción, separados por coma --
CORS_ORIGIN="https://vetconnect.vercel.app,https://api.vetconnect.com"

# -- Logs --
LOG_LEVEL=info

# -- LiveKit (videollamadas) --
LIVEKIT_URL="wss://<proyecto>.livekit.cloud"
LIVEKIT_API_KEY="<key>"
LIVEKIT_API_SECRET="<secret>"

# -- Opcional: desactivar push real en pruebas --
EXPO_PUSH_DISABLED=false
```

Generar el secreto:

```bash
openssl rand -hex 32
```

### 1.2 Web (`web/.env`)

```dotenv
VITE_API_URL=https://api.vetconnect.com
```

> Si la web se sirve desde el mismo dominio (proxy inverso), puede dejarse relativo (`/api`). El build es estático (`dist/`).

### 1.3 Mobile (`mobile/.env`)

```dotenv
EXPO_PUBLIC_API_URL=https://api.vetconnect.com
EXPO_PUBLIC_WS_URL=wss://api.vetconnect.com/socket.io
EXPO_PUBLIC_LIVEKIT_URL=wss://<proyecto>.livekit.cloud
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=<cloud>
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=<preset>
```

> Todas las variables de mobile deben prefijarse con `EXPO_PUBLIC_` para exponerse al runtime de React Native.

---

## 2. Dominio y HTTPS

Para producción necesitás:

- **Un dominio** (ej. `conectavet.com`) o subdominios gratuitos de los proveedores.
- **API sobre HTTPS** con `wss://` para Socket.IO y videollamadas (los navegadores y Expo exigen TLS en producción; `http`/`ws` solo funciona en `localhost`).
- **CORS** apuntando a la URL de la web (la API no debe aceptar `*` con credenciales).

Esquema recomendado (un solo dominio con subdominios):

```
https://app.vetconnect.com   → Web (Vercel / CDN estático)
https://api.vetconnect.com   → Backend (Koyeb/Railway/Render)  [CORS_ORIGIN = https://app.vetconnect.com]
```

El backend ya aplica `helmet()` y `trust proxy`. El proxy/Servidor debería terminar TLS y reenviar a `PORT`.

---

## 3. Backend

El arranque (`npm start`) ejecuta `prisma migrate deploy` antes de levantar el server, así que las migraciones se aplican solas en cada deploy.

### 3.1 Proveedor recomendado: Koyeb (gratis, always-on)

1. Crear app en [koyeb.com](https://koyeb.com) desde GitHub.
2. Builder **Docker**, `Dockerfile` en `backend/Dockerfile`, puerto `3001` (o el expuesto por el Dockerfile).
3. Variables de entorno: ver §1.1 (usar el dominio real en `CORS_ORIGIN`).
4. Dominios → asignar `api.<tudominio>`. Koyeb da HTTPS automático.
5. En Supabase → Project Settings → agregar la URL de la API a los redirect/hosts permitidos si aplica RLS.

### 3.2 Alternativas

- **Railway** (CI/CD activo vía GitHub Actions en `main`).
- **Render** (gratis pero se duerme a los 15 min → ~30s de cold start; aceptable para MVP con poco tráfico).

### 3.3 Rate limiting

Ya configurado en `backend/src/app.ts`:

- Limiter global (200 req / 15 min) excluye `GET`/`HEAD` para no tumbar el dashboard por polling.
- Limiter de auth (`authLimiter`, 10 / 15 min) montado en `/api/auth/login`, `/api/auth/register` y `/api/auth/refresh`.

Ajustar `max` según tráfico real en producción.

---

## 4. Frontend Web (Vercel)

1. [vercel.com](https://vercel.com) → importar repo → Root Directory `web`, Framework **Vite**.
2. Build: `npm run build` → Output `dist`.
3. Variables de entorno: `VITE_API_URL=https://api.vetconnect.com`.
4. Dominio: `app.<tudominio>` (o el que elijas).

> El SPA usa `BrowserRouter`; asegurar rewrite a `index.html` (Vercel lo hace solo con `vite` preset). Verificar que el header de la web sea responsive (ver `DashboardPage`/`VetDashboardPage`: `flex-col md:flex-row` + `pb-20 md:pb-0` para la barra inferior móvil).

---

## 5. Mobile (EAS Build)

### 5.1 Configurar `eas.json` / `app.json` (PENDIENTE)

Antes de un build de producción:

- `eas.projectId`: completar con el ID del proyecto EAS (ver `eas.json`).
- Las URLs en `eas.json` y `mobile/.env` deben ser **HTTPS** reales, **no** `http://localhost:3001`.
- `EXPO_PUBLIC_WS_URL` debe usar `wss://`.

### 5.2 Builds

```bash
cd mobile
npm install -g eas-cli
eas login
eas build --platform android --profile preview   # APK de prueba
eas build --platform android --profile production # AAB para Play Store
```

iOS requiere Apple Developer ($99/año).

### 5.3 Actualizaciones OTA (Expo Updates)

Para cambios de JS sin re-subir a la tienda:

```bash
eas update --branch production --message "fix ui"
```

> El canal de actualización debe coincidir con el configurado en `app.json` (`expo.updates`). Los cambios nativos (permisos, SDK) sí requieren nuevo build.

---

## 6. Almacenamiento de imágenes (media)

`POST /api/media` guarda en `backend/uploads/`, que en Koyeb/Render es **disco efímero** (se pierde en cada redeploy). Para producción persistente:

- Migrar a **Cloudinary** o **S3** (la columna `photoUrl` de mascotas ya usa Cloudinary).
- O montar un **volumen persistente** en el proveedor.

Hasta entonces, las fotos de mascotas subidas por API no son duraderas en prod.

---

## 7. Notificaciones Push

- Expo push requiere `EXPO_PUSH_DISABLED=false` y un proyecto Expo válido en `eas.json`.
- Configurar `EXPO_PUSH_VAPID_*` / credenciales FCM/APNs según la plataforma.
- El refresh de token en mobile ya actualiza el `socket.auth` tras un re-login (`mobile/src/lib/api.ts`) y desconecta el socket en sesión expirada (`authStore.handleSessionExpired`).

---

## 8. Monitoreo y salud

- **Health check:** `GET /health` → `{ status: "ok", database: "connected" }`. Usarlo en el load balancer / uptime monitor.
- **Logs:** `LOG_LEVEL=info`. El backend loguea cada request; revisar en el dashboard del proveedor.
- **Errores:** el handler global no filtra `NODE_ENV`; en producción devuelve mensajes genéricos.

---

## 9. Seguridad — resumen para producción

- ✅ Helmet, CORS restringido, rate limiting en auth.
- ✅ Registros no revelan existencia de cuenta (mensaje genérico 409).
- ✅ Archivos `/uploads` requieren autenticación + participación en la consulta.
- ⚠️ **Rotar `JWT_SECRET` y credenciales Supabase** (estuvieron en el historial).
- ⚠️ **Purgar historial git** de los `.env` antes de hacer público el repo.
- ⚠️ El `role` del registro se ignora (siempre `CLIENT`); el alta de VET es manual.

---

## 10. Backups, rollback y Point-in-Time Recovery (PITR)

> Backups y un runbook de rollback son **obligatorios** antes de abrir la app a usuarios reales. Sin esto, un deploy fallido o un borrado accidental es irrecuperable.

### 10.1 Backups automáticos (Supabase)

- Supabase habilita **backups diarios** y **PITR** en planes de pago; en el plan gratis solo hay backup puntual. Activar PITR en *Project Settings → Database → Point in Time Recovery*.
- Con PITR podés restaurar la BD a cualquier momento de los últimos 7–30 días (según plan).
- Si usás otra base (Railway/Render), configurar `pg_dump` programado o el backup nativo del proveedor.

### 10.2 Snapshot antes de cada deploy con migración

Antes de correr `prisma migrate deploy` en producción (o de aplicar una migración manual):

```bash
# Snapshot lógico rápido (no bloquea la base)
pg_dump "$DATABASE_URL" --format=custom --file=backup_pre_$(date +%Y%m%d_%H%M).dump
```

Guardar el dump en un bucket externo (S3/Cloudinary no sirve para SQL), no en el disco efímero del backend.

### 10.3 Rollback de la base de datos

- **Migraciones deben ser reversibles (gated).** Toda migración que borre/renombre columnas o cambie tipos debe traer su `down`:
  - En vez de `DROP COLUMN`, usar `ALTER COLUMN ... SET NOT NULL` solo tras backfill, o marcar `@@ignore` y eliminar en la siguiente migración.
  - Nunca `DROP TABLE` sin backup previo (ver 10.2).
- Para revertir una migración aplicada: restaurar el dump de 10.2 en una base nueva y repuntar `DATABASE_URL`, o usar PITR a un instante anterior al deploy.

### 10.4 Rollback de la aplicación

- **Backend:** los proveedores (Koyeb/Railway/Render) permiten redeploy de un commit anterior. Mantener el tag del último deploy estable.
- **Web:** Vercel guarda cada deploy; un "Promote" a un deploy anterior es instantáneo.
- **Mobile:** `eas update --branch production --message "rollback"` apunta el canal a un build JS previo; para cambios nativos, subir un AAB/build anterior.

### 10.5 Checklist de rollback (tener a mano)

1. Snapshot reciente de BD (10.2) ✔
2. Commit/tag del último deploy estable anotado ✔
3. `DATABASE_URL` apuntando a la base restaurada (si la migración falló) ✔
4. Verificar `GET /health` tras revertir ✔

---

## 11. Pasos sugeridos (orden)

1. Rotar secretos (JWT + Supabase) y generar nuevos.
2. Purgar historial git de `.env` (BFG/filter-repo).
3. Configurar dominio + HTTPS para API y Web.
4. Desplegar backend (Koyeb) y verificar `/health`.
5. Desplegar web (Vercel) y verificar login.
6. Configurar `eas.json` (HTTPS + projectId) y build mobile.
7. Migrar media a almacenamiento persistente.
8. Smoke test end-to-end: registro, login, consulta, chat, videollamada.
