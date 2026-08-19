# VetConnect — Guía para correr todo el proyecto

> **Backend** (Express + Prisma + Supabase) · **Web** (React + Vite) · **Mobile** (Expo + React Native)

---

## 📦 Requisitos

| Herramienta | Versión | Verificar |
|-------------|---------|-----------|
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Expo Go | última | App en Play Store |

---

## ⚙️ 0. Configuración inicial (archivos `.env`)

Los `.env` **no están en git** (están en `.gitignore`). La primera vez, copialos desde los `.env.example` y completá los valores:

```bash
cp backend/.env.example backend/.env
cp web/.env.example      web/.env
cp mobile/.env.example   mobile/.env
```

### `backend/.env` (mínimo para arrancar en local)

```dotenv
DATABASE_URL="postgresql://postgres.<REF>:PASSWORD@aws-1-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.<REF>:PASSWORD@aws-1-<region>.pooler.supabase.com:5432/postgres"
JWT_SECRET="$(openssl rand -hex 32)"
REFRESH_TOKENS=true
PORT=3001
CORS_ORIGIN="http://localhost:5173,http://localhost:8081,http://192.168.0.X:8081"
LOG_LEVEL=debug
LIVEKIT_URL=""
LIVEKIT_API_KEY=""
LIVEKIT_API_SECRET=""
```

> `DATABASE_URL`/`DIRECT_URL` apuntan a tu PostgreSQL (Supabase o local). `JWT_SECRET` debe ser un valor aleatorio generado localmente. Las claves de LiveKit pueden quedar vacías si no vas a probar videollamadas.

### `web/.env`

```dotenv
VITE_API_URL=http://localhost:3001
```

### `mobile/.env`

```dotenv
EXPO_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_WS_URL=ws://localhost:3001/socket.io
EXPO_PUBLIC_LIVEKIT_URL=ws://localhost:7880
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=
```

> En mobile, `start.ps1` reescribe `EXPO_PUBLIC_API_URL`/`EXPO_PUBLIC_WS_URL` automáticamente según la red (USB/LAN/Tunnel). Podés dejarlos vacíos y dejar que el script los configure.

---

## 🚀 1. Backend (siempre primero)

```bash
cd backend
npm install
npm run dev
```

**Esperá a ver:**
```
Servidor iniciado en puerto 3001
```

**Verificá que funciona:**
```
http://localhost:3001/health
→ {"status":"ok","database":"connected",...}
```

---

## 🌐 2. Web (opcional, navegador)

En otra terminal:
```bash
cd web
npm install
npm run dev        # http://localhost:5173
```

Registrate (el backend crea usuarios **CLIENT**; los VET de la demo se crean directo en la BD o con una cuenta existente) y probá login + dashboard por rol.

---

## 📱 3. Mobile (Expo) — la app se ve en el celular

### 3.1 Preparar el celu

1. Instalá **Expo Go** de Play Store en tu celular
2. Dos opciones de red:
   - **Misma red WiFi** que la compu (modo LAN)
   - **USB + depuración USB** (recomendado en oficina, ver `CONEXION_SIN_RED_CORPORATIVA.md`): act tip "Depuración USB" en Opciones de desarrollador y conectá el cable

### 3.2 Iniciar

El comando principal es `npm start` (corre `start.ps1`, que detecta USB/IP, configura el backend y genera el QR en el Escritorio):

```bash
cd mobile
npm install
npm start
```

Flags útiles de `start.ps1`: `-ADB` (fuerza modo USB/`--localhost`), `-Tunnel` (ngrok), `-Fast` (agrega `--no-dev --minify`, bundle más rápido para demo).
Para Expo puro sin script: `npm run start:metro`.

Escaneá el QR que quedó en el **Escritorio** (o en la terminal) con **Expo Go**.

### 3.3 Verificar conexión

Cuando la app cargue en el celu:
1. **Registrate** (completá nombre, email y contraseña — el backend fija el rol CLIENT)
2. **Iniciá sesión** con el mismo email y contraseña
3. Si ves el home → **todo funciona**

---

## 🔄 Flujo completo (3 terminales)

```
┌─ Terminal 1 ──────────────────────────────┐
│ cd backend && npm run dev                  │
│ → Backend en http://localhost:3001         │
└────────────────────────────────────────────┘

┌─ Terminal 2 ──────────────────────────────┐
│ cd mobile && npm start                     │
│ → QR en el Escritorio, escanealo con Expo  │
└────────────────────────────────────────────┘

┌─ Terminal 3 (opcional) ───────────────────┐
│ cd web && npm run dev                      │
│ → Web en http://localhost:5173             │
└────────────────────────────────────────────┘
```

---

## ⚠️ Problemas comunes

| Síntoma | Causa | Solución |
|---------|-------|----------|
| Pantalla blanca en mobile | Expo Go no puede cargar el bundle | `npm run start:metro -- --clear` |
| "Network request failed" | Mobile no llega al backend | Verificar que backend esté corriendo y usar `-ADB` si el celu no ve la LAN |
| "Port 3001 already in use" | Otro proceso ocupando el puerto | `netstat -ano \| findstr 3001` y matar el PID |
| Expo no muestra QR | Metro/Expo atascado | `start.ps1 -Tunnel` o `-ADB` |
| CORS error en web | Backend no acepta el origen | Verificar `CORS_ORIGIN` en `backend/.env` |
| El QR no se ve en la terminal | Puerto 8081 ocupado | El QR del script se guarda en el Escritorio; o liberar 8081 |

---

## 📁 Puertos usados

| Servicio | Puerto | URL |
|----------|--------|-----|
| Backend (Express) | 3001 | http://localhost:3001 |
| Frontend Web (Vite) | 5173 | http://localhost:5173 |
| Mobile (Expo/Metro) | 8081 | http://localhost:8081 |
| Health Check | 3001 | http://localhost:3001/health |
