# Sprint Plan — VetConnect

> **Calendario:** 2 sprints por semana | **Inicio:** 15 de junio | **MVP:** 20 de julio | **Fin:** 5 de septiembre (buffer hasta oct)

> [!NOTE]
> **Conteo actual de tests:** el backend tiene **159 tests en 10 archivos** (`backend/src/__tests__`: `app, auth, cache, calls, consultations, media, notifications, pets, users, utils`). Los conteos citados por sprint (108/108, 149/149, 155/155, 119/119) son *snapshots* de esa fecha, no el total actual. No hay tests de WebSocket, authz negativa, ni concurrencia.

---

## Resumen ejecutivo

| Métrica | Valor |
|---------|-------|
| Sprints totales | 20 |
| Ritmo | 2 sprints/semana (lun-mié · jue-sáb) |
| Sprints pre-MVP | 10 (S1-S10) |
| Fecha MVP | 20 de julio |
| Vacaciones | 20-31 de julio |
| Sprints post-vacaciones | 10 (S11-S20) |
| Fin desarrollo | 5 de septiembre |
| Buffer presentación | Sep - Oct |

### Dónde estamos hoy

| Dimensión | Sprint | Estado |
|-----------|--------|--------|
| **Equipo** | **S13** (10-12 ago) | 🟢 Activo — Tobías ✅, Juan 🟡 (rendimiento avanzado), Damián 🟡 (bugs web avanzado), Ezequiel/Lara ⏳ |
| **MVP compliance** | Completado | ✅ Proyecto alineado al alcance MVP |

> **Actualización 10-Ago:** sprints S9 (web), S11 (mobile + web) cerrados por Juan y Damián con commits propios (4-6 Ago). Detalle de aportes no registrados al final de este documento.
>
> **Actualización 12-Ago (sesión QA/UX del CEO, commit `1c73b87`):** edad en años+meses (mobile + web), alta de mascota rediseñada, cola rediseñada (modo rápido / elegir vet), pestaña **Veterinarios** en el tab bar, navegación del picker arreglada, toggle de contraseña en web, flujo de imágenes sin duplicados **y videollamadas LiveKit** (endpoint de tokens, sala web code-split, WebView mobile). El sistema de calificaciones (1-5) quedó operativo en la sesión 11-Ago (historial + directorio con promedio). Backend en **155/155 tests**.

---

## Timeline visual

```
Jun 15 ─┤ S1 ├────┤ S2 ├────┤ S3 ├────┤ S4 ├────┤ S5 ├────┤ S6 ├────┤
         lun 15    jue 18    lun 22    jue 25    lun 29    jue 2

Jul  6 ─┤ S7 ├────┤ S8 ├────┤ S9 ├────┤ S10├────▓▓ MVP ▓▓──── VACACIONES ────
         lun 6     jue 9     lun 13    jue 16    lun 20    20-31 jul
         Chat      Pulido    Bugs      Freeze
         (texto)   completo

Ago  3 ─┤ S11├────┤ S12├────┤ S13├────┤ S14├────┤ S15├────┤ S16├────┤
         lun 3     jue 6     lun 10    jue 13    lun 17    jue 20

Ago 24 ─┤ S17├────┤ S18├────┤ S19├────┤ S20├─────────────────┤ oct 31
         lun 24    jue 27    lun 31    jue 3     Buffer presentación
```

---

## Sprint 1 — Setup (15-17 Jun) ✅

**Duración:** lun 15 · mar 16 · mié 17

| Quién | Tarea |
|-------|-------|
| **Tobias** | Repositorio GitHub. Estructura monorepo. Node + TS + Express + Prisma + PostgreSQL. README básico. |
| **Juan** | Proyecto Expo en `/mobile`. Verificar en Android. |
| **Damián** | Proyecto React + Vite + TypeScript + TailwindCSS en `/web`. |
| **Ezequiel** | Tablero Scrumban. 4 columnas. Cargar tareas S1. `DECISIONS.md`. |
| **Lara** | Project Charter. Roles. Stack. Arquitectura. |

---

## Sprint 2 — Modelos + Navegación + Wireframes (18-20 Jun) ✅

| Quién | Tarea | Estado |
|-------|-------|--------|
| **Tobias** | Modelos Prisma. Rutas base. | ✅ |
| **Juan** | Navegación mobile. | ✅ Cubierto por Thiago (scaffold 29-Jun) + Tobias |
| **Damián** | Páginas web layout. | ✅ Cubierto por Tobias (base propia 18-Jun) |
| **Ezequiel** | Wireframes Figma. | ✅ Figma usado como referencia por Damián (7-Jul) |
| **Lara** | Seguimiento. | ✅ |

---

## Sprint 3 — Auth Backend (22-24 Jun) ✅

| Quién | Tarea | Estado |
|-------|-------|--------|
| **Tobias** | Auth register/login/JWT/middlewares/roles. | ✅ |
| **Juan** | LoginScreen + RegisterScreen mobile. | ✅ Cubierto por Tobias (29-Jun helpers mobile) |
| **Damián** | LoginPage + RegisterPage web. | ✅ Cubierto por Tobias (29-Jun helpers web) |
| **Ezequiel** | Testing endpoints. | ✅ Cubierto por suite Jest (9/9 tests auth, Tobias) |
| **Lara** | Review S3. | ✅ |

---

## Sprint 4 — Conectar Frontends a Auth (25-27 Jun) ✅

| Quién | Tarea | Estado |
|-------|-------|--------|
| **Tobias** | Middleware roles, pets CRUD, tests. | ✅ |
| **Juan** | Conectar mobile a auth. | ✅ Cubierto por Tobias (29-Jun) |
| **Damián** | Conectar web a auth. AuthContext. | ✅ Cubierto por Tobias (29-Jun AuthContext web) |
| **Ezequiel** | Testing flujo auth. | ✅ Cubierto por suite Jest de auth |
| **Lara** | Review S4. | ✅ |

---

## Sprint 5 — Roles + Mascotas (29 Jun - 1 Jul) ✅

| Quién | Tarea | Estado |
|-------|-------|--------|
| **Tobias** | Singleton Prisma, CORS, helmet, rate-limit, Zod, soft delete, paginación, health check, error handler, graceful shutdown, FAANG audit, Web AuthContext + ProtectedRoute + RegisterPage. | ✅ |
| **Juan** | Redirección por rol mobile. | ✅ Cubierto por Tobias + Thiago |
| **Damián** | ProtectedRoute + RegisterPage web. | ✅ Hecho por Tobias |
| **Ezequiel** | Testing roles. | ✅ Cubierto por suite Jest (users/auth tests) |
| **Lara** | Review S5. | ✅ |

---

## Sprint 6 — Conexión Mobile + Chat Inicio (2-4 Jul) ✅

**Nota:** Se reemplazó LiveKit por chat de texto según `MVP_SCOPE.md`.

| Quién | Tarea | Estado |
|-------|-------|--------|
| **Tobias** | Modelo Message en Prisma + migración. Socket.io. Endpoints consultas + chat. | ✅ |
| **Juan** | Pantallas mascota mobile. Login/Register mobile funcional. | ✅ |
| **Damián** | Dashboard web médico: lista consultas. | ✅ |
| **Ezequiel** | Testing mascotas mobile. | ✅ Cubierto por suite Jest (21 tests pets) |
| **Lara** | Review con profesores. | ✅ |

---

## Sprint 7 — Chat de Texto + Historial Básico (6-8 Jul) ✅

| Quién | Tarea | Estado |
|-------|-------|--------|
| **Tobias** | Socket.io + endpoints consultas + paginación + autorización. | ✅ |
| **Juan** | Chat mobile con veterinario (reemplaza IA + LiveKit). | ✅ |
| **Damián** | Chat web + cerrar consulta + modal notas. | ✅ |
| **Ezequiel** | Testing chat. | ✅ Cubierto por suite Jest (30 tests consultations) |
| **Lara** | Coordinar. | ✅ |

---

## Sprint 8 — Pulir Flujo Completo + Testing (9-11 Jul) ✅

| Quién | Tarea | Estado |
|-------|-------|--------|
| **Tobias** | MVP compliance backend: migration cleanup, eliminar isOnline/liveKitRoom. | ✅ |
| **Juan** | MVP compliance mobile: eliminar IA, LiveKit, cola. Agregar chat con vet y solicitud simple. | ✅ |
| **Damián** | MVP compliance web: eliminar secciones excluidas, agregar cerrar consulta. | ✅ |
| **Ezequiel** | Testing flujo completo MVP. | ✅ Cubierto por suite Jest (MVP entregado con 108/108) |
| **Lara** | Preparar demo. | ✅ Demo presentada 20-Jul |

---

## Sprint 9 — Últimos Bugs + Preparar Presentación (13-15 Jul) ✅

**Duración:** lun 13 · mar 14 · mié 15

> **No se agregan features nuevas.** Solo bugs detectados en S8.

> **Backend de Tobias completado en sesión 11-Ago** (la auditoría de 5-Ago detectó que quedó pendiente): B8 (race en `assignNextPendingVet` → reintento), B10 (`birthDate` validada → 400), B14 (mensajes solo en consultas `ACTIVE` → 409/socket error). Optimizar queries quedó cubierto en S13.

| Quién | Tarea | Estado |
|-------|-------|--------|
| **Tobias** | Bugs backend priorizados (máximo 3). Optimizar queries si es necesario. | ✅ (11/08) |
| **Juan** | Bugs mobile: navegación, carga de datos, errores de conexión. Probar en Android físico. | ✅ (5-Ago: KeyboardAvoidingView, datepicker nativo, mostrar/ocultar contraseña, optimizaciones de rendimiento — `195dd7f`) |
| **Damián** | Bugs web: responsive, estados de carga/error, edge cases de navegación. | ✅ (4-Ago: registro/login, dashboards vet y usuario arreglados según doc — `16fe58c`) |
| **Ezequiel** | Re-testear bugs corregidos. Armar casos de prueba para la presentación. | ✅ Cubierto por suite Jest (119/119, Tobias) + CODE_AUDIT |
| **Lara** | Coordinar demo. Definir quién muestra qué. Preparar slides. | ✅ |

---

## Sprint 10 — Freeze (16-18 Jul) ✅

**Duración:** jue 16 · vie 17 · sáb 18

> **Código congelado.** No se agrega nada. Solo bugs críticos que rompan el flujo principal.
> Sin commits de nadie del equipo (13-jul a 2-ago → coincide con el cierre del MVP y las vacaciones 20-31 jul). El MVP se entregó el 20-jul con **108/108 tests** del backend.

| Quién | Tarea | Estado |
|-------|-------|--------|
| **Todo el equipo** | Últimos retoques. Nadie empieza nada nuevo. Preparar la presentación del lunes 20. | ✅ MVP entregado 20-jul |

---

## 🎯 MVP — Domingo 19 Julio

| Quién | Tarea |
|-------|-------|
| **Todo el equipo** | Cerrar ramas. Commits finales. Revisión grupal. |

### MVP entregado: **Lunes 20 Julio** ✅

---

## 🏖️ Vacaciones — 20 al 31 de Julio

Sin sprints. Sin código. Descanso obligatorio.

---

## Sprint 11 — Reactivación (3-5 Ago)

**Duración:** lun 3 · mar 4 · mié 5

| Quién | Tarea | Estado |
|-------|-------|--------|
| **Tobias** | Online/offline médico + cola de espera. Endpoint primer vet disponible por especie. | ✅ |
| **Juan** | Pantalla selección tipo mascota + búsqueda vet. Feedback visual espera. | ✅ (3-Ago: disponibilidad de vets + recetas, fix timeout vetcard/mensajes, perfil vet — `9219ff8`) |
| **Damián** | Botón online/offline médico. Indicador visual. | ✅ (6-Ago: toggle online/offline + indicador de estado — `1cac605`, `a8be548`) |
| **Ezequiel** | Testing cola de espera. | ✅ Cubierto por suite Jest (cola real-time, Tobias) |
| **Lara** | Review reactivación. | ✅ |

---

## Sprint 12 — Imágenes + Notificaciones (6-8 Ago)

**Duración:** jue 6 · vie 7 · sáb 8

| Quién | Tarea | Estado |
|-------|-------|--------|
| **Tobias** | Endpoint recibir/almacenar imágenes. Sistema notificaciones push. | ✅ |
| **Juan** | Botón enviar imagen desde galería. Mostrar imágenes en chat. | ✅ |
| **Damián** | Mostrar imágenes recibidas. Pulir dashboard médico. | ✅ |
| **Ezequiel** | UX review mobile. Documentar inconsistencias. | ✅ `mobile/docs/UX_UI_AUDIT.md` + `UX_UI_AUDIT_V2.md` |
| **Lara** | Review. | ✅ |

---

## Sprint 13 — Estabilización (10-12 Ago)

> No se agregan features nuevas.

| Quién | Tarea | Estado |
|-------|-------|--------|
| **Tobias** | Deuda técnica. Optimizar queries Prisma. Revisar seguridad. | ✅ (11-Ago, 149/149; + videollamadas y ronda UX 12-Ago, 155/155) |
| **Juan** | Bugs UX. Rendimiento en 2GB RAM. | ⏳ (pendientes CODE_AUDIT: `disconnectSocket()` en logout, leer `petId` en queue) |
| **Damián** | Bugs web. Chrome, Firefox, Edge. | ⏳ (pendiente CODE_AUDIT: unificar `WS_URL` real en mobile + eas.json) |
| **Ezequiel** | Re-testear. Reporte para profesores. | ⏳ |
| **Lara** | Review formal. Feedback pre-QA. | ⏳ |

---

## Sprint 14 — Testing 2GB RAM (13-15 Ago)

**Nota (10-Ago):** asignado a Tobias — patrón real del equipo (el resto no viene). Todo lo verificable desde código se cierra acá; lo de hardware (device físico 2GB) queda pendiente de un celular prestado.

| Quién | Tarea | Estado |
|-------|-------|--------|
| **Tobias** | Auditoría de rendimiento mobile desde código (libs pesadas, caché de imágenes, virtualización de listas, perfiles de memoria) + optimizaciones. Testing en Android físico 2GB si hay celular disponible. | 🟢 Activo (10-12 Ago) |
| **Juan** | (No presente — tarea asumida por Tobias) | — |
| **Damián** | (No presente — tarea asumida por Tobias) | — |
| **Ezequiel** | (No presente) | — |
| **Lara** | (No presente) | — |

---

## Sprint 15 — Prueba Web Médico (17-19 Ago)

| Quién | Tarea |
|-------|-------|
| **Todo el equipo** | Prueba completa interfaz web del médico. |

---

## Sprint 16 — Flujo Completo E2E (20-22 Ago)

| Quién | Tarea |
|-------|-------|
| **Todo el equipo** | Flujo completo: registro → busca vet → cola → consulta → historial. |

---

## Sprint 17 — Deploy Producción (24-26 Ago)

| Quién | Tarea |
|-------|-------|
| **Tobias** | Deploy Railway. BD producción separada. |
| **Damián** | Deploy web en Vercel. |
| **Juan** | Compilar APK Android firmado. |
| **Ezequiel** | Smoke testing. |
| **Lara** | Verificar links. |

---

## Sprint 18 — Documentación (27-29 Ago)

| Quién | Tarea |
|-------|-------|
| **Tobias** | README técnico completo. |
| **Damián** | Documentación API. |
| **Juan** | Guía de uso mobile. |
| **Ezequiel** | Manual de usuario. |
| **Lara** | Revisar documentación. |

---

## Sprint 19 — Presentación Final (31 Ago - 2 Sep)

| Quién | Tarea |
|-------|-------|
| **Todo el equipo** | Preparar presentación final. Demo en vivo. |

---

## Sprint 20 — Buffer Final (3-5 Sep)

| Quién | Tarea |
|-------|-------|
| **Todo el equipo** | Código congelado. Solo bugs. |

---

## 📅 Buffer extra hasta Octubre 31

Los sprints terminan el 5 de septiembre. El tiempo restante hasta el 31 de octubre es **buffer exclusivamente para:**
- Ensayos de presentación
- Corrección de bugs descubiertos en ensayos
- Refinamiento de documentación

---

## Seguimiento

| Sprint | Fechas | Tobias | Juan | Damián | Ezequiel | Lara |
|--------|--------|--------|------|--------|----------|------|
| S1 | 15-17 Jun | ✅ | ✅ | ✅ | ✅ | ✅ |
| S2 | 18-20 Jun | ✅ | ✅* | ✅* | ✅* | ✅ |
| S3 | 22-24 Jun | ✅ | ✅* | ✅* | ✅* | ✅ |
| S4 | 25-27 Jun | ✅ | ✅* | ✅* | ✅* | ✅ |
| S5 | 29 Jun - 1 Jul | ✅ | ✅* | ✅ | ✅* | ✅ |
| S6 | 2-4 Jul | ✅ | ✅ | ✅ | ✅* | ✅ |
| S7 | 6-8 Jul | ✅ | ✅ | ✅ | ✅* | ✅ |
| S8 | 9-11 Jul | ✅ | ✅ | ✅ | ✅* | ✅ |
| **S9** | **13-15 Jul** | **✅ (11/08)** | **✅ (5-Ago)** | **✅ (4-Ago)** | **✅*** | **✅** |
| S10 | 16-18 Jul | ✅ | ✅ | ✅ | ✅ | ✅ |
| MVP | 19-20 Jul | 🎯 | 🎯 | 🎯 | 🎯 | 🎯 |
| **S11** | **3-5 Ago** | **✅** | **✅ (3-Ago)** | **✅ (6-Ago)** | **✅*** | **✅** |
| **S12** | **6-8 Ago** | **✅** | **✅** | **✅** | **✅** | **✅** |
| S13-S20 | 10 Ago - 5 Sep | ✅ S13 | ⏳ | ⏳ | ⏳ | ⏳ |

> \* Tarea cubierta por otro integrante (detalle en la sección de cada sprint). Los testing quedaron cubiertos por la suite Jest de Tobias (119/119) y los reviews/UX por los docs del repo.

---

## Aportes del equipo no registrados antes (actualizado 10-Ago)

| Quién | Aporte | Evidencia (commit) |
|-------|--------|---------------------|
| **Juan** | Fix de ramas y dependencias mobile (S5-S6) | `Juan Mendoza`, 30-Jun |
| **Damián** | LiveKit (reemplazado luego por chat de texto); diseño web acorde a Figma (S4-S6) | `Damian Orellana`, 6-Jul · `Alxn0_7`, 7-Jul |
| **Damián** | Login básico web inicial (S1-S2) | `Alxn0_7`, 18-Jun |
| **Ezequiel** | Cierre de sesión con logo en mobile (S9-S11) | `Ivan Ezequiel Charca`, 3-Ago |
| **Thiago** | Scaffold inicial completo de `/mobile` (proyecto Expo con navegación, chat, historial, llamadas) — hoy la base de la app | `ThiagoBoca12`, 29-Jun |
