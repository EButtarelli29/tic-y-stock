# MVP Scope — Definición Final

> **Fecha:** 30 de junio, 2026
> **Última actualización:** 11 de agosto, 2026 (post S9/S11/S12/S13)
> **Objetivo:** Definir QUÉ entra y QUÉ no entra en el MVP del 20 de julio.
> **Estado:** ✅ APROBADO — Proyecto alineado al MVP. Post-MVP: S11 (cola + online/offline), S12 (imágenes + push) y S13 (seguridad/estabilización backend) ya implementados.

---

## Principios

1. **MVP no es el producto final.** Es la versión más chica que podemos mostrar y que funcione de punta a punta.
2. **Chicle:** web para médicos (dashboard, consultas). Mobile para clientes (registro, solicitar consulta).
3. **Si un feature no está listo 3 días antes del MVP (17 julio), se saca.** Sin excepción.

---

## ✅ INCLUIDO en el MVP

| Feature | Estado actual |
|---------|--------------|
| **Auth (register + login)** | ✅ Listo (backend + web + mobile) |
| **Roles CLIENT + VET + ADMIN** | ✅ Listo (backend + web) |
| **CRUD de mascotas** | ✅ Listo (backend + web + mobile) |
| **Dashboard web del médico** | ✅ Listo (Dashboard, Pacientes, Mensajes) |
| **Registro de mascota desde mobile** | ✅ Listo |
| **Login/Registro desde mobile** | ✅ Listo |
| **Chat de texto** (reemplaza LiveKit) | ✅ Listo (web + mobile con Socket.io) |
| **Cerrar consulta + dejar notas** | ✅ Listo (web) |
| **Ver histórico de consultas** | ✅ Listo (web + mobile) |
| **Protección de rutas por rol** | ✅ Listo (backend + web) |
| **Flujo completo MVP** | ✅ Funcional |

## ❌ EXCLUIDO del MVP (pasa a post-MVP)

| Feature | Sprint estimado | Nota | Estado |
|---------|----------------|------|--------|
| **LiveKit (videollamada)** | Post-MVP (S11+) | El backend expone `POST /api/calls/:id/token` (mint de token LiveKit) y el SDK `@livekit/server-sdk` está en deps. El **cliente** mobile lanza una WebView de deep-link (`vetconnect://`) en lugar de usar el SDK de LiveKit; el flujo de videollamada no está completo en los frontends. El MVP usó chat de texto como canal principal. | 🟡 Parcial |
| **Cola de espera automática** | Post-MVP (S11) | Auto-asignación de `WAITING` al ponerse online un vet (S11, backend + web). | ✅ S11 |
| **Online/Offline del médico** | Post-MVP (S11) | Toggle en la web del médico con feedback de error + sync por socket. | ✅ S11 backend + web + mobile |
| **Historial clínico completo** | Post-MVP (S12+) | Se muestra historial básico de consultas anteriores. | — |
| **Asistente IA (Claude)** | Post-MVP | Código eliminado del proyecto MVP. | — |
| **Sistema de honorarios** | Post-MVP (S15+) | Eliminado del proyecto MVP. | — |
| **Notificaciones push** | Post-MVP (S12) | Eliminado del proyecto MVP. | ✅ S12 (backend + token mobile) |
| **Imágenes en chat** | Post-MVP (S12) | Eliminado del proyecto MVP. | ✅ S12 |
| **Stripe / pagos** | Post-MVP | Eliminado del proyecto MVP. | — |
| **Testing en 2GB RAM** | S14 (13-15 Ago) | Post-MVP por definición. | — |

---

## 📦 MVP REAL

```
CLIENTE (Mobile)               MÉDICO (Web)
       │                            │
       ├─ Registrarse ✅            ├─ Login ✅
       ├─ Iniciar sesión ✅         ├─ Ver dashboard ✅
       ├─ Registrar mascota ✅      ├─ Ver mascotas asignadas ✅
       ├─ Solicitar consulta ✅     ├─ Iniciar consulta (chat) ✅
       ├─ Chatear con médico ✅     └─ Cerrar consulta + notas ✅
       └─ Ver historial ✅
```

**Sin videollamada, sin IA, sin cola automática, sin honorarios.**

La consulta funciona así:
1. CLIENTE se registra, carga su mascota
2. CLIENTE solicita consulta (se asigna a un VET manual)
3. VET acepta la consulta
4. Chatean por texto
5. VET cierra la consulta y deja notas
6. CLIENTE ve el historial

---

## 🔧 Mejoras técnicas implementadas

| Mejora | Impacto |
|--------|---------|
| **Refresh tokens** (`POST /api/auth/refresh`) | Evita que usuarios pierdan sesión cada 7 días |
| **node-cache** para vets disponibles | Reduce queries a BD |
| **npm workspaces** (`packages/shared/`) | Tipos compartidos entre backend y web |
| **Diseño de componentes** (Button, Input, Card, Badge) | Consistencia visual web = mobile |
| **Paleta teal unificada** | Marca consistente en ambas plataformas |

---

## 📐 Sprints ejecutados

| Sprint | Feature | Estado |
|--------|---------|--------|
| S1-S5 | Setup, modelos, auth, roles, pets | ✅ |
| S6 | Conexión mobile + chat inicio | ✅ |
| S7 | Chat de texto + historial básico | ✅ |
| S8 | MVP compliance + testing | ✅ |
| S9 (actual) | Bugs finales + presentación | 🟡 |
| S10 | Freeze — solo bugs críticos | ⏳ |
| **MVP** | **20 de julio** | **🎯** |
