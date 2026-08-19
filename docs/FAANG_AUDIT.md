# FAANG Audit — VetConnect

> Evaluación del proyecto contra estándares de ingeniería de FAANG.
> **Fecha:** 6 de agosto, 2026 | **Versión:** v5 — Post Sprint 12 (Imágenes + Notificaciones)
> **Actualización:** 14 de agosto, 2026 | **Versión:** v6 — Post auditorías P0→P3 (ver [`CODE_AUDIT.md`](./CODE_AUDIT.md), commit `36d76f0`).
> Detalle de todos los hallazgos en [`CODE_AUDIT.md`](./CODE_AUDIT.md).

---

## Metodología

| Score | Significado |
|-------|-------------|
| 1-2 | No existe o es inexistente |
| 3-4 | Existe pero incompleto/inseguro |
| 5-6 | Funcional con problemas importantes |
| 7-8 | Sólido, con mejoras menores necesarias |
| 9-10 | Nivel producción FAANG |

---

## 1. Code Quality & Structure — 7/10 (v4: -1)

### ✅ Lo que está bien
- TypeScript strict mode en backend, web y mobile
- Monolito modular bien organizado
- Separación backend/web/mobile en monorepo
- Prisma schema con enums, relaciones, índices
- Singleton de PrismaClient
- Shared middlewares y helpers

### ❌ Lo que falta (v4)
- Código muerto en las 3 capas (barrel exports sin uso, `useChat`, `Modal`/`IconButton`, `getSocket`/`disconnectSocket`, `format*`, schemas sin uso)
- Tipos duplicados e incompatibles: `mobile/src/types` vs `web/src/types` vs `packages/shared` (nadie importa el shared)
- 18 errores eslint en web, 33 warnings en mobile

---

## 2. Security — 4/10 ⬇️ (corregido en v4)

### ✅ Lo que está bien
- JWT con bcrypt (10 rounds)
- Refresh tokens con rotación
- authenticate + authorize middlewares
- CORS configurado, helmet activado
- Rate limiting global + específico login
- Validación Zod en la mayoría de los bodies
- Error de login indistinguible (no enumera usuarios)

### ❌ Hallazgos v4 (CODE_AUDIT.md B1–B7)
- **CRITICO:** `.env` con credenciales reales de Supabase commiteados en git (backend, web y mobile)
- **CRITICO:** `/register` acepta `role` del cliente → escalada a ADMIN/VET
- **CRITICO:** `include: { client, vet }` devuelve el hash de `password` en consultas y vet card
- **ALTO:** IDOR en `createConsultation` (mascota a ajena)
- **ALTO:** JWT en `localStorage` (web) y en handshake de socket por `ws://` (mobile)

---

## 3. Testing — 9/10

### ✅ Lo que está bien
- Suite de **119 tests** en 9 archivos (S11: cola de espera; S12: `media` y `notifications`; S13/11-Ago: seguridad y bugs backend)
- Tests unitarios + integración HTTP
- globalSetup/globalTeardown con schema test_ dinámico
- Coverage configurado con thresholds
- `EXPO_PUSH_DISABLED=true` en tests para no disparar push reales

### ❌ Lo que falta
- Tests escriben a Supabase real (no BD local aislada)
- Sin factories/fixtures
- Mobile sin tests unitarios (33 warnings de lint)

---

## 4. Documentation — 8/10 (v4: -1)

### ✅ Lo que está bien
- README.md raíz completo
- backend/readme.md con API Reference
- 9 ADR en DECISIONS.md
- CODE_AUDIT.md nuevo (auditoría 5-Ago)
- MVP_SCOPE.md con alcance definido
- CHANNEL_DECISION.md, STANDUP_GUIDE.md, HOTFIX_PROTOCOL.md

### ❌ Lo que falta (v4)
- `INTEGRATION.md` documenta endpoints inexistentes (`/api/queue/*`, IA, LiveKit, cookies httpOnly)
- No existen `.env.example` (los `.env` reales están commiteados)
- Sin documentación OpenAPI/Swagger

---

## 5. Architecture & Scalability — 7/10 (v4: -1)

### ✅ Lo que está bien
- Monolito modular
- Separación controller/service/routes
- Singleton de Prisma
- Paginación en endpoints de lista
- Índices en BD (schema)
- Soft delete con restore
- Health check real con SELECT 1
- Logging estructurado
- Cola de espera real-time (S11): `assignNextPendingVet` + eventos de socket

### ❌ Lo que falta (v4)
- Migraciones no alineadas con el schema (`migrate deploy` rompe prod vs `db push`)
- `/my-history` duplica `/mine` y expone la cola WAITING global a VET
- N+1 de prescripciones en el historial web
- Mensajes sin paginar
- Sin Redis (node-cache suficiente para MVP)

---

## 6. DevOps & Deploy — 6/10 (v4: -1)

### ✅ Lo que está bien
- Build script funcionando
- Railway config documentada
- Graceful shutdown
- Dockerfile multi-stage
- CI/CD con GitHub Actions
- Separación entornos test_

### ❌ Lo que falta (v4)
- `.env` con credenciales commiteados (bloqueante)
- `eas.json` preview/production apuntando a `http://localhost:3001` + Android 9+ bloquea cleartext
- `app.json`: `eas.projectId` vacío → builds EAS fallan
- Deploy activo no verificado

---

## 7. Frontend Quality (Web) — 6/10 (v4: -2)

### ✅ Lo que está bien
- React 19 + Vite 8 + TypeScript
- TailwindCSS con paleta teal unificada
- Design system: Button, Input, Card, Badge, Logo
- AuthContext funcional con persistencia
- ProtectedRoute con verificación de roles
- Dashboard por rol (CLIENT vs VET)
- Chat con Socket.io
- Cerrar consulta con modal de notas
- Imágenes adjuntas visibles en el chat (S12); chip de estado distingue `WAITING`; badge de espera real en el dashboard médico (S12)

### ❌ Lo que falta (v4)
- **No existe el toggle online/offline del médico (Sprint 11)**: la cola real-time es inalcanzable desde la web
- Socket conecta a `window.location.origin` (en dev golpea a Vite, no al backend)
- `AuthContext` autentica con JWT sin verificar si `getMe()` falla; token en `localStorage`
- 18 errores de eslint; polling duplicado; N+1 en historial

---

## 8. Mobile Quality — 7/10 ↑ (+1)

### ✅ Lo que está bien
- Proyecto Expo completo con Expo Router
- Auth con login/register + secure storage
- CRUD mascotas con foto
- Chat con veterinario (polling + socket)
- Historial de consultas con rating
- Solicitar consulta simple
- Design system alineado con web (misma paleta teal)
- TypeScript en toda la app
- Sprint 12: enviar imágenes desde galería (expo-image-picker → `POST /api/media`), visor en burbujas, registro de push token (expo-notifications), feedback correcto en espera ("En cola de espera")

### ❌ Lo que falta (v4)
- Las consultas WAITING se filtran del tab Chat
- `logout()` no desconecta el socket (fuga de eventos entre cuentas)
- `eas.json` producción/preview apuntan a localhost; `eas.projectId` vacío
- Tipos duplicados e incompatibles con web/shared
- Sin pruebas unitarias

---

## 9. Project Management — 7/10 ↑ (+1)

### ✅ Lo que está bien
- Sprint plan detallado con 20 sprints
- MVP scope definido y ejecutado
- Roles y responsabilidades claros
- Plan de contingencia documentado
- Protocolo de hotfix post-MVP
- Metodología Scrumban
- 9 ADR documentados

### ❌ Lo que falta
- Atraso en Ezequiel y Lara
- Sin daily standups efectivos

---

## 📊 Resumen de calificaciones

| Categoría | v1 (30 Jun) | v2 (1 Jul) | v3 (12 Jul) | v4 (5 Ago) | v5 (6 Ago) | v6 (14 Ago) | Tendencia |
|-----------|-------------|------------|-------------|------------|------------|-------------|-----------|
| Code Quality & Structure | 5/10 | 8/10 | 8/10 | **7/10** | **7/10** | **7/10** | — |
| Security | 3/10 | 9/10 | 9/10 | **4/10** | **4/10** | **7/10** | 🟢 +3 |
| Testing | 3/10 | 8/10 | 8/10 | **9/10** | **9/10** | **8/10** | 🔻 -1 |
| Documentation | 8/10 | 9/10 | 9/10 | **8/10** | **8/10** | **7/10** | 🔻 -1 |
| Architecture & Scalability | 4/10 | 8/10 | 8/10 | **7/10** | **7/10** | **6/10** | 🔻 -1 |
| DevOps & Deploy | 3/10 | 7/10 | 7/10 | **6/10** | **6/10** | **5/10** | 🔻 -1 |
| Frontend Web | 3/10 | 7/10 | 8/10 | **6/10** | **6/10** | **6/10** | — |
| Mobile | 1/10 | 1/10 | 7/10 | **6/10** | **7/10** | **7/10** | — |
| Project Management | 6/10 | 6/10 | 7/10 | **7/10** | **7/10** | **7/10** | — |
| | | | | | | | |
| **PROMEDIO PONDERADO** | **4.0/10** | **7.0/10** | **7.9/10** | **6.7/10** | **6.8/10** | **6.7/10** | 🔻 -0.1 |

> El descenso de v3 → v4 **no es una regresión del código**: es el resultado de la *auditoría real y completa* del 5-Ago (ver `CODE_AUDIT.md`). La puntuación previa de Security (9/10) y Frontend/Mobile sobreestimaban el estado.
>
> v5 (6-Ago): sube **Mobile 6→7** por el Sprint 12 (imágenes en el chat + push + feedback de espera).
>
> **v6 (11-Ago):** Sprint 13 + cierre de bugs backend (Tobias) resuelven **los 4 CRITICOS** (`.env` fuera de git, rol fijo en `/register`, `password` fuera de respuestas, migraciones alineadas), el IDOR de mascota, `/my-history` separado, el caché de vets (B11) y **logout con revocación real** (`tokenVersion`). **159 tests en 10 archivos.** Quedan los pendientes de Web/Mobile (top-10 de `CODE_AUDIT.md`) y los manuales: rotar credenciales Supabase + `JWT_SECRET` + purgar historial git.
>
> **v6 (14-Ago) — post auditorías P0→P3 (commit `36d76f0`):** se cierran los hallazgos P0→P3 de `CODE_AUDIT.md`: registro solo CLIENT, `password` oculto en `getUserById`, revocación por `tokenVersion`, `/uploads` tras auth, rutas admin con `authorize()`, concurrencia en `completeConsultation`/`createReview`, dedup de mensajes (`clientMsgId`), cuota de media, y correcciones UX/a11y de web y mobile. **Security sube 4→7.** Quedan borde de producción: **rotar secretos + purgar git** (P0), video LiveKit end-to-end, tests WS/authz/concurrencia, observabilidad, e adoptar `packages/shared`. Docs corregidas (119→159 tests; Koyeb como fuente única de deploy).

---

## 🎯 Pendiente para llegar a 10 (post auditoría 5-Ago)

> Lista completa con archivo:línea en [`CODE_AUDIT.md`](./CODE_AUDIT.md).

### Backend (Tobias)
1. ✅ `.env` fuera de git + `.env.example` (S13). 🔶 **Manual:** rotar credenciales + purgar historial (`git filter-repo`)
2. ✅ Fijar rol en `/register` (no acepta `role`)
3. ✅ No exponer `password` en respuestas de consultas/vet card
4. ✅ Migraciones alineadas al schema (S13 + logout tokenVersion)
5. ✅ Ownership de mascota en `createConsultation` (IDOR)
6. ✅ `/my-history` separado de `/mine`
7. 🟠 MEDIO — Mapear `species` en vets disponibles requiere columna nueva (decisión de producto). Caché del pick único eliminado (B11 cerrado).

### Web (Damián)
8. ✅ Toggle online/offline del médico (Sprint 11, marcha completa vía socket) — acompañamiento real-time
9. 🟠 ALTO — No usar `localStorage` para el JWT; interceptor de 401 fuera del flujo de login
10. 🟠 ALTO — Socket: origen correcto en dev (proxy `/socket.io`) y eventos de cola legibles

### Mobile (Juan)
11. ✅ **Resuelto en S12** — Feedback de espera en consulta `WAITING` (ahora "En cola de espera" con dot ámbar)
12. 🟠 ALTO — No filtrar las `WAITING` del tab Chat
13. 🟠 ALTO — `disconnectSocket()` en logout; leer `petId` en queue
14. 🟠 ALTO — Arreglar `eas.json` producción/preview + limpiar el path `/ws/queue` fantasma

### QA (Ezequiel)
15. Testing del flujo de cola (3 vet offline → crear consulta → vet online → activa)
16. Documentar bugs con re-test

### PM (Lara)
17. Actualizar `INTEGRATION.md` (documenta endpoints inexistentes)
18. Coordinar el bloque de bugs S12–S13
