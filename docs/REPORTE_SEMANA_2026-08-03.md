# 📊 Reporte Semanal — VetConnect
**Semana 32 (ISO)** · Lunes 3 → Viernes 7 de agosto de 2026 · Proyecto demo para Pablo/inversionistas

> Cómo leer este reporte: las secciones van de lo más simple (Resumen) a lo más técnico. Elegí la que te sirva según la audiencia (Lara/CEO → 💼 · Equipo en desarrollado → 🛠️).

---

## 💼 1. Resumen ejecutivo (para Lara / CEO / inversionistas)

**VetConnect ya camina para una demo de inversión.** Esta semana se cerraron **4 sprints** (web S8, S11 cola en tiempo real, S12 imágenes + notificaciones y S13-backend de seguridad), se corrigieron **12 bugs de estabilidad** y el **backend quedó con 119/119 pruebas en verde**.

Lo que un usuario final (Pablo) ya puede hacer hoy:
- Registrarse e iniciar sesión sin errores (móvil y web).
- Crear su **mascota** y pedir **consulta**: la app lo pone en fila de espera y lo **auto-asigna al veterinario** que esté en línea, con el tiempo de espera en vivo.
- **Hablar con el veterinario en tiempo real** (mensajes instantáneos por WebSocket), enviando fotos.
- Recibir **notificaciones** cuando el médico responde o cambia el estado.
- Ver **recetas** digitales y el **historial** de consultas.
- El veterinario desde web con **toggle online/offline** sincronizado en tiempo real.

**Números en una línea:** 20 commits en main, 119/119 pruebas de backend, 4 módulos nuevos (media, notificaciones, cola en tiempo real, recetas) y 0 errores críticos abiertos de backend al cierre de la semana.

**Pendiente que no es bloqueante para la demo, pero hay que tener clear:</strong>
- Las **videollamadas** (LiveKit) quedaron fuera de esta etapa (se explicó a Lara: no es realista tan rápido) — para la demo se cubre con chat + tiempo real.
- Se necesita una **demo con datos de prueba** preparada (los días previos a mostrarle a Pablo) y validar el **QR/cel con el teléfono de oficina** (red USB/túnel).

---

## 💼 2. KPIs de la semana (una mirada de "¿qué avanzó?")

| Indicador | Valor | Nota |
|---|---|---|
| Commits en main (desde 1/08) | 20 | 3 autores distintos |
| Tests del backend | **119/119** (9 suites) | Antes de la 108 |
| Sprints cerrados en la semana | **4** (web S8, S11, S12, S13-backend) | Ver columna #3 |
| Bugs de backend resueltos | **12** | B2-B9, B11, B12, B14 + rate-limit GET | 
| Docs al día | ✅ 12+ actualizados | AUDIT completo (CODE_AUDIT) |
| Cubos de seguridad críticos en backend | ✅ 4 resueltos | Rol fijo, contraseña oculta, env fuera del repo, migraciones alineadas |

---

## 🗂️ 3. Qué se entregó, área por área (para el equipo técnico)

### Backend — Express + Prisma + Supabase (área Tobias)
**Sprint 13 (Estabilización y seguridad):**
- Registro fijo con rol **CLIENT** (ignora el `role` del cliente) → evita que cualquiera se cree como VET/ADMIN.
- **Password ya no se expone** en respuestas de las consultas ni de la cardinal.
- **IDOR corregido**: `createConsultation` ahora valida que la mascota sea del usuario autenticado.
- **`/my-history` separado de `/mine`**: el historial no expone colas ajenas.
- **`.env` fuera del repo** + `.env.example` documentado.
- **Migración correctiva** alineada al schema real (`isOnline`, `vetId`, `messages`, `prescriptions`, `CANCELLED`, `attachments`, `push_tokens`, `notifications`).

**Bugs de la semana (código `B#` = id de `CODE_AUDIT`):**
- **B8**: reintento automático (hasta 5 intentos) al asignar próximo veterinario — si el claim atómico pierde una carrera por concurrencia, prueba con la siguiente consulta de la cola en vez de quedarse "congelado".
- **B9**: **logout ahora revoca sesiones de verdad** — se agregó `tokenVersion` a `User` (migración `20260812000000_session_revocation`); el middleware y `/refresh` rechazan tokens viejos con 401. Antes el logout solo "parecía" salir y el token seguía válido 30 días.
- **B10**: `birthDate` validada (400 con mensaje claro, ya no 500).
- **B11**: caché de pick del vet eliminada — antes el **mismo vet** atendía ~30s a todos los clientes nuevos aunque hubiese otro libre; ahora el pick es siempre fresco.
- **B12**: `getMessages` paginado (`?page&limit`, tope 500) en vez de romper con listados gigantes.
- **B14**: mensajes solo en consultas **ACTIVE** (409 HTTP + rechazo por socket).
- **Bonus**: **rate limit** eximida en GET → el front que consulta por polling ya no recibe 429.

### Web — React + Vite (área Frontend web)
- Registro y Login corregidos según lo pedido en el doc (sin recarga rota).
- Dashboard de **veterinario** y de **usuario** funcionales.
- **Toggle online/offline** del médico con feedback de error y **sync multi-dispositivo por socket** (`vet:availability`).
- Probar **visor de imágenes** del chat y pulido del dashboard.
- Correciones: peso de mascota como número, input de vet bloqueado en consultas WAITING, 401 de login sin recarga.

### Mobile — Expo (React Native, SDK 54)
- Pantalla de registro mejorada: **teclado con KeyboardAvoidingView**, datepicker nativo, **mostrar/ocultar contraseña**.
- Registro de token push (Expo Notifications) + **bandeja in-app** de notificaciones.
- **Galería de fotos en el chat** (expo-image-picker).
- Optimizaciones de rendimiento y estables.
- Chat/cola **tiempo real** (WebSocket).

### Calidad y doc
- **Auditoría completa al proyecto** (CODE_AUDIT) que dejó hallazgos priorizados, hoy todos los críticos de backend resueltos.
- 12 documentos actualizados al avance real (README, TECH_REFERENCE, DEPLOY, FAANG_AUDIT, MVP_SCOPE, INTEGRATION, etc.).
- Suite creció de 108 → **119 tests** y `tsc` sin errores.

---

## 🔬 4. Calidad y plataforma (referencia técnica)

- **Suite:** 119 tests en 9 archivos (auth 23 · consultations 30 · pets 21 · users 9 · media 4 · notifications 10 · utils 15 · cache 4 · app 3). PostgreSQL multi-schema (`test_*` aislado) + coverage.
- **Backend:** Express + Prisma + Socket.io + Supabase Postgres. CI con deploy a **Railway**.
- **Mobile:** Expo SDK 54 (React Native 0.81), push con Expo.
- **Web:** React + Vite, sockets, proxy Vite para `/socket.io`.
- **Flujo de datos:** notificaciones en tiempo real por socket; mensajes persistido a BD; arribos varios.

---

## 🔭 5. Riesgos y próximos pasos (no sorpresas)

### Riesgos conocidos ✔️
1. Demo/demostración: hay que preparar **datos de prueba** y validar **QR/cable a red** antes del encuentro con Pablo. (No es bug del producto, es logística.)
2. **Acción manual pendiente (seguridad):** rotar credenciales de la base y generar **JWT_SECRET real** (hoy hay uno placeholder) y purgar el historial de git del `.env` viejo. No impide la demo, pero hay que hacerlo antes de producción.
3. **Videollamada**: planeada para meses siguientes (fuera de la etapa demo, como se le comunicó a Lara).

### Próximos pasos planeados
- **Test con 2GB de RAM** (dato que puso Pablo en la mesa de prueba): 13–15/8.
- **Pull en Web/Mobile** del top-10 del `CODE_AUDIT`.
- **Demo formal para Pablo** — se arma un "corredor" (trama + datos) y se ensaya.
- Suma de un **área de multimedia** (nuevo integrante) para pulido visual/UX general.

---

## 🧠 6. Para inversiones — pitch de una párrafos

> "VetConnect es una plataforma que conecta a **mascotas y padres** con veterinarios en línea en el día a día: registrás tu mascota, pedís una consulta, esperad en una **fila en tiempo real** con auto-asignación del veterinario disponible, conversá por **chat en vivo con fotos**, y recibís **recetas digitales** y **notificaciones**. Backend estable (119/119 tests), seguridad importante resuelta, corrida en nube con deploy automático. Próximo hito: validación en **equipos de hardware de 2GB** y **llamadas de video**."

---

*Generado automáticamente el 6/8/2026 a partir del estado real de `main` (commit `f77dff9`).*