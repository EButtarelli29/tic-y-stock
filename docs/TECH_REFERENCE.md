# VetConnect — Referencia Técnica Completa

> Documento definitivo del proyecto. Explica cada archivo, cada carpeta, y cómo funciona todo.
> **Última actualización:** 14 de agosto, 2026 (v6 — post auditorías P0→P3; correcciones de seguridad, concurrencia y a11y aplicadas)

---

## Índice

1. [Arquitectura general](#1-arquitectura-general)
2. [Backend (`backend/`)](#2-backend)
3. [Frontend Web (`web/`)](#3-frontend-web)
4. [Mobile (`mobile/`)](#4-mobile)
5. [Documentación (`docs/`)](#5-documentación)
6. [Flujo de datos: registro → consulta](#6-flujo-de-datos)
7. [Cómo agregar un endpoint nuevo](#7-cómo-agregar-un-endpoint-nuevo)

---

## 1. Arquitectura general

```
┌─────────────────────────────────────────────────────────┐
│                    Cliente Mobile                        │
│              (React Native / Expo)                       │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP REST + WebSocket (Socket.io)
┌────────────────────▼────────────────────────────────────┐
│                   Backend API                            │
│        Express 5 · TypeScript · Prisma 6 · JWT           │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │   Auth   │ │  Users   │ │   Pets   │ │ Consult  │   │
│  │ Module   │ │ Module   │ │ Module   │ │ Module   │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Shared Middlewares                    │   │
│  │  authenticate · authorize · error handler         │   │
│  │  rate-limit · helmet · CORS · graceful shutdown   │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │ Prisma ORM
┌────────────────────▼────────────────────────────────────┐
│              PostgreSQL (Supabase)                       │
│  Tablas: users · pets · consultations · messages         │
└─────────────────────────────────────────────────────────┘
         ▲
         │ HTTP REST
┌────────┴────────────┐
│   Frontend Web       │
│ (React + Vite + T.) │
└─────────────────────┘
```

### Stack completo

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Runtime | Node.js | ≥ 18 |
| Lenguaje | TypeScript | 5.x |
| Backend framework | Express | 5.x |
| ORM | Prisma | 6.x |
| Base de datos | PostgreSQL via Supabase | 15 |
| Autenticación | JWT + refresh tokens | — |
| Validación | Zod | 4.x |
| Testing | Jest + ts-jest + supertest | — |
| Chat | Socket.io | 4.x |
| Frontend web | React + Vite + TailwindCSS | React 19, Vite 8 |
| Mobile | React Native + Expo | SDK 54 (RN 0.81) |
| Deploy backend | Railway (CI/CD GitHub Actions) | — |
| Deploy web | Vercel | — |

---

## 2. Backend (`backend/`)

### Estructura

```
backend/
├── prisma/
│   ├── schema.prisma          # Modelos: User, Pet, Consultation, Message, Prescription, Attachment, PushToken, Notification
│   └── migrations/            # Alineadas al schema desde S13 (sprint13_align + session_revocation)
├── src/
│   ├── server.ts              # Entry point
│   ├── modules/
│   │   ├── auth/              # Registro (rol siempre CLIENT), login, JWT, refresh, logout (revoca sesiones)
│   │   ├── users/             # Perfil, disponibilidad online/offline, listar vets
│   │   ├── pets/              # CRUD mascotas con soft delete + vet card
│   │   ├── consultations/     # Consultas + cola de espera + Chat (Socket.io)
│   │   ├── media/             # Upload de imagen (multer) → carpeta uploads/
│   │   └── notifications/     # Notificaciones push (Expo) + bandeja in-app
│   ├── shared/
│   │   ├── prisma.ts          # Singleton PrismaClient
│   │   ├── cache.ts           # node-cache (vets disponibles, paginación)
│   │   ├── middlewares/
│   │   │   └── auth.middleware.ts  # authenticate() (valida tokenVersion) + authorize(roles)
│   │   └── types/index.ts     # JwtPayload, ApiResponse (re-export de packages/shared)
│   └── __tests__/             # 159 tests (auth, pets, consultations, users, media, notifications, calls, cache, app, utils)
├── .env                       # ⚠️ NO versionado (gitignored); copiar .env.example
└── package.json               # postinstall: prisma generate
```

### Modelos (Prisma)

| Modelo | Campos clave |
|--------|-------------|
| `User` | id, email (único), password (hash), firstName, lastName, phone, role (CLIENT/VET/ADMIN), isOnline, **tokenVersion** (revocación de sesiones), lastSeen, isEmailVerified, emailVerifyToken, emailVerifyExpires, passwordResetToken, passwordResetExpires |
| `Pet` | id, name, species, breed, age, weight, weightKg, sex, birthDate, allergies, chronicConditions, microchip, ownerId, photoUrl, deletedAt (soft delete), isDeceased |
| `Consultation` | id, clientId, vetId (nullable), petId, status (WAITING/ACTIVE/COMPLETED/CANCELLED), notes, startedAt, endedAt |
| `Message` | id, consultationId, senderId, content, **attachmentUrl**, **clientMsgId** (único, dedup), createdAt |
| `Prescription` | id, consultationId, vetId, content, createdAt |
| `Attachment` | id, uploaderId, url (/uploads/…), mimeType, size, createdAt |
| `PushToken` | id, userId, token (único), platform, createdAt |
| `Notification` | id, userId, type, title, body, data (Json), readAt, createdAt |
| `Review` | id, consultationId (único), clientId, vetId, rating (1–10), comment, createdAt |
| `FavoriteVet` | id, clientId, vetId, createdAt |

> ✅ **Migraciones alineadas al schema** (resuelto en S13): la migración correctiva `20260810000000_sprint13_align` re-agrega `isOnline`, crea `messages`/`prescriptions`/`attachments`/`push_tokens`/`notifications`, hace `vetId` nullable y agrega el enum `CANCELLED`; `20260812000000_session_revocation` agrega `tokenVersion`. `prisma migrate deploy` ya replica el schema en prod.

### Endpoints (reales al 11-Ago)

| Recurso | Métodos | Auth |
|---------|---------|------|
| `/api/auth/register` | POST | No |
| `/api/auth/login` | POST | No |
| `/api/auth/refresh` | POST | No |
| `/api/auth/logout` | POST | Sí |
| `/api/auth/me` | GET | Sí |
| `/api/auth/forgot-password` | POST | No |
| `/api/auth/reset-password` | POST | No |
| `/api/auth/verify-email` | GET | No |
| `/api/users/me` | GET, PATCH | Sí |
| `/api/users/me/availability` | PATCH | VET/ADMIN | Toggle online/offline (dispara auto-asignación de cola) |
| `/api/users/favorites` | GET | Sí |
| `/api/users/vets/:id/favorite` | POST, DELETE | Sí |
| `/api/users/vets` | GET | Sí |
| `/api/pets` | GET, POST | Sí |
| `/api/pets/managed` | GET | Sí |
| `/api/pets/:id` | GET, PUT, PATCH, DELETE | Sí (ownership) |
| `/api/pets/:id/vetcard` | GET | Sí (VET) |
| `/api/pets/:id/restore` | POST | Sí |
| `/api/consultations` | POST | CLIENT |
| `/api/consultations/mine` `, /my-history` | GET | Sí |
| `/api/consultations/vets?species=` | GET | Sí |
| `/api/consultations/:id` | GET | Sí (participante) |
| `/api/consultations/:id/assign` | PATCH | VET/ADMIN |
| `/api/consultations/:id/complete` | PATCH | VET/ADMIN |
| `/api/consultations/:id/messages` | GET, POST | Sí (participante) |
| `/api/consultations/:id/prescriptions` | GET (part.), POST (VET) | Sí |
| `/api/consultations/:id/rating` | POST | CLIENT (dueño de la consulta) |
| `/api/media` | POST (multipart `file`) | Sí | Estático `GET /uploads/:file` (requiere auth)
| `/api/notifications` | GET | Sí | `{ items, unreadCount }`
| `/api/notifications/token` | POST, DELETE | Sí | `{ token, platform }`
| `/api/notifications/:id/read` | PATCH | Sí | Marca leída
| `/api/calls/:id/token` | POST | Sí (participante) | Mint de token **LiveKit** para la videollamada de la consulta `:id` (app móvil) |
| `/api/users/admin/users` | POST | ADMIN | Crea usuarios `VET`/`ADMIN` (el registro público `/register` solo crea `CLIENT`)
| `/api/users/admin-only` | GET | ADMIN | Debug: devuelve el payload del JWT del usuario (no exponer en prod)

> ⚠️ `/auth/me` existe en `auth.routes` y `GET /api/users/me` en `users.routes`; `PATCH /api/users/me` es el toggle online/offline (`{ isOnline }`) que dispara la auto-asignación de la cola.
> ⚠️ `/api/auth/logout` ahora **revoca la sesión**: incrementa `tokenVersion` y todos los JWT emitidos antes quedan invalidados (access 7d y refresh 30d).
> ⚠️ `POST /api/consultations/:id/messages` y `message:send` (socket) solo aceptan mensajes en consultas `ACTIVE`; en `WAITING` devuelven 409 (`ConflictError`).
> ⚠️ `completeConsultation` es **atómico** (`updateMany` status + calificación) para evitar condiciones de carrera; `createReview` devuelve 409 si ya existe la calificación (`P2022`/`P2002`).
> ⚠️ Dedup de mensajes: `Message.clientMsgId` es único; reenvíos (gateway socket y `POST /messages`) devuelven 200 con el mensaje existente en lugar de duplicar.
> ⚠️ `/api/media` tiene cuota diaria por usuario (429 al superarla) y solo admite imágenes/videos; los archivos se guardan en `/uploads` del contenedor (efímero en PaaS).

### Media (imágenes) y Notificaciones push (S12)
- `POST /api/media` solo imágenes (jpeg/png/webp/gif, máx 5 MB); responde 201 `{ id, url: /uploads/…, mimeType, size }`. Los archivos se sirven desde `GET /uploads/*` (estático, gitignoreado).
- `Message.attachmentUrl` DEBE empezar con `/uploads/`; el mensaje puede tener `content` vacío si trae imagen.
- Tipos de evento (push + bandeja): `consultation_new`, `consultation_assigned`, `consultation_completed`, `message`, `prescription_new`.
- Push por API de Expo (best-effort); `EXPO_PUSH_DISABLED=true` desactiva el envío real (usado en tests).

> ⚠️ **`packages/shared` no se adoptó:** el paquete npm workspaces existe pero **web y mobile no lo importan** (0 imports reales). Los tipos (`ApiResponse`, `JwtPayload`) se redefinen localmente. ADR-008 sigue pendiente de aplicar.

### Sincronización de la base de datos en desarrollo

- El desarrollo usa `npx prisma db push` para dejar la BD idéntica al `schema.prisma` (sin versionar estructura). Si el backend arranca con `P2022: column does not exist`, ejecutá `npx prisma db push` en `backend/`.
- Para producción se generan migraciones versionadas: `npx prisma migrate dev --name <cambio>` y el arranque aplica `prisma migrate deploy` (`npm start`).

### Tests
**159 tests** en 10 archivos (`app, auth, cache, calls, consultations, media, notifications, pets, users, utils`) con Jest + supertest. Usan schema `test_` dinámico en Supabase. **No hay tests de WebSocket, authz negativa, ni concurrencia.**

---

## 3. Frontend Web (`web/`)

### Estructura

```
web/src/
├── components/
│   ├── ui/: Button, input, Card, Badge, Logo
│   ├── ProtectedRoute.tsx
│   └── dashboard/
│       ├── HomeSection.tsx, PetsSection.tsx, ConsultationsSection.tsx
│       ├── HistorySection.tsx, MessagesSection.tsx, ProfileSection.tsx
│       └── vet/
│           ├── VetHomeSection.tsx, PatientsSection.tsx
│           └── VetMessagesSection.tsx  (chat + cerrar consulta)
├── pages/
│   ├── LandingPage.tsx, LoginPage.tsx, RegisterPage.tsx
│   ├── DashboardPage.tsx      (cliente: 6 secciones)
│   └── VetDashboardPage.tsx   (vet: 3 secciones)
├── context/AuthContext.tsx
├── services/api.ts, endpoints.ts
├── types/index.ts
└── index.css
```

### Rutas

| Ruta | Página | Protegida |
|------|--------|-----------|
| `/` | LandingPage | No |
| `/login` | LoginPage | No |
| `/register` | RegisterPage | No |
| `/dashboard` | DashboardPage (cliente) | Sí (rol CLIENT) |
| `/vet-dashboard` | VetDashboardPage | Sí (rol VET/ADMIN) |

### Dashboard Vet (MVP)
Solo 3 secciones: Dashboard (home), Pacientes, Mensajes (con cerrar consulta).

### Dashboard Cliente (MVP)
6 secciones: Inicio, Mascotas, Consultas, Historial, Mensajes, Perfil.

---

## 4. Mobile (`mobile/`)

### Estructura

```
mobile/app/
├── _layout.tsx            # Root: providers + auth guard
├── (auth)/                # Login + Register
│   ├── login.tsx
│   └── register.tsx
└── (app)/                 # App con tabs
    ├── _layout.tsx        # Tabs: Inicio, Mascotas, Consultas, Chat, Perfil
    ├── index.tsx          # Home
    ├── pets/              # CRUD: list, detail, new
    ├── chat/              # Chat con veterinario
    ├── queue/             # Solicitar consulta
    └── history/           # Historial + valoración
```

### Estado
Funcional para MVP + Sprint 11 + Sprint 12:
- Auth con secure storage (expo-secure-store)
- CRUD mascotas con foto (Cloudinary)
- Chat con veterinario (polling 5s si el socket cae, Socket.io en vivo)
- Cola de espera: la consulta WAITING se asigna sola cuando un vet se pone online
- Sprint 12: enviar **imágenes** desde la galería (expo-image-picker → `POST /api/media` → mensaje con `attachmentUrl`), mostrar imágenes en burbujas, feedback de estado correcto en espera ("En cola de espera") y registro de **push token** (expo-notifications → `POST /api/notifications/token`)
- Historial con rating post-consulta
- Inicio de la app: `npm start` (o `npm run start:metro` para Expo puro); `start.ps1` con flags `-ADB`, `-Tunnel`, `-Fast`

> ⚠️ Conocidos (v5): `logout()` no desconecta el socket (M4), `petId` enviado a queue pero no leído (M5), `eas.json` producción apunta a localhost (M7). Ver `CODE_AUDIT.md`.

### Design System
Misma paleta teal que la web. Componentes UI compartidos en `src/components/ui/`.

---

## 5. Documentación (`docs/`)

| Archivo | Propósito |
|---------|-----------|
| `SPRINT_PLAN.md` | Plan maestro con timeline, sprints, tareas |
| `MVP_SCOPE.md` | Definición de alcance MVP |
| `TECH_REFERENCE.md` | **Este archivo** — referencia técnica completa |
| `DECISIONS.md` | 11 ADR (decisiones de arquitectura) |
| `FAANG_AUDIT.md` | Auditoría técnica (score actual: 6.7/10 v4) |
| `CODE_AUDIT.md` | **Auditoría completa 5-Ago + resoluciones (S9/S12/S13/11-Ago)** de las 3 capas |
| `RUN_GUIDE.md` | Guía para correr el proyecto local |
| `DEPLOY.md` | Instrucciones de deploy a Railway (backend) / Vercel / EAS |
| `CHANNEL_DECISION.md` | Estrategia web + mobile por rol |
| `STANDUP_GUIDE.md` | Reglas de daily standup |
| `HOTFIX_PROTOCOL.md` | Protocolo de bugs post-MVP |
| `CONEXION_SIN_RED_CORPORATIVA.md` | Conexión mobile por ADB/USB/tunnel sin WiFi corporativa |

---

## 6. Flujo de datos: registro → consulta

```
CLIENTE (Mobile)           BACKEND                        MÉDICO (Web)
      │                        │                              │
      ├─ POST /auth/register ──┤                              │
      │   { email, pass }      │                              │
      │◄─ 201 { user, token }  │                              │
      │                        │                              │
      ├─ POST /pets ───────────┤                              │
      │   { name, species }    │                              │
      │◄─ 201 { pet }          │                              │
      │                        │                              │
      ├─ POST /consultations ──┤                              │
      │   { petId, reason }    │                              │
      │◄─ 201 { consultation } │                              │
      │                        │                              │
      │                        │  ── GET /consultations/mine ─┤
      │                        │  ◄── [{ consultation }] ────┤
      │                        │                              │
      ├── Socket.io chat ──────┤◄───── Socket.io chat ───────┤
      │   messages real-time   │                              │
      │                        │                              │
      │                        │  ── PATCH /consultations ───┤
      │                        │  /:id/complete { notes }     │
      │                        │                              │
      ├─ GET /consultations ───┤                              │
      │   /my-history          │                              │
      │◄── [historial] ────────┤                              │
```

---

## 7. Cómo agregar un endpoint nuevo

### Backend
```typescript
// 1. Service
export async function listX() { return prisma.x.findMany(); }
// 2. Controller
export async function listXController(req: Request, res: Response) {
  const data = await listX();
  res.json({ success: true, data });
}
// 3. Routes
router.get('/', authenticate, listXController);
// 4. Barrel export
export { router as xRoutes };
// 5. Montar en server.ts
app.use('/api/x', xRoutes);
```

### Frontend Web
```typescript
import api from './api';
export async function getX() {
  const res = await api.get('/api/x');
  return res.data.data;
}
```

### Mobile
```typescript
import api from '../lib/api';
export async function getX() {
  const res = await api.get('/api/x');
  return res.data;
}
```
