# Code Audit — VetConnect (5 de Agosto, 2026)

> Auditoría completa de las 3 capas: **backend** (Express/Prisma), **web** (React+Vite) y **mobile** (Expo/RN).
> Corresponde a Sprint 11 y es la referencia de la sección "Auditoría v4" de `FAANG_AUDIT.md`.

> [!NOTE]
> **Estado 14-ago-2026:** los hallazgos **P0 → P3** de esta auditoría fueron resueltos y commiteados
> (commit `36d76f0`). Incluye: registro solo CLIENT, hash `password` en `getUserById`, revocación de
> sesiones por `tokenVersion`, servir `/uploads` tras auth, bloqueo de rutas admin con `authorize()`,
> concurrencia en `completeConsultation`/`createReview`, dedup de mensajes (`clientMsgId`), cuota de
> media, y correcciones UX/a11y de web y mobile. **Pendiente (fuera de P3):** rotar secretos y purgar
> git (P0 de borde), video LiveKit end-to-end, tests WS/authz/concurrencia, y observabilidad. Ver
> `README.md` (Estado y limitaciones conocidas).

---

## Metodología

- Revisión del 100% de `backend/src/**`, `web/src/**`, `mobile/src/**`, configs, Prisma schema/migraciones, `.env` y git.
- Cruce de **todos los endpoints, shapes y eventos de socket** de cada front contra el backend real.
- Verificación estática: `tsc --noEmit` (backend), `tsc -b` + `eslint` (web), `npm run typecheck` + `npm run lint` (mobile).
- Severidad usada: **CRITICO** (explotable / rompe prod) · **ALTO** (funcionalidad rota o mayor bug) · **MEDIO** · **BAJO**.

---

## Resumen ejecutivo

| Capa | CRITICO | ALTO | MEDIO | BAJO | Totales |
|------|--------:|-----:|------:|-----:|--------:|
| Backend | 5 | 2 | 7 | 5 | **19** |
| Web | 2 | 4 | 6 | 6 | **18** |
| Mobile | 1 | 7 | 8 | 4 | **20** |

**Hallazgos transversales (los 3 más importantes del proyecto):**
1. `.env` de backend/web/mobile **commiteados en git** (backend trae credenciales reales de Supabase). El `.gitignore` es inefectivo para archivos ya trackeados. → Rotar credenciales + purgar historial.
2. **Registro con rol arbitrario**: el request manda `role` y el backend lo acepta → cualquiera se registra como `ADMIN`/`VET`.
3. **Los includes de Prisma exponen el hash de `password`** en respuestas de consultas y vetcard.

---

## Backend

### CRITICO

| # | Severidad | Archivo:línea | Descripción |
|---|-----------|---------------|-------------|
| B1 | CRITICO | `.env` (git) | `backend/.env` con `DATABASE_URL`/`DIRECT_URL` reales de Supabase y `JWT_SECRET` place holder trackados (los 3 `.env` en `git ls-files`). Con el secret actual se forjan JWTs de cualquier rol. |
| B2 | CRITICO | `auth/auth.controller.ts:10`, `auth/auth.service.ts:50` | El cliente manda `role` en `/register` (`role: z.enum(...).optional()`, `role: input.role ?? 'CLIENT'`). **Escalada a ADMIN/VET**. |
| B3 | CRITICO | `consultations.service.ts:44,62,86,110` | `include: { client, vet }` arrastra la columna `password` (hash) en las respuestas. |
| B4 | CRITICO | `pets.service.ts:136` | `to_jsonb(u)` en el raw SQL de `getPetVetCard` incluye también `password` del dueño. |
| B5 | CRITICO | `prisma/migrations` vs `schema.prisma` | Migraciones misaliadas: `init` deja `vetId NOT NULL` (schema: `String?`), `2_cleanup` hace `DROP COLUMN isOnline` (schema lo usa), init no crea `messages`/`prescriptions`/`CANCELLED`. `prisma migrate deploy` en prod ≠ schema → rompe. Dev funciona solo porque usa `db push`. |

### 2. ALTO

| # | Severidad | Archivo:línea | Descripción |
|---|-----------|----------------|-------------|
| B6 | ALTO | `consultations.service.ts:30-33` | IDOR: `createConsultation` no verifica que `pet.ownerId === clientId`. Un CLIENT crea/ve consultas sobre mascotas ajenas. |
| B7 | ALTO | `consultations.routes.ts:20-21`, `service:124-126` | `/my-history` usa el mismo handler que `/mine`; para VET el listado filtra la cola global `WAITING` → `/my-history muestra consultas **de otros clientes` en espera. |
| B8 | ALTO | `consultations.service.ts:71-88` | `assignNextPendingVet`: si el claim atómico falla por carrera (`claimed.count === 0`) devuelve `null` sin reintentar la siguiente consulta de la cola; el vet no re-encola hasta su próximo toggle de disponibilidad. |

### 3. MEDIO

| # | Archivo:línea | Descripción |
|---|----------------|-------------|
| B9 | `auth.service.ts:29` | `logout` no revocaba ningún token (solo limpiaba caché) → access 7d y refresh 30d seguían válidos. **Fix (11-Ago): `tokenVersion` en User; logout lo incrementa, middleware y `/refresh` rechazan tokens viejos.** |
| B10 | `pets.service.ts:53,92` + `pets.controller.ts:22,35` | `birthDate` con `z.string()` sin validar → `new Date('asdf')` ⇒ 500. (Fix S9 ✅) |
| B11 | `consultations.service.ts:54-64,218-231` | `findFirstAvailableVet` cacheaba 30s un vet y lo re-servía a varios clientes; podía devolver vet recién offline. (Fix 11-Ago ✅ pick fresco). Mapeo real especialidad→especie: requiere columna nueva (decisión de producto). |
| B12 | `consultations.service.ts:268-273` | `getMessages` sin paginación/límite. (Fix S13 ✅ paginado, tope 500 por request). |
| B13 | `app.ts:96-100` | Error handler: en `production` devuelve mensaje genérico; en dev expone `err.message` (comportamiento intencional). |
| B14 | `chat.gateway.ts:66-95` + service `sendMessage` | `message:send` no valida `status` de la consulta. (Fix S9 ✅ 409/socket solo `ACTIVE`). |

### 4. BAJO

| Archivo:línea | Descripción |
|----------------|-------------|
| `modules/auth|users|pets/index.ts` | Barrel exports sin uso (app importa `*.routes` directo). |
| `shared/utils/index.ts:7-15` | `excludePassword`/`asyncHandler` solo usados por tests. |
| `users.controller.ts:89`, `pets.controller.ts:65` | Parseo de paginación duplicado (existe `parsePagination`). |
| Controllers | `console.error` en vez de `logger` estructurado. |
| `users.controller.ts:48` | `adminOnlyController` devuelve el payload del JWT al cliente. |

---

## Web

### 1. CRITICO

| # | Archivo:línea | Descripción |
|---|----------------|-------------|
| W1 | `web/.env` (git) + `backend/.env` | `.env` commiteados con credenciales (ver hallazgo B1). |

### 2. ALTO

| # | Archivo:línea | Descripción |
|---|----------------|-------------|
| W2 | `src/**` (ninguno) | **No hay botón online/offline de médico (Sprint 11 Damián).** El backend lo requiere (`PATCH /users/me/availability`) y toda la cola real-time depende de `isOnline`. Desde la web ninguna consulta se autoasigna: queda `WAITING` hasta que un vet clic "Tomar consulta" manualmente. |
| W3 | `src/services/socket.ts:10` | `io(window.location.origin)`: el proxy dev solo cubre `/api` (`vite.config.ts:8`) → `/socket.io` en dev golpea a Vite → `connect_error`. Degradado a polling. |
| W4 | `src/context/AuthContext.tsx:57-65` | Si `getMe()` falla, `parseUserFromToken()` sobre JWT **sin verificar firma** y marca autenticado → token vencido/corrupto entra al dashboard. |
| W5 | `src/services/api.ts:10` | JWT en `localStorage`; no hay refresh/rotación (el backend tiene `/auth/refresh`). |

### 3. MEDIO

| # | Archivo:línea | Descripción |
|---|----------------|-------------|
| W6 | `src/services/api.ts:22-24` | El interceptor responde a **cualquier** 401 redirigiendo a `/login`; el 401 del propio login (credenciales mal) recarga la página y se pierde el mensaje de error. |
| W7 | `PetsSection.tsx:56` | Campo `peso` texto ("Ej: 10 kg") vs backend `weight: z.coerce.number().positive()` → 400 con unidad. |
| W8 | `ConsultationsSection.tsx:55` | Exige al usuario "mínimo 5 caracteres" pero solo chequea vacío; de 1 a 4 chars → 400 genérico (el backend valida `notes.min(5)`). |
| W9 | `MessagesSection.tsx:445`, `VetMessagesSection` | No se llama `leaveConsultation()` al cambiar de sala → los rooms se acumulan en el socket. |
| W10 | Listas "Tus consultas" y stats del home | No se refrescan en tiempo real (sin socket ni polling). |
| W11 | `HistorySection.tsx:18-22` | N+1: un `getPrescriptions()` por consulta completada. |
| W12 | `MessagesSection`/`VetMessagesSection` | Polling duplicado: dos intervalos (fetchCons + fetchMsgs) encuestan lo mismo c/10s; sin `AbortController`. |

### 4. BAJO

| # | Archivo:línea | Descripción |
|---|----------------|-------------|
| W13 | `VetDashboardPage.tsx:100` | Badge de mensajes **hardcodeado "3"**; `getUnreadBadge` siempre devuelve `null`. |
| W14 | `LoginPage.tsx:97` | Link "¿olvidaste tu contraseña?" = `<a href="#">`. |
| W15 | `endpoints.ts` | `getAllPets` clon de `getMyPets`; `getPetById`/`getConsultationById` usadas pero duplicadas. |
| W16 | Types (`Pet.nextVet`/`lastVisit`, `Message.status`) | Tipos con campos que no existen en el backend; los mensajes se inyectan con `as any`. |
| W17 | Código muerto | `useRedirectByRole.ts`, `getSocket`/`disconnectSocket`, `constants/colors.ts` (vacío), `App.css` (vacío). |
| W18 | `package.json` | `livekit-client` + `@livekit/components-react` sin uso. |
| W19 | eslint | 18 errores (`react-hooks/set-state-in-effect` ×5, refs en render, `no-explicit-any` ×4). |

---

## Mobile

### 1. CRITICO

| # | Archivo:línea | Descripción |
|---|----------------|-------------|
| M1 | `.env`/git | Mismo hallazgo B1 transversal. |

### 2. ALTO

| # | Archivo:línea | Descripción |
|---|----------------|-------------|
| M2 | `app/(app)/chat/[consultationId].tsx:93-96,143,206,210` | **Sprint 11 (Juan):** una consulta `WAITING` muestra dot gris + etiqueta **"Finalizada"**, "Esta consulta ya fue finalizada", "Chat finalizado" y input deshabilitado. **No hay feedback de espera** (spinner, posición en cola, mensaje correcto). |
| M3 | `app/(app)/chat/index.tsx:17-19` | Filtra las `WAITING` de la lista: la consulta recién creada **desaparece del tab Chat**. |
| M4 | `src/stores/authStore.ts:75-85` | `logout()` nunca llama `disconnectSocket()` → el socket con el token viejo sigue recibiendo eventos de la cuenta anterior. `disconnectSocket` existe pero no se usa. |
| M5 | `app/(app)/pets/[id].tsx:152` | Envía `petId` a `queue` pero `queue/index.tsx` **no** lo lee (`useLocalSearchParams`) → la mascota no se preselecciona. |
| M6 | `src/lib/socket.ts:11` + `start.ps1:137` y `eas.json` + `.env` | **Path fantasma `/ws/queue`**: `WS_URL` apunta ahí, pero `socket.ts` conecta a `API_URL` (`/socket.io`), `EXPO_PUBLIC_WS_URL` no se lee en ningún lado, y el backend monta en root. Si alguien "arregla" socket.ts para usar WS_URL rompe la conexión. |
| M7 | `eas.json:22-28`, `app.json` (sin `usesCleartextTraffic`) | Perfiles `preview` y `production` apuntan a `http://localhost:3001` (no llegan al backend) y Android 9+ bloquea cleartext HTTP. `eas.projectId` vacío (`app.json`) → builds fallan. |
| M8 | `src/types/index.ts` vs `web/src/types` vs `packages/shared` | Tipos duplicados e incompatibles (`Pet` con `weightKg/birthDate` vs `weight/age`; `User.isOnline` solo en shared; `packages/shared` nadie lo importa). |

### 3. MEDIO

| # | Archivo:línea | Descripción |
|---|----------------|-------------|
| M9 | `src/lib/socket.ts:11-13` | JWT en handshake de Socket.IO por `ws://` sin TLS en IP LAN. |
| M10 | `src/hooks/useConsultations.ts:58` | Polling 5 s se activa solo si `socketConnected=false` **al montar**; si el socket cae a mitad de chat nunca vuelve a `false` → chat congelado. |
| M11 | `useConsultations.ts:79-86` | Dedup de mensajes optimistas: con 2+ pendientes, un mensaje entrante se appendea → duplicados. |
| M12 | `useConsultations.ts:32` | `refetchInterval: 15_000` (recetas) + 5_000 (mensajes) en loop por pantalla abierta. |
| M13 | `src/lib/secure-storage.ts:24-26` | En web, JWT + refresh a `localStorage` (XSS). |
| M14 | `useAuth.ts:13` | `useAuthStore()` sin selector → cualquier cambio re-renderiza todos los consumidores. |
| M15 | `authStore.ts:27-37` | `hydrate` exige `token && user` cacheado; nunca valida con `/auth/me`. |
| M16 | `chat/[consultationId].tsx:157-196` | `ListHeaderComponent` inline por render + `.map` de recetas → re-render de FlatList. |

### 4. BAJO

| # | Archivo:línea | Descripción |
|---|----------------|-------------|
| M17 | `pets/index.tsx:64` | `onPress` inline rompe el `memo` de `PetCard` (en `(app)/index.tsx:21` sí usa `useCallback`). |
| M18 | `queue/index.tsx:107` | `autoFocus` abre el teclado al entrar. |
| M19 | Código muerto | `useChat.ts`, `Modal`/`IconButton` (ui), `usePet`/`petsService.getById`, `authService.me`, `disconnectSocket`/`getSocket`, `format*`/`statusLabel`/`statusColors`, schemas `paginationSchema`/`apiResponseSchema`/`authResponseSchema`. |
| M20 | Deps pesadas sin uso | `livekit-client`, `@livekit/react-native*`, `react-native-webrtc`, `expo-av`, `expo-camera`, `netinfo`, `expo-permissions`, `url-polyfill`, `ajv`. |
| M21 | Lint | 33 warnings (imports sin uso). app sin tests unitarios. |
| M22 | `secure-storage.ts:13` | Comentario "TTL 15 min" vs 7d/30d reales. |

---

## Ya resuelto en la sesión 5-Ago (para no re-aparecer)

- ✅ **Sprint 11 backend (Tobías)**: `assignNextPendingVet` (auto-asignación de la consulta WAITING más antigua al ponerse online), eventos `vet:availability` + `consultation:updated`, test de integración → **94/94 tests pasan**, `tsc` limpio. Commit `1bc6d16`.
- ✅ **Prisma Client regenerado** (faltaba el modelo `Prescription` en la clase generada → 500 en runtime).
- ✅ **`mobile/src/lib/env.ts`**: `WS_URL` ya no apunta a `/ws/queue`.

## Ya resuelto en Sprint 12 (6-Ago, para no re-aparecer)

- ✅ **Imágenes: backend completo (Tobías, `a936685`)** — `POST /api/media` (multer, 5 MB, jpeg/png/webp/gif → `/uploads/*`), modelo `Attachment`, `Message.attachmentUrl` validado en service/controller/socket. → **108/108 tests pasan** al cierre del S12, `tsc` limpio.
- ✅ **Notificaciones: backend (Tobías)** — `PushToken`, `Notification`, `POST/DELETE /api/notifications/token`, `GET /api/notifications`, `PATCH /:id/read`; push vía API de Expo (más bandeja in-app, `EXPO_PUSH_DISABLED` en tests). Triggers en create/assign/complete/message/prescription y en auto-asignación (`users.controller`).
- ✅ **Mobile imágenes + push (Juan)** — botón "image-plus" en el chat con expo-image-picker, subida multipart (`FormData`, interceptor de `api.ts` sin `Content-Type` fijo), burbujas con `<Image>`, estados optimistas con `attachmentUrl`, registro de push token (hook `usePushToken`); `expo-notifications` + plugins en `app.json`.
- ✅ **Web: imagen + pulido (Damián)** — burbuja de mensaje renderiza `attachmentUrl`, proxy `/uploads` en `vite.config.ts`, badge móvil "3" hardcodeado (W13) reemplazado por conteo real de consultas en espera, y chip del chat del cliente distingue `WAITING`.
- ✅ **M2 (mobile)**: el estado de espera ya no dice "Finalizada" — muestra "En cola de espera" con dot ámbar y el empty-state explica la cola.
- ✅ **W13 (web)**: el badge rojo del header del médico ya no es 3 fijo.

## Ya resuelto en Sprint 13 (10-Ago, para no re-aparecer)

- ✅ **B2 (CRITICO) — rol fijo en `/register`**: el schema ya no acepta `role` y `auth.service` crea siempre `CLIENT`; intento de registro con `role: ADMIN` → usuario CLIENT (test de regresión agregado).
- ✅ **B3/B4 (CRITICO) — `password` fuera de respuestas**: `consultations.service` usa `consultationSnapshot` (`select` tipado con `Prisma.ConsultationSelect`) en create/assign/nextPending/getById/mine; el `include: { messages: true }` también exponía el password del sender y se reemplazó por `select` público; la vet card (`pets.service getPetVetCard`) arma `owner` con `jsonb_build_object` sin password. Tests de regresión verifican que create/detail/mine/messages no incluyen `password`.
- ✅ **B5(1) (CRITICO) — IDOR de mascota**: `createConsultation` valida `pet.ownerId === clientId` → 403 (test agregado).
- ✅ **B5(2) (CRITICO) — migraciones alineadas**: nueva migración correctiva `20260810000000_sprint13_align` (re-agrega `isOnline`, columnas de users/pets, `vetId` nullable, enum `CANCELLED`, tablas `messages`/`prescriptions`/`attachments`/`push_tokens`/`notifications` + índices/FKs). `prisma migrate deploy` en prod ya replica el schema.
- ✅ **B9 (ALTO) — `/my-history` separado**: nuevo `getConsultationHistory` (VET solo consultas asignadas; nunca la cola global `WAITING` a ajena). `/mine` conserva la cola para el dashboard del médico.
- ✅ **B12 (MEDIO) — `getMessages` acotado**: paginación `?page&limit` con tope 500 por request.
- ✅ **Optimización de queries**: replaces de `include` (traía todos los campos) por `select` con las columnas que los frontends usan; `parsePagination` reutilizado en users/pets controllers (elimina el parseo duplicado).
- ✅ **`.env` fuera de git**: `backend/.env`, `web/.env`, `mobile/.env` des-trackeados (`git rm --cached`) + `.gitignore` ampliado + `.env.example` para las 3 capas.
- ✅ **Rate limit vs polling (Reporte Damián)**: el límite global (100 req/15 min) podía dar 429 con el polling GET c/10s y varias pestañas. Ahora el limiter global **salta GET/HEAD** (max 200 mutaciones/15 min); `/api/auth/login` conserva su límite estricto de 10.
- ✅ **`prisma generate` automático (Reporte Damián)**: `postinstall` en `backend/package.json` regenera el Prisma Client al instalar dependencias → no reaparece el 500 por Client desactualizado.
- ✅ **W6/W7/W9 + input vet (Damián, `a8be548`)**: peso de mascota como número + input `type=number`, 401 del login sin recarga, `leaveConsultation` al cambiar de sala, input del vet bloqueado en `WAITING`, y visor de imágenes. `tsc -b` limpio.

## Ya resuelto en Sprint 9 (backlog Tobias, para no re-aparecer)

- ✅ **B8 (ALTO) — race en `assignNextPendingVet`**: el claim atómico ahora reintenta (hasta 5 intentos) sobre las `WAITING` más antiguas: si un `updateMany` pierde la carrera (`count === 0`) prueba con la siguiente en la cola en vez de devolver `null` (test de dos vets online repartiéndose la cola).
- ✅ **B10 (MEDIO) — `birthDate` validada**: en create/update de mascota pasa por `dateStringSchema` (refine con `Date.parse`) → `birthDate: "asdf"` devuelve 400 y no 500.
- ✅ **B14 (MEDIO) — mensajes solo en `ACTIVE`**: `sendMessage` valida el estado de la consulta y devuelve 409 `ConflictError('La consulta no está activa. No podés enviar mensajes.')`; el socket (`chat.gateway`) también rechaza con evento `error`. Tests de regresión: 409 en `WAITING`, 201 al asignarse un vet.
- **Suite**: **118/118 tests pasan**, `tsc --noEmit` limpio.

## Ya resuelto en sesión 11-Ago (backend Tobias, para no re-aparecer)

- ✅ **B11 (MEDIO) — caché que re-servía el mismo vet**: `findFirstAvailableVet` cacheaba por 30s el vet elegido → en esa ventana TODOS los clientes nuevos recibían el MISMO vet (sobrecarga) y podía devolver un vet recién puesto offline. El pick ahora es **siempre fresco** (sin caché); la lista `GET /consultations/vets` conserva su caché (se invalida al togglear disponibilidad). Nota: el mapeo real de especialidades vet→especie requiere una columna nueva (decisión de producto, no un fix).
- ✅ **Logout ahora revoca sesiones**: se agrega `tokenVersion` a `User` (migración `20260812000000_session_revocation`). Cada login/register firma access (7d) y refresh (30d) con el `tokenVersion` del usuario; `logout` lo incrementa → **todos los JWTs previos quedan inválidos** en middleware y en `/auth/refresh`. Test de regresión: tras logout, `/me` → 401 y `/refresh` con el token viejo → 401.
- **Suite**: **119/119 tests pasan**, `tsc --noEmit` limpio.

## ⚠️ Queda manual para el equipo (no automatizable desde código)

- **Rotar credenciales Supabase** (password de la BD) y **`JWT_SECRET` real** (`openssl rand -hex 32`; hoy es placeholder `change-me-to-a-random-secret` → cualquier persona con acceso al repo puede forjar JWTs).
- **Purgar historial git** de los `.env` (requiere `git filter-repo` y re-clonar todos los miembros).
- El resto de deuda técnica (tipos en `packages/shared`, código muerto, deps LiveKit/AV) queda asignada al bloque del equipo.

---

## Top 10 priorizado global (por dueño)

| # | Nivel | Hallazgo | Dueño |
|---|-------|----------|-------|
| 1 | CRITICO | Rotar credenciales, `.env` fuera de git, crear `.env.example` y purgar historial (`git filter-repo`) | Tobias — ✅ `.env` fuera de git + `.env.example` (S13). Rotación de credenciales + purge de historial: manual |
| 2 | CRITICO | Fijar rol en `/register` (no aceptar `role` del cliente) | ✅ Tobias (S13) |
| 3 | CRITICO | Sacar `password` de todos los `include`/raw SQL de consultas y vet card | ✅ Tobias (S13) |
| 4 | CRITICO | Alinear migraciones con `schema.prisma` (re-agregar `isOnline`, `messages`, `prescriptions`, `vetId` nullable) | ✅ Tobias (S13) |
| 5 | ALTO | Ownership de mascota en `createConsultation` (IDOR) | ✅ Tobias (S13) |
| 6 | ALTO | Toggle online/offline del médico en web (Sprint 11 Damián) | ✅ Damián (6-Ago) + fixes Tobias (`b62909a`) |
| 7 | ALTO | Feedback de espera + no filtrar WAITING en mobile (Sprint 11-12 Juan) | ✅ (S11/S12 Juan) |
| 8 | ALTO | `disconnectSocket()` en logout; leer `petId` en queue | ⏳ Mobile (Juan) |
| 9 | ALTO | Definir `/my-history` separado que no exponga colas ajenas | ✅ Tobias (S13) |
| 10 | ALTO | Unificar `WS_URL` real (quitar el `/ws/queue` fantasma) en mobile + `start.ps1`/`eas.json`/docs y corregir `eas.json` para producción | ⏳ (Damián/Juan)

---

## Plan de acción propuesto

Entre Sprint 12–13 dedicar un bloque de **bugs de auditoría** a la corrección priorizada:

1. **Backend (Tobias)**: tareas 1–5, 9 y 10 del top-10 (rotar credenciales, fijar rol, ocultar password, alinear migraciones, ownership de mascota, `/my-history`, unificar WS).
2. **Web (Damián)**: toggle online/offline del médico y correcciones ALTO/MEDIO de la sección web.
3. **Mobile (Juan)**: feedback de cola, no filtrar WAITING, `disconnectSocket()` en logout, leer `petId` en queue y correcciones MEDIO de la sección mobile.
4. **Deuda técnica**: consolidar tipos en `packages/shared` (eliminar las 3 definiciones divergentes), limpiar código muerto y dependencias LiveKit/AV/cámara sin uso.
5. **QA/PM**: actualizar `INTEGRATION.md` (documenta `/api/queue/*`, IA, LiveKit y refresh por cookie que no existen en el código actual) y re-testear los flujos de cola con el toggle web + feedback mobile.

La tabla de scores v4 con los números de esta auditoría está en `FAANG_AUDIT.md`.

---

## Hallazgos P3 (resueltos el 13-Ago-2026)

Segunda tanda de revisión (bugs de robustez, concurrencia, accesibilidad y hardening de
media/presencia). Cada ítem indica el cambio real y dónde vive.

### Backend
- **P3-1 (completeConsultation atómico):** antes hacía `findUnique` y luego `update`
  (carrera TOCTOU que podía pisar un estado ya finalizado). Ahora usa `updateMany` con
  `WHERE { id, status: 'ACTIVE' }`; si no afectó filas avisa con `ConflictError`.
  `backend/src/modules/consultations/consultations.service.ts`.
- **P3-2 (review duplicado → 500):** `createReview` ya chequeaba existencia, pero dos
  requests concurrentes podían romper el unique y tirar `P2002` → 500. Ahora ese caso
  devuelve `409 ConflictError` claro. Mismo archivo.
- **P3-3 (Pet soft-delete):** `Pet` ya tiene `deletedAt` (borrado lógico). El borrado
  físico desde una mascota con historial está bloqueado por `onDelete: Restrict` en
  `Consultation` → el repo debe usar el borrado lógico, no el físico. Documentado aquí.
- **P3-4 (presencia frágil):** se agregó `User.lastSeen` (columna + migración
  `20260815000000_presence_and_msg_dedup`) y se setea al ponerse online en
  `updateAvailability`. Así el "online" no queda pegado si se cae la conexión.
- **P3-5 (PushToken):** ya resuelto antes — `registerPushToken` usa `upsert` en lugar de
  `insert`, por lo que un token repetido no rompe.
- **P3-6 (dedup de mensajes durable):** `Message.clientMsgId` (columna + unique). El
  gateway ahora descarta echoes con el mismo `clientMsgId` consulta+id (cubre multi-instancia,
  no solo la memoria). El REST acepta `clientMsgId` y el web lo genera por mensaje
  (`endpoints.sendMessage`). El mobile aún no envía mensajes (scaffold sin pantalla de chat).
- **P3-18 (cuota de media):** `saveAttachment` ahora cuenta las subidas de las últimas 24h
  por usuario y rechaza con `429` al superar 30; además re-valida el MIME. No reemplaza un
  antivirus real (ver P3-19). `backend/src/modules/media/media.service.ts`.
- **P3-20 (tests aislados):** el harness de tests ya crea un schema `test_*` dinámico, por
  lo que no golpea la base de producción. Ya resuelto.

### Web
- **P3-7 (`/call` y 404):** `/call` ahora está detrás de `ProtectedRoute` y se agregó una
  ruta `*` que renderiza un 404. `web/src/App.tsx`.
- **P3-8 (a11y de inputs):** `Input` genera siempre un `id` estable (`useId`), marca
  `aria-invalid`/`aria-describedby` y el error usa `role="alert"`. La app no tiene nav con
  estados activos, así que `aria-current`/`aria-pressed` no aplicaban.
- **P3-13 (caché de chat):** `updateCachedConsultation` ya no pierde updates cuando la lista
  está fría (guarda pendientes y los aplica al hidratar). `message:new` siempre cachea el echo
  por consulta, no solo la activa. `web/src/services/chatStore.ts` + `MessagesSection`/`VetMessagesSection`.
- **P3-14 (token y visor de imagen):** `AuthContext.token` ahora refleja el token real en
  memoria (antes siempre `null`, engañoso). `ImageViewer` solo cierra al tocar el fondo, no
  al tocar la imagen.

### Mobile
- **P3-9 (dark mode):** `app.json` pasó de `userInterfaceStyle: "light"` a `"automatic"`.
  Los helpers `rf()`/`fontScale`/`isReducedMotion` citados en la auditoría no existen en este
  repo (no había código de theming reducido).
- **P3-10 (Avatar):** `Avatar` con `name=''` crasheaba (`''[0].toUpperCase()`); ahora usa `'?'`
  cuando el nombre está vacío. `setPendingImage` citado no existe en este scaffold.
- **P3-11 (socket):** `connectSocket` ya no filtra/rega instancias viejas (reusa la del
  singleton y espera la reconexión). Tras un refresh de token se llama `applySocketToken`,
  que actualiza `socket.auth` y reconecta para que el handshake use el token nuevo.
  `mobile/src/lib/socket.ts` + `api.ts`.
- **P3-12 (chat / imágenes):** `ChatBubble` ya no anima cada ítem con `Animated.View`
  (evita jank en `FlatList`); `PetCard` y `Avatar` usan `expo-image` (`AuthImage`) para
  decodificar fuera del hilo de JS y cachear en disco.

### Documentación
- **P3-15 (conteos/provider/dominio/puerto):** CORRECCIÓN — la auditoría integral posterior
  **sí confirmó** estas inconsistencias. Se corrigen en esta pasada:
  - Tests: los docs decían "119/9" y "155/155"; la realidad es **159 tests en 10 archivos**
    (`app, auth, cache, calls, consultations, media, notifications, pets, users, utils`).
  - Provider de deploy: `README` decía Railway, `DEPLOY.md`/`PRODUCTION_DEPLOYMENT.md`
    recomiendan **Koyeb**; ahora `README` apunta a `DEPLOY.md` como fuente única (Koyeb recomendado).
  - Dominio: `vetconnect` (código) vs `conectavet` (docs/nombre) — se mantiene `vetconnect`
    en deep-links/esquema y se aclara en `README`.
  - Puerto: `server.ts` usa `process.env.PORT || 3000` (comúnmente 3001 en dev).
  - `TECH_REFERENCE.md`, `README.md`, `SPRINT_PLAN.md`, `MVP_SCOPE.md` y `FAANG_AUDIT.md`
    fueron actualizados a los valores reales. Ver `docs/TECH_REFERENCE.md` (v6, 14-ago).
- **P3-16 (`/uploads` y CDN):** `/uploads/*` está detrás de auth (Bearer/Session) y **no**
  debe ponerse detrás de un CDN público sin firma; mantener autenticado. Decidido y documentado.
- **P3-17 (ADR-004 / tokenVersion):** no existe un `ADR-004` en el repo. La revocación por
  logout (`tokenVersion` en `User`, incrementado en `logout`) ya está implementada (S11).
- **P3-19 (media en disco efímero):** en producción el disco del contenedor es efímero; se
  recomienda mover los adjuntos a S3 / Cloudinary y servirlos con URL firmada. Pendiente de
 产品决策 (no se implementó en este ciclo).
