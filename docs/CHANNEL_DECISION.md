# Channel Strategy — Web + Mobile

> **Decisión:** Ambos canales. Web para médicos (dashboard pesado). Mobile para clientes (registro rápido desde el celular).
> **Estado:** ✅ Implementado — MVP con ambos canales funcionales.

---

## 1. La división por rol

| Perfil | Canal primario | Estado MVP |
|--------|---------------|------------|
| **VET (veterinario)** | **Web** — Dashboard, Pacientes, Chat, Cerrar consulta | ✅ Implementado |
| **CLIENT (dueño)** | **Mobile** (principal) + Web (alternativo) | ✅ Mobile funcional, web también disponible |
| **ADMIN** | Web | 🟡 Básico |

---

## 2. Estado actual de cada canal (6 Ago 2026)

| Aspecto | Web | Mobile |
|---------|-----|--------|
| Auth | ✅ Login + Register + ProtectedRoute | ✅ Login + Register + secure store |
| Pets CRUD | ✅ Lista, crear, editar | ✅ Lista, crear, detalle, foto |
| Chat | ✅ Chat con Socket.io + cerrar consulta + **imágenes (S12)** | ✅ Chat con veterinario (polling + socket) + **imágenes (S12)** + push |
| Historial | ✅ Básico | ✅ Con rating post-consulta |
| Landing | ✅ Profesional con servicios | — (navegación directa a auth) |
| Design System | ✅ Teal unificado con mobile | ✅ Misma paleta y componentes |
| Responsable | Damián + Tobias | Juan + Tobias |

---

## 3. Lo que se construyó para el MVP

### Web (vet dashboard)
- Dashboard con stats y citas del día
- Lista de pacientes asignados con búsqueda
- Chat en tiempo real con dueños de mascotas
- Botón "Cerrar consulta" con modal de notas

### Mobile (client app)
- Registro/login con almacenamiento seguro de tokens
- CRUD de mascotas con foto (Cloudinary)
- Chat con veterinario durante consulta activa
- Solicitar consulta (auto-asignación de la cola cuando un vet se pone online)
- Historial con valoración post-consulta

---

## 4. Features post-MVP (S11+)

| Feature | Canal | Sprint | Estado |
|---------|-------|--------|--------|
| Cola de espera automática | Mobile + Web | S11 | ✅ |
| Online/Offline del médico | Web | S11 | ✅ (toggle web + sync por socket + feedback de error) |
| Imágenes en el chat | Mobile + Web | S12 | ✅ |
| Notificaciones push | Mobile | S12 | ✅ (backend + registro de token mobile) |
| Seguridad/estabilización backend (S13) | — | S13 | ✅ Tobías: rol fijo, password oculta, migraciones, `.env` fuera de git, logout revoca |
| **Sistema de calificaciones** | Mobile + Web | S11+ (sesión 11-Ago) | ✅ Reviews 1-5 post-consulta (`POST /consultations/:id/rating`), promedio + cantidad en directorio, filtro `minRating`, orden por rating, estrellas en historial mobile y directorio web |
| **Videollamada (LiveKit)** | Mobile + Web | S13 (sesión 12-Ago) | ✅ Backend (tokens + rooms) + sala web + WebView mobile. **Pendiente:** credenciales de producción (`LIVEKIT_URL/API_KEY/API_SECRET`) + prueba real con 2 dispositivos |
| Asistente IA | Mobile | Post-MVP | — |
| Sistema de honorarios | Web | Post-MVP | — |

---

## 5. Resumen

| Decisión | Valor |
|----------|-------|
| ¿Hacemos web y mobile? | **Sí** — ambos funcionando |
| Web para | Médicos (dashboard, consultas) |
| Mobile para | Clientes (registro, solicitar consulta, chat) |
| ¿Mobile llegó al MVP? | **Sí** — funcional y alineado al scope |
| ¿Plan B si mobile no llegaba? | Web responsive — no fue necesario |
