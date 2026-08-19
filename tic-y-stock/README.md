# TIC & Stock

Sistema de gestión de insumos TIC del taller — Escuela Técnica N°20 DE 20 "Carolina Muzilli".
Proyecto Integrador III · 6° 2° · 2026.

## Arquitectura

Definida en el documento `Proyecto Integrador III - 6°2° - 2026(1).md` (Actividad 24 — Arquitecturas).
**Monolito en 3 capas** (presentación / lógica de negocio / datos) con **Node.js + Express**, **MySQL** como
motor de base de datos, sesiones con `express-session` + `bcrypt`, y vistas con **EJS**.

| Capa | Tecnología |
| --- | --- |
| Presentación | HTML5, CSS3, JavaScript vanilla, EJS |
| Lógica de negocio | Node.js + Express (rutas, controladores, middlewares) |
| Datos | MySQL (`mysql2`) |
| Sesiones / auth | `express-session` + `bcrypt` + middleware de roles |

La carpeta `../Figma/` contiene el prototipo visual exportado de Figma: **referencia de diseño únicamente**
(colores, layout), no de arquitectura.

## Requerimientos — Etapa 1 (Sprint 2: Login y registro)

Fuente: tareas T-08 a T-15 del Product Backlog (Actividad 17) y PMV (Actividad 15).

- [x] **T-08** Maquetar pantalla de login (diseño según prototipo Figma)
- [x] **T-09** Formulario de login con validación en frontend (JS)
- [x] **T-10** Autenticación en backend con verificación de contraseña hasheada (`bcrypt`)
- [x] **T-11** Sistema de sesiones con control de rol (`usuario` / `superusuario`)
- [x] **T-12** Cierre de sesión y expiración por inactividad (cookie 30 min, rolling)
- [x] **T-13** Maquetar pantalla de registro de nuevos usuarios
- [x] **T-14** Validación de datos del registro (frontend + backend) y alta en base de datos
- [x] **T-15** Redirección según rol al iniciar sesión (`/admin` vs `/panel`)
- [x] **T-02** Tabla `usuarios` en MySQL (id, nombre, email, contraseña_hasheada, rol, fecha_creación)

Fuera de alcance en esta etapa: CRUD de inventario (F3), consulta de stock (F4), movimientos (F5),
escaneo (F6), alertas (F7), reservas (F8), panel completo (F9), apartado institucional (F10).

## Puesta en marcha

Requisitos: Node.js 18+ y MySQL (XAMPP sirve).

1. Crear la base de datos y la tabla de usuarios:

   ```bash
   mysql -u root < db/schema.sql
   ```

2. Instalar dependencias:

   ```bash
   npm install
   ```

3. (Opcional) Crear la cuenta de superusuario inicial (docente / Jefe de Taller):

   ```bash
   npm run db:seed
   # credenciales por defecto: docente@ticystock.ar / docente123
   # configurá SEED_NOMBRE, SEED_EMAIL y SEED_CONTRASEÑA en un archivo .env
   ```

4. Iniciar el servidor:

   ```bash
   npm start        # o: npm run dev (nodemon)
   ```

5. Abrir `http://localhost:3000`. Para que otros equipos de la red escolar accedan,
   usar la IP del servidor dentro de la red (el servidor escucha en `0.0.0.0:3000`).

### Configuración (variables de entorno, archivo `.env`)

| Variable | Default | Descripción |
| --- | --- | --- |
| `PORT` | `3000` | Puerto del servidor |
| `DB_HOST` / `DB_PORT` | `127.0.0.1` / `3306` | Host y puerto de MySQL |
| `DB_USER` / `DB_PASSWORD` | `root` / `` | Credenciales de MySQL (XAMPP por defecto) |
| `DB_NAME` | `tic_stock` | Nombre de la base de datos |
| `SESSION_SECRET` | valor de desarrollo | Secreto de las sesiones (cambiar en producción) |
| `SEED_*` | ver script | Credenciales de la cuenta superusuario inicial |

## Estructura del proyecto

```
tic-y-stock/
├── server.js                 # Entrada: Express, sesiones, rutas, vistas
├── routes/                   # Capa de rutas (auth.routes.js)
├── controllers/              # Capa de lógica de negocio (auth.controller.js)
├── middleware/               # auth.middleware.js (requireAuth, requireSuperusuario)
├── models/                   # Capa de datos (db.js, user.model.js)
├── db/schema.sql             # Esquema MySQL
├── scripts/                  # crear-superusuario.js (npm run db:seed)
├── views/                    # Plantillas EJS (login, register, panel, admin, error)
└── public/                   # CSS y JS del frontend (validación)
```

## Roles

- **usuario** — alumno: se crea por registro público. Redirige a `/panel` (en construcción, Sprint 3).
- **superusuario** — docente / Jefe de Taller: se crea solo con `npm run db:seed` (no hay registro público).
  Redirige a `/admin` (en construcción, Sprints 4-9).

## Seguridad

- Contraseñas hasheadas con `bcrypt` (nunca en texto plano).
- Consultas parametrizadas (`mysql2`), sin inyección SQL.
- Sesión con cookie `httpOnly` + `sameSite: lax`, expiración por inactividad de 30 minutos.
- Acceso por rol: los alumnos no pueden ingresar a `/admin`; usuarios no logueados redirigen a `/login`.