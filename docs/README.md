# TIC & Stock — Sprint 1: Login y Registro

> Documentacion completa (funcionamiento, puesta en marcha, rutas y seguridad): [`docs/DOCUMENTACION.md`](docs/DOCUMENTACION.md) (tambien en PDF).

Modulo de acceso seguro con roles para el proyecto "TIC & Stock" (Escuela Tecnica N°20 DE 20 "Carolina Muzilli").

Sigue la decision de arquitectura del equipo: **monolito en capas** (presentacion / logica de negocio / datos)
en **Node.js + Express**, **MySQL** como motor de base de datos, sesiones con `express-session` y
contrasenas hasheadas con `bcryptjs`.

## Instalacion

1. Instalar dependencias: `npm install`
2. Crear el archivo `.env` copiando `.env.example` y completar los datos de MySQL.
3. Crear la base y la tabla de usuarios:

```
mysql -u root -p < database/schema.sql
```

4. Crear el superusuario inicial (docente / jefe de taller):

```
node scripts/create-admin.js
```

5. Levantar el servidor:

```
node app.js
```

Abrir http://localhost:3000

## Estructura (por capas)

| Carpeta     | Responsabilidad                                              |
|-------------|--------------------------------------------------------------|
| `routes/`   | Definicion de endpoints. Rutas delgadas, sin logica.          |
| `controllers/` | Logica de negocio del login y registro.                    |
| `models/`   | Acceso a datos (SQL parametrizado). La UI no consulta la DB.  |
| `middleware/` | Proteccion de rutas (`requireLogin`) y autorizacion por rol (`requireRol`). |
| `utils/`    | Validaciones de entrada reutilizables y testeadas.            |
| `config/`   | Configuracion del entorno y pool de conexiones.              |
| `views/`    | Vistas EJS.                                                   |
| `scripts/`  | Utilidades de soporte (creacion de administradores).          |
| `tests/`    | Pruebas automaticas de las validaciones.                      |

## Como se aplica la teoria

- **Cohesion alta**: cada modulo tiene una unica razon de cambio. El controlador no escribe SQL,
  el modelo no arma vistas y las rutas no contienen logica.
- **Acoplamiento bajo**: las capas se comunican por funciones pequenas y por datos simples
  (`req.body`, objetos de sesion). Se puede reemplazar el hash (bcrypt -> argon2) o el driver de
  base de datos sin tocar rutas ni vistas.
- **Buenas practicas**: contrasenas hasheadas con bcrypt (nunca en texto plano), consultas
  parametrizadas (no hay concatenacion de SQL), sesiones con cookie `httpOnly`, regeneracion de
  sesion tras el login, redireccion por rol, errores genericos al cliente y validaciones
  separadas y unit-testeadas.

## Roles

- `usuario` (alumno): panel de alumno.
- `superusuario` (docente / jefe de taller): panel de administracion.

## Pruebas

```
npm test
```