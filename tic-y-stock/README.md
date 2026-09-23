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

## Requerimientos — Etapa 2 (Sprints 3 a 5)

### Sprint 3: Interfaz principal (T-24 a T-27)

- [x] **T-24** Panel del alumno (`/panel`): catálogo de insumos con tarjetas
- [x] **T-25** Filtros por tipo de insumo y disponibilidad
- [x] **T-26** Búsqueda por nombre en tiempo real (debounce + `fetch`)
- [x] **T-27** Detalle del insumo (`/panel/item/:id`)

### Sprint 4: Panel de administración (T-47 a T-49, T-51 a T-53)

- [x] **T-47** Navegación global según rol (navbar con enlaces)
- [x] **T-48** Dashboard `/admin`: tarjetas con estadísticas y últimos movimientos
- [x] **T-49** Gestión de usuarios: ABM con restricciones (no borrar/descender último `superusuario`, no borrar cuenta propia)
- [x] **T-51** Alta de insumos
- [x] **T-52** Edición de insumos
- [x] **T-53** Baja de insumos (con confirmación)

### Sprint 5: Operaciones CRUD (T-16 a T-23)

- [x] **T-16** Tablas de dominio (F1): `items`, `movimientos`, `alertas`, `solicitudes`, `contactos`
- [x] **T-17** ABM de insumos (ver T-51 a T-53)
- [x] **T-18** Validación de datos y fotos de insumo (multer, 5 MB, JPG/PNG/WEBP/GIF)
- [x] **T-19** Vista de lista de insumos (`/admin/inventario`) con filtros por estado/categoría
- [x] **T-20** Búsqueda en tiempo real del inventario (JSON `/admin/inventario/buscar`)
- [x] **T-21** Vista de detalle del insumo en el panel
- [x] **T-22** Apartado institucional `/institucional` (F10)
- [x] **T-23** Formulario de contacto `/contacto` (almacena consultas)

Fuera de alcance en esta etapa: movimientos de stock (F5), escaneo de códigos/QR (F6),
alertas (F7) y reservas/solicitudes (F8). Quedan para Sprints 6+.

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
├── routes/                   # Capa de rutas: auth, panel, admin, institucional
├── controllers/              # Capa de negocio: auth, panel, item, admin, institucional
├── middleware/               # auth.middleware.js, upload.middleware.js (multer)
├── models/                   # Capa de datos: db.js, user, item, movimiento, alerta, contacto
├── db/schema.sql             # Esquema MySQL (6 tablas)
├── scripts/                  # crear-superusuario.js (npm run db:seed)
├── views/                    # Plantillas EJS + partials/: head, nav, error
├── public/
│   ├── css/styles.css        # Estilos del frontend
│   ├── js/                   # Validaciones y búsquedas en tiempo real
│   └── uploads/items/        # Fotos de insumos (multer, ignorada por git)
```

## Roles

- **usuario** — alumno: se crea por registro público. Accede a `/panel` (catálogo con filtros y detalle).
- **superusuario** — docente / Jefe de Taller: se crea solo con `npm run db:seed` (no hay registro público).
  Accede a `/admin`: dashboard, inventario (CRUD) y gestión de usuarios.

## Seguridad

- Contraseñas hasheadas con `bcrypt` (nunca en texto plano).
- Consultas parametrizadas (`mysql2`), sin inyección SQL.
- Sesión con cookie `httpOnly` + `sameSite: lax`, expiración por inactividad de 30 minutos.
- Acceso por rol: los alumnos no pueden ingresar a `/admin`; usuarios no logueados redirigen a `/login`.