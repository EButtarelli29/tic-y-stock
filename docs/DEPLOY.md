# Deploy — VetConnect

> ✅ **Bloqueantes de la auditoría 5-Ago ya resueltos (S13):**
> 1. **`.env` fuera de git** — `backend/.env`, `web/.env` y `mobile/.env` ya no están trackeados (`git rm --cached`), el `.gitignore` está ampliado y existen `.env.example` en las 3 capas. **Pendiente manual:** rotar credenciales Supabase y `JWT_SECRET` (estuvieron expuestos) y purgar el historial git (`git filter-repo`/`BFG`) antes de hacer el repo público en serio.
> 2. **Migraciones alineadas** — `prisma migrate deploy` (ejecutado por `npm start`) ya replica el schema: la migración `20260810000000_sprint13_align` + `20260812000000_session_revocation` están commiteadas.
> 3. **`eas.json`/`app.json` (mobile)** — ⚠️ sigue pendiente: los perfiles `preview`/`production` apuntan a `http://localhost:3001` y `eas.projectId` está vacío. Configurar la URL HTTPS real y el projectId antes de un build de producción.

## Stack de producción

| Servicio | Proveedor | Costo | Estado |
|----------|-----------|-------|--------|
| **Backend (API)** | Koyeb | Gratis (always-on 1GB RAM) | ✅ Recomendado |
| **Frontend Web** | Vercel | Gratis | ✅ Listo |
| **Base de datos** | Supabase | Gratis (500MB) | ✅ Ya en uso |
| **Mobile (APK/IPA)** | EAS Build | Gratis (30 builds/mes) | ✅ Listo |
| **Dominio** | — | — | Usar subdominio gratis |

---

## Backend — Proveedor de deploy

> **Fuente única de verdad:** el backend se puede deployar en cualquier PaaS que corra Node. El pipeline documentado en `README.md` y en la sección de abajo usa **Railway vía CI/CD** como configuración activa. **Koyeb** se recomienda como alternativa gratis (always-on 1GB RAM, HTTPS automático). Ambos son válidos; no son mutuamente excluyentes.

El pipeline activo (`backend` y docs README) deploya a **Railway** automáticamente desde GitHub Actions al pushear a `main`:
`push a main → tests (unit + integration + tsc) → build web → railway up --service conectavet-api → smoke test /health`.

> Abajo se deja la opción **Koyeb** (alternativa gratis recomendada):

## Backend — Opción: Koyeb (gratis)

### Por qué Koyeb

- **Always-on**: No se duerme (Render sí lo hace a los 15 min)
- **1GB RAM gratis** — más que suficiente para un MVP
- PostgreSQL gratis incluido (no lo necesitás, ya tenés Supabase)
- Auto-deploy desde GitHub
- HTTPS automático
- Dominio: `tuapp.koyeb.app`

### Setup

1. Crear cuenta en [koyeb.com](https://koyeb.com) (GitHub login)
2. Ir a **Create App** → **GitHub** → seleccionar repo
3. Configurar:
   - **Builder**: Docker
   - **Dockerfile path**: `backend/Dockerfile`
   - **Port**: 3000
4. Agregar variables de entorno:

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Pooler de Supabase (puerto 6543, con `?pgbouncer=true`) |
| `DIRECT_URL` | Conexión directa Supabase (puerto 5432) |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | URL de Vercel (ej. `https://vetconnect.vercel.app`) |
| `LOG_LEVEL` | `info` |
| `EXPO_PUSH_DISABLED` | `true` desactiva el envío real de push (útil para tests/dev) |

> ⚠️ **Imágenes del chat (S12):** `POST /api/media` guarda en `backend/uploads/`, que en Koyeb/Render es **disco efímero** (se pierde en cada redeploy). Para producción persistente migrar a Cloudinary/S3 (la columna `photoUrl` de mascotas ya usa Cloudinary) o montar un volumen persistente. En dev local funciona sin cambios.

5. Ir a **App Settings** → **Domains** → copiar la URL de Koyeb
6. **(importante)** Ir a Supabase → Project Settings → API → en **Settings > API > Config > User Authorization** → agregar `https://tudominio.koyeb.app` a los redirect URLs permitidos

---

## Backend — Opción 2: Render (gratis, se duerme)

Alternativa si no funciona Koyeb. Render da 512MB RAM gratis pero duerme el servicio a los 15 min sin tráfico. Al recibir un request tarda ~30s en despertar. Para un MVP con poco uso es aceptable.

[render.com](https://render.com) — mismo setup que Koyeb pero con Web Service + PostgreSQL.

---

## Frontend Web — Vercel (gratis)

### Setup

1. Ir a [vercel.com](https://vercel.com) e iniciar sesión con GitHub
2. **Add New → Project** → importar repo
3. Configurar:
   - **Root Directory**: `web`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Deploy — Vercel detecta Vite automáticamente

### Dominio personalizado (opcional)

Si tenés un dominio (ej. `conectavet.com`), agregalo en Vercel → Project → Domains y seguí las instrucciones DNS.

---

## Mobile — EAS Build (gratis, 30 builds/mes)

### Prerequisitos

```bash
cd mobile
npm install -g eas-cli
eas login
```

### Build APK (Android)

```bash
eas build --platform android --profile preview
```

### Build IPA (iOS)

```bash
eas build --platform ios --profile preview
```

Requiere cuenta de Apple Developer ($99/año) para distribución.

---

## Iconos de la app

Los SVG fuente están en:
- `web/public/favicon.svg` (48x48) — favicon
- `web/public/logo-icon.svg` (512x512) — icono PWA y mobile

Para generar los PNG necesarios para mobile (`mobile/assets/`), usá:

```bash
npx svg-to-png web/public/logo-icon.svg mobile/assets/icon.png --width 1024
npx svg-to-png web/public/logo-icon.svg mobile/assets/adaptive-icon.png --width 1024
npx svg-to-png web/public/logo-icon.svg mobile/assets/splash.png --width 1284
```

O convertí manualmente en [svgtopng.com](https://svgtopng.com).

---

## Migraciones de base de datos

En producción las migraciones se ejecutan automáticamente al iniciar el servidor (`npm start` ejecuta `prisma migrate deploy` antes de arrancar).

> ✅ **Estado (11-Ago):** las migraciones están **alineadas** con `schema.prisma` desde S13 (migración correctiva `20260810000000_sprint13_align` + `20260812000000_session_revocation`). `prisma migrate deploy` en prod ya replica el schema. Para cambios futuros:
> 1. Correr `npx prisma migrate dev --name descripcion` en dev
> 2. Verificar el SQL generado y commitear la migración
> 3. Deploy (Railway la aplica automáticamente al arrancar)

Para desarrollo:

```bash
npx prisma migrate dev --name descripcion
```

> En desarrollo también se puede sincronizar directo con `npx prisma db push` (no versiona, pero es lo que venía usando el equipo).

---

## Notas de seguridad

- ✅ **`.env` ya fuera de git** (S13): `git ls-files` ya no lista `backend/.env`, `web/.env`, `mobile/.env`. Cada capa tiene `.env.example` como template.
- ⚠️ **Pendiente manual (CRITICO):** rotar las credenciales de Supabase (password de la BD) porque estuvieron expuestas en el historial del repo
- ⚠️ **Pendiente manual:** cambiar el `JWT_SECRET` placeholder `change-me-to-a-random-secret` **antes** de cualquier deploy de producción (hoy cualquiera con el repo puede forjar JWTs) — generar uno nuevo con `openssl rand -hex 32`
- 🦠 **Purgar historial git** de los `.env`: requiere `git filter-repo` o BFG y re-clonar todos los miembros del equipo
- Las variables de entorno se configuran en el dashboard del proveedor, nunca en archivos
- Revisar antes de cada release: secretos, migraciones alineadas, config de mobile/cada capa (`eas.json` HTTPS + projectId)
