# FALTA HACER — Roadmap de pendientes de VetConnect

> **Fecha:** 11 de agosto, 2026
> **Autor:** Tobias (sesión de cierre S13/S14)
> **Propósito:** Documento único y exhaustivo de TODO lo que falta por hacer para llevar el proyecto a producción y demo final. Complementa `MVP_SCOPE.md`, `CODE_AUDIT.md`, `SPRINT_PLAN.md` y `DEPLOY.md`.
> **Estado:** ACTUALIZADO al commit `1c73b87` + sesión 12-Ago (ronda UX/QA: edad años+meses, alta de mascota, cola, pestaña Veterinarios, toggle contraseña, dedup de imágenes **y videollamadas LiveKit implementadas** — backend 155/155 tests). El sistema de calificaciones ya está operativo desde la sesión 11-Ago. Ver secciones 4, 7.1 y 7.1b.

---

## 1. Resumen ejecutivo

El proyecto ya cumple el MVP completo (20-Jul) y post-MVP S11-S13 (cola, online/offline, imágenes, push, seguridad, **calificaciones**, **videollamadas**). En la sesión del 11-Ago se implementaron los 7 pedidos del CEO: flujo PENDING (el vet decide atender), receta estructurada, chat web en vivo, búsqueda con rating/orden y fix del optimista (backend 149/149 tests). En la del 12-Ago se cerró la ronda UX/QA del CEO + las videollamadas LiveKit (backend 155/155 tests, commit `1c73b87`).

Lo que falta se divide en **6 frentes**:

| Frente | Prioridad | Esfuerzo | Sprint sugerido |
|--------|-----------|----------|-----------------|
| 1. QA: testing real en hardware 2GB RAM + web + E2E | CRITICA | Medio | S14-S16 |
| 2. Deuda técnica heredada (CODE_AUDIT M/W) | ALTA | Medio | S14-S15 |
| 3. Videollamadas (LiveKit) — **implementadas**; falta credenciales de producción y prueba real | ALTA | Bajo | Inmediato (credenciales), S14-S15 (pruebas) |
| 4. Features post-MVP planificadas pero no empezadas (IA, honorarios, historial clínico, ADMIN) | MEDIA | Alto | S17-S20 |
| 5. Seguridad/operaciones manuales (JWT_SECRET, credenciales, builds) | CRITICA | Bajo | Inmediato |
| 6. Pulido de producto (perfiles más personalizables, mejoras UX) | MEDIA | Medio | S16-S18 |

**La regla de oro:** nada de esto es bloqueante para la demo, pero el frentes 5 (seguridad) y 1 (QA) deben cerrarse antes de cualquier build de producción o deploy real.

---

## 2. QA pendiente — testing real (frente 1, CRITICO)

Hasta ahora el testing fue de código (63 tests backend, typecheck, lint). Falta el testing en hardware/plataforma que el proyecto nunca tuvo.

### 2.1 Testing en dispositivo/emulador Android de 2GB RAM (Sprint 14)

Contexto: el sprint S14 (13-15 Ago) está asignado a Tobias y el código ya fue optimizado para 2GB (commit `d67dbdd`: eliminación de libs LiveKit sin uso, virtualización de FlatLists). Falta la validación en hardware real.

Checklist de validación en un celular Android de 2GB RAM (o emulador con perfil bajo, p.ej. `-memory 2048 -lowram`):

- [ ] **Boot y cold start**: medir tiempo de arranque de la app (objetivo: < 5s en frio).
- [ ] **Mapa de memoria**: abrir cada pantalla (Inicio, Mascotas, Consultas, Chat, Historial, Vets, Perfil) y verificar que no crashea con memoria baja.
- [ ] **Navegación sostenida**: navegar por las 7 pantallas en bucle 10 minutos sin matar procesos en segundo plano.
- [ ] **Chat activo 30 min**: mantener una conversación con imágenes; verificar que los mensajes no se duplican (M11) y que el polling no degrada.
- [ ] **Historial con 50+ consultas**: verificar que la FlatList virtualizada mantiene scroll fluido (no baja de ~40 fps).
- [ ] **Fondo/foreground**: minimizar la app, abrir 5 apps más, volver → no debe recargar la sesión ni perder el chat.
- [ ] **Batería/consumo**: medir drenaje en 15 min de chat abierto.
- [ ] **Push notifications**: recibir notificación con la app en segundo plano y en primer plano.
- [ ] **Red pobre**: probar con red celular 3G/4G y modo avión intermitente → la app debe mostrar estados de error y reintentar, no colgarse.
- [ ] **Concurrencia real**: 2 celulares cliente + 1 web vet al mismo tiempo, flujo completo.

Criterio de aceptación: 0 crashes, 0 ANRs ("app no responde"), sesión estable tras 15 min de uso continuo.

### 2.2 Testing web del médico (Sprint 15)

La web del médico nunca se probó en profundidad:

- [ ] **Cross-browser**: Chrome, Firefox y Edge (escritorio) + Chrome móvil.
- [ ] **Dashboard**: stats correctas, badge de mensajes (W13: está hardcodeado en "3"), listas en tiempo real (W10).
- [ ] **Flujo del médico completo**: login → online/offline → tomar consulta WAITING → chat con imágenes → cerrar consulta con notas → ver historial del cliente.
- [ ] **Multi-tab**: mismo médico logueado en 2 pestañas → el toggle online/offline se sincroniza en ambas (socket `vet:availability`).
- [ ] **Responsive**: ancho 1366px, 1024px, 768px y 375px.
- [ ] **Errores de red**: cortar el backend y verificar mensajes de error amigables, no pantallas rotas.

### 2.3 Flujo completo E2E (Sprint 16)

Escenario de punta a punta con datos reales (usar el seed `npm run seed`, usuarios demo con pass `test1234`):

- [ ] CLIENT se registra → crea mascota → busca vet por nombre/especialidad → agrega a favoritos → solicita consulta → espera en cola → chat → califica al vet.
- [ ] VET se loguea en web → se pone online → recibe la consulta → chatea → envía receta → cierra con notas.
- [ ] CLIENT recibe push → ve el historial → ve la receta → ve el rating publicado.
- [ ] CLIENT edita su perfil → los cambios se ven en el chat y en el picker de vets.
- [ ] Admin loguea en web → revisa usuarios activos.

---

## 3. Deuda técnica heredada — CODE_AUDIT (frente 2, ALTO)

Del `CODE_AUDIT.md` quedan pendientes de Mobile (M) y Web (W). Los críticos de backend (B1-B14) ya están resueltos. Priorizados:

### 3.1 Mobile — pendientes importantes

| ID | Problema | Archivo | Acción | Prioridad |
|----|----------|---------|--------|-----------|
| M4 | `logout()` no llama `disconnectSocket()` → el socket con token viejo sigue recibiendo eventos | `mobile/src/stores/authStore.ts:75-85` | Llamar `disconnectSocket()` en logout | ALTA |
| M5 | `petId` no se lee en queue → la mascota no se preselecciona | `mobile/app/(app)/queue/index.tsx` | Leer `useLocalSearchParams()` | ALTA |
| M10 | Si el socket cae a mitad de chat, el polling nunca se reactiva → chat congelado | `mobile/src/hooks/useConsultations.ts:58` | Escuchar `disconnect` del socket y volver a `socketConnected=false` | ALTA |
| M11 | Dedup de mensajes optimistas: con 2+ pendientes hay duplicados | `mobile/src/hooks/useConsultations.ts:79-86` | Dedup por contenido+timestamp en `onMessage` | MEDIA |
| M9 | JWT por WebSocket en `ws://` sin TLS en IP LAN | `mobile/src/lib/socket.ts:11-13` | Usar HTTPS/WSS en la URL de producción | MEDIA |
| M15 | `hydrate` nunca valida con `/auth/me` | `mobile/src/stores/authStore.ts:27-37` | Validar token contra el backend al arrancar | MEDIA |
| M14 | `useAuthStore()` sin selector → re-renders globales | `mobile/src/hooks/useAuth.ts:13` | Selectores por campo | BAJA |
| M13 | En web, JWT + refresh en `localStorage` (XSS) | `mobile/src/lib/secure-storage.ts:24-26` | Cookies httpOnly o al menos `sessionStorage` | BAJA (web) |
| M17 | `onPress` inline en `pets/index.tsx` rompe el `memo` de PetCard | `mobile/app/(app)/pets/index.tsx:64` | `useCallback` | BAJA |
| M21 | 33 warnings de lint + sin tests unitarios mobile | — | Limpiar imports; agregar al menos tests de authStore y utils | MEDIA |

### 3.2 Web — pendientes del dashboard médico

| ID | Problema | Archivo | Acción | Prioridad |
|----|----------|---------|--------|-----------|
| W4 | `parseUserFromToken` sin verificar firma → token corrupto entra al dashboard | `web/src/context/AuthContext.tsx:57-65` | Validar con `/auth/me` | CRITICA |
| W5 | JWT en `localStorage` sin refresh/rotación | `web/src/services/api.ts:10` | Usar el interceptor con `/auth/refresh` | ALTA |
| W6 | Cualquier 401 redirige a `/login` y el 401 del login recarga la página | `web/src/services/api.ts:22-24` | Excluir la ruta `/auth/login` del interceptor | ALTA |
| W9 | No se llama `leaveConsultation()` al cambiar de sala → rooms acumulados | `web/src/components/MessagesSection.tsx:445` | Limpiar rooms al desmontar | ALTA |
| W11 | N+1: un `getPrescriptions()` por consulta completada | `web/src/components/HistorySection.tsx:18-22` | Incluir recetas en el endpoint de historial | MEDIA |
| W12 | Polling duplicado sin `AbortController` | `web/src/components/MessagesSection.tsx` | Un solo intervalo + abort | MEDIA |
| W13 | Badge de mensajes hardcodeado "3" | `web/src/pages/VetDashboardPage.tsx:100` | Implementar contador real | MEDIA |
| W14 | Link "¿olvidaste tu contraseña?" apunta a `#` | `web/src/pages/LoginPage.tsx:97` | Implementar flujo o quitar el link | BAJA |
| W19 | 18 errores de eslint | `web/` | `npm run lint` y corregir | MEDIA |
| W3 | Socket dev apunta a Vite en vez del backend | `web/src/services/socket.ts:10` + `vite.config.ts` | Proxy de `/socket.io` en dev | MEDIA |
| W7, W8 | Validaciones de formulario desalineadas con el backend | `PetsSection.tsx:56`, `ConsultationsSection.tsx:55` | Alinear mensajes (peso numérico, notas min 5) | BAJA |
| W15-W18 | Código muerto, tipos duplicados, `livekit-client` sin uso | `web/src` | Limpieza general | BAJA |

---

## 4. Videollamadas — LiveKit (frente 3, implementado el 12-Ago)

La feature se **implementó completa en la sesión 12-Ago** (commit `1c73b87`), después de dos intentos previos: el original (reemplazado por chat en el MVP, ver ADR-009) y las libs instaladas sin uso que sumaban ~200MB al bundle y se quitaron en `d67dbdd`. Esta vez se hizo con el backend real emitiendo tokens.

### 4.1 Lo que ya está hecho ✅

| Capa | Implementación |
|------|----------------|
| Backend | `POST /api/calls/:id/token` en `backend/src/modules/calls/`: solo participantes de la consulta, solo `ACTIVE` (409 si no), 403 ajeno, 404 inexistente, token LiveKit con TTL 10 min y room `consultation-{id}`; 503 "no habilitadas" si faltan credenciales. 4 tests en la suite (155/155 en verde) |
| Web | Sala completa con `livekit-client` (`web/src/components/call/CallRoom.tsx`): video remoto/local, mic/cam toggle, timer, esperando al otro; `CallButton` lazy (code-split, el bundle principal sigue en ~139 KB gzip); página `/call` que al colgar vuelve al chat con `vetconnect://call-ended` |
| Mobile | Pantalla `app/(app)/call/[consultationId].tsx` con WebView a `${WEB_URL}/call` (funciona en Expo Go, sin prebuild nativo) + botón "Videollamada" en el chat activo |

### 4.2 Lo que queda (sin código, manual)

- [ ] **Credenciales reales** en `backend/.env`: `LIVEKIT_URL` (formato `wss://proyecto.livekit.cloud`), `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` (documentadas en `.env.example`).
- [ ] **HTTPS obligatorio**: `getUserMedia` solo funciona con `https://` — el celular físico no puede probar video contra IP LAN `http://` con `ws://localhost:7880`.
- [ ] **Prueba real 2 dispositivos**: CLIENT mobile ↔ VET web, llamada completa con audio/video en ambos sentidos (criterios de S14/S15).
- [ ] **Regresión 2GB**: el WebView carga `livekit-client` solo al entrar a la llamada (lazy por diseño); verificar que la app sigue liviana.
- [ ] **Push "Te está llamando"** al otro lado (reusar el sistema de S12) — opcional.
- [ ] Si el otro lado no contesta en 30s, la llamada se cae sola con aviso — opcional.

**Regla mantenida:** la consulta sigue funcionando por chat aunque el video falle (degradación graceful).

---

## 5. Features post-MVP planificadas pero sin empezar (frente 4)

De `MVP_SCOPE.md` y `CHANNEL_DECISION.md`, fuera de la fase actual pero prometidas para "post-MVP":

| Feature | Estado | Sprint | Notas |
|---------|--------|--------|-------|
| **Historial clínico completo** | No empezado | S17 | Mostrar historial clínico agrupado por mascota con recetas, notas y fotos de cada consulta. Hoy `my-history` devuelve todo plano. |
| **Asistente IA (Claude)** | No empezado | S18 | Fue eliminado del MVP (`MVP_SCOPE.md`). Requiere API key de Anthropic + endpoint `POST /consultations/:id/ai-summary` para resumir la consulta para el cliente. |
| **Sistema de honorarios** | No empezado | S19 | Qué cobra el vet por consulta; el backend hoy no tiene campos de precio. Requiere decisión de producto (¿cobro por consulta? ¿suscripción?). |
| **Stripe / pagos** | No empezado | S19 | Depende de honorarios. Stripe Checkout para recargar saldo o pagar consulta. |
| **Panel ADMIN** | Básico | S17 | Hoy ADMIN es "básico" (`CHANNEL_DECISION`). Falta: listar usuarios, banear, ver métricas globales (consultas/día, vets activos), gestionar roles. |
| **Forgot password** | No empezado | S16 | Link muerto en web (W14). Requiere: endpoint `POST /auth/forgot-password` + `POST /auth/reset-password` + email transaccional (Resend) + pantallas web/mobile. |

### 5.1 Recetas digitales — estado actual

Las recetas existen (endpoint + visualización en mobile y web). Pendientes de pulido:

- [ ] Enviar receta por WhatsApp/email (share sheet en mobile).
- [ ] Historial de recetas por mascota (hoy se ven solo en el chat de la consulta).

### 5.2 Notificaciones — estado actual

El sistema push existe (S12). Pendientes:

- [ ] Pantalla de notificaciones ya existe en mobile (bandeja in-app). Falta: **marcar todas como leídas** y **badge del tab**.
- [ ] Notificación "Nuevo rating recibido" para el VET (hoy no se notifica al vet cuando lo califican).
- [ ] Notificación "Te eligieron como favorito" (opcional).

---

## 6. Seguridad y operaciones manuales (frente 5, CRITICO antes de producción)

De `FAANG_AUDIT.md` v6 y `REPORTE_SEMANA_2026-08-03.md`, son acciones manuales pendientes, no de código:

- [ ] **Generar `JWT_SECRET` real** (hoy hay un placeholder en `.env`). Comando sugerido: `openssl rand -base64 48`. Con el secret actual se pueden forjar JWTs de cualquier rol.
- [ ] **Rotar credenciales de Supabase** (DATABASE_URL/DIRECT_URL) y actualizar los `.env` del equipo.
- [ ] **Purgar el historial de git** del `.env` viejo (los `.env` fueron trackeados y luego sacados): `git filter-repo` + force push (coordinado con el equipo — rompe clones).
- [ ] **eas.json / app.json**: `eas.projectId` vacío y perfiles `preview`/`production` apuntando a `http://localhost:3001` (M7 + DEPLOY.md) → configurar la URL HTTPS real y el projectId antes de cualquier build.
- [ ] **unificar WS_URL real** en mobile (M6): el path fantasma `/ws/queue` debe eliminarse y dejar un solo lugar con la URL real.
- [ ] **Cleartext HTTP**: Android 9+ bloquea `http://` — el build de producción debe usar HTTPS.

---

## 7. Pulido de producto — lo que el cliente pide y ya está hecho vs. lo que falta (frente 6)

### 7.1 Ya implementado (sesión 11-Ago, commit base `49fc880`) — no volver a hacer, solo retocar

| Pedido del cliente | Implementación | Estado |
|--------------------|----------------|--------|
| "Los clientes deberían poder buscar el veterinario que quieren" | `GET /users/vets?search=&online=&minRating=&sortBy=`, picker con buscador + toggle disponible + chips de rating + orden mejor calificados/recientes | Hecho en backend, web y mobile. |
| "Debería haber un sistema de calificaciones" | `POST /consultations/:id/rating`, estrellas en historial, ratingAvg en lista de vets, reviews expandibles en el directorio web | Hecho. Falta: ver reviews del vet en detalle mobile, responder reviews |
| "Los clientes puedan poner veterinarios favoritos" | Favoritos idempotentes + corazón + filtro "Solo favoritos" | Hecho. |
| "Los perfiles deberían ser más editables, más personalizables" | `PATCH /users/me` (nombre, teléfono, bio, especialidad) + pantallas de perfil | Hecho. Falta: foto/avatar |
| "El vet debería poder elegir si atiende la consulta" | Estado `PENDING`: el cliente elige vet y se le ofrece; el vet acepta (→ ACTIVE) o rechaza (→ vuelve a la cola WAITING tomable por cualquiera); si el vet no está online se agenda como WAITING y al conectarse recibe la oferta más antigua | Hecho en backend + web (tabs Ofertas/Cola/Activas) + mobile (banner "Esperando confirmación"). |
| "Ver ficha del cliente, motivo y expediente antes de aceptar" | Botón "Ficha" en la oferta → `VetPatientProfile` (datos del cliente + mascota + historial) antes de Aceptar/Rechazar | Hecho en web. |
| "Mejor UX de recetas" | Receta estructurada (medicación, dosis, frecuencia, duración, indicaciones) autogenerada si el vet no escribe texto libre; se muestra formateada en web y mobile | Hecho. |
| "Chat web instantáneo sin recargas ni polling" | Socket con salas `consultation:{id}` y `user:{id}`; en web los mensajes entran en vivo (polling solo como fallback si el socket cae); badge de mensajes reales vía socket. La lista de consultas y la conversación abierta se cachean (`chatStore`) → volver a la sección es instantáneo | Hecho. |
| "Mensajes clavados en 'enviando'" | Optimistic confirmado por id exacto (FIFO) en web y mobile; el botón deja de mostrar "enviando" apenas llega el echo del socket (no espera al POST REST) | Hecho. |

### 7.1b Ya implementado (sesión 12-Ago, ronda de QA/UX del CEO) — no volver a hacer

| Pedido / bug | Implementación | Estado |
|--------------------|----------------|--------|
| "Edad '5a 11m' se ve mal" | `formatAge` (mobile) y ficha del paciente (web) ahora muestran "5 años y 11 meses" | Hecho. |
| "Ver contraseña en login/register web" | Prop `rightIcon` en Input + toggle eye/eye-off en LoginPage y RegisterPage (ambos campos) | Hecho. |
| "Sección Consultas mobile: UX horrible; vet picker como página principal; 2 formas de elegir vet" | Consultas rediseñada (cards horizontales de mascota con foto, motivo con iconos, tarjetas "Rápido" vs "Elegir yo" + chip del vet elegido con estrellas y "Cambiar"); pestaña **Veterinarios** en el tab bar + card en el home; selección de vet ya no "vuelve al inicio": vuelve a Consultas o directamente abre Consultas con el vet elegido | Hecho. |
| "Agregar mascota es feo" | `pets/new` rediseñado: círculo de foto con color por especie, título "Conocé a tu compañero", grilla de especies con iconos y colores, sexo como tarjetas | Hecho. |
| "Imágenes se duplican en la app y se envían solas" | El chat mobile ya NO envía al seleccionar: muestra preview + mensaje opcional y recién al tocar enviar sube y manda; el optimista/dedupe en mobile (hook) y web (`chatStore`) compara también el adjunto (dos imágenes con content vacío no se borran entre sí) | Hecho. |
| "Faltan las llamadas" | Videollamadas LiveKit implementadas: `POST /api/calls/:id/token` (solo participantes de consulta ACTIVE, token 10 min), web con `livekit-client` (UI completa, code-split), mobile con WebView a `/call` (funciona en Expo Go), botón "Videollamada" en chats web y mobile. **Pendiente:** credenciales `LIVEKIT_URL/API_KEY/API_SECRET` en `backend/.env` + subir `LIVEKIT_URL` real (localhost:7880 no sirve de un teléfono) | Backend+UI hechos; falta config de producción. |

Verificación: backend `tsc` limpio + **155/155 tests jest OK** (incl. 4 de `calls`); web `tsc` + eslint de archivos tocados + build OK (livekit-client en chunk separado, bundle principal ~139 KB gzip); mobile `tsc` + lint 0 errores.

### 7.2 Mejoras de producto sugeridas (nuevas, priorizadas)

**Alta prioridad (impacto en demo):**

- [ ] **Detalle del veterinario** `app/(app)/vets/[id].tsx`: foto, especialidad, bio, rating promedio + distribución de estrellas, últimas reviews con comentarios, botón "Pedir consulta" + botón favorito. Backend ya devuelve todo (`GET /users/vets/:id`).
- [ ] **Foto/avatar de perfil**: subir imagen (reusar `POST /media`) + `photoUrl` en User. Mostrar en header, chat y picker de vets.
- [ ] **Pantalla "Mis veterinarios" (favoritos)** en el home: acceso directo con botón "Consultar".
- [ ] **Vista de perfil del vet desde el chat**: tocar el nombre del vet en el chat abre su ficha (con su bio y rating).

**Media prioridad:**

- [ ] **Filtros del picker de vets**: por especialidad (chips), por rating mínimo, ordenar por mejor calificado / disponibles / favoritos.
- [ ] **Rating en la web del médico**: el VET ve su rating promedio y reviews en su dashboard (incentiva calidad).
- [ ] **Responder reviews** (el vet comenta la review del cliente) — requiere modelo `ReviewReply` o campo `reply` en Review.
- [ ] **Perfil público del cliente**: nombre y avatar visibles para el vet en la web.

**Baja prioridad (polish):**

- [ ] Modo claro/oscuro.
- [ ] Idiomas (ES/EN).
- [ ] Onboarding inicial con tips ("¿Cómo pedir tu primera consulta?").
- [ ] Compartir perfil del vet por link.
- [ ] Ver "última consulta con este vet" en la ficha del vet.

---

## 8. Recomendación de orden de trabajo (para mañana y la semana)

| Orden | Qué | Por qué |
|-------|-----|---------|
| 1 | Frente 5 (JWT_SECRET, credenciales, eas.json, WS_URL) | Es manual, rápido (< 1 hora) y destraba builds y producción |
| 2 | Frente 2 parcial (M4, M5, M10, M11, W4, W5, W6, W9) | Bugs que pueden arruinar la demo |
| 3 | Frente 1 (QA 2GB con celular prestado, web cross-browser, E2E) | Valida TODO lo que hicimos |
| 4 | Frente 3 (LiveKit) | La feature que más se pregunta en las demos |
| 5 | Frente 6 (detalle del vet, avatar, pantalla de favoritos) | Producto más vendedor con lo ya implementado |
| 6 | Frente 4 (forgot password, historial clínico, ADMIN, IA, honorarios, Stripe) | Ya es alcance de las últimas semanas |

## 9. Definición de "listo" (Definition of Done) para cada ítem

- [ ] Implementado y testeado (backend: tests en Jest; mobile/web: typecheck + lint).
- [ ] Probado en las 2 plataformas (mobile 2GB + web) cuando aplica.
- [ ] Docs actualizados (MVP_SCOPE / CHANNEL_DECISION / CODE_AUDIT).
- [ ] Commit con mensaje descriptivo siguiendo la convención del repo.
- [ ] Sin regresiones: `npx jest` backend en verde (155+ tests) antes de cerrar la sesión.
