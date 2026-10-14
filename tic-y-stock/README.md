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

- [x] **T-16** Tablas de dominio (F1): `items`, `movimientos`, `alertas`, `solicitudes`, `contactos` (con claves foráneas)
- [x] **T-17** ABM de insumos (ver T-51 a T-53)
- [x] **T-18** Validación de datos y fotos de insumo (multer, 5 MB, JPG/PNG/WEBP/GIF)
- [x] **T-19** Vista de lista de insumos (`/admin/inventario`) con filtros por estado/categoría y paginación
- [x] **T-20** Búsqueda en tiempo real del inventario (filtro en el servidor con debounce)
- [x] **T-21** Vista de detalle del insumo en el panel
- [x] **T-22** Apartado institucional `/institucional` (F10)
- [x] **T-23** Formulario de contacto `/contacto` (almacena consultas)

## Requerimientos — Etapa 3 (Sprints 6 a 8): movimientos de stock

### F5 — Registro de movimientos (T-28 a T-32)

- [x] **T-28** Interfaz de registro manual de retiro y de devolución
      (`/admin/movimientos/retiro` y `/admin/movimientos/devolucion`)
- [x] **T-29** Lógica de retiro: descuenta stock y registra usuario, fecha y hora
      (en una transacción con la escritura del movimiento)
- [x] **T-30** Lógica de devolución: repone el stock y cierra el movimiento
- [x] **T-31** Historial de movimientos con filtro por ítem, usuario y fecha
      (`/admin/movimientos`, paginado y con orden)
- [x] **T-32** Vista de "mis préstamos activos" para el alumno (`/panel/mis-prestamos`)

### Cómo se modela un préstamo

Un movimiento es un **evento**: "en este momento, esta persona se llevó estas unidades
de este ítem". La devolución es un evento aparte que apunta, con `id_retiro`, al retiro
que cierra. El esquema original solo tenía el `ENUM('retiro','devolucion')`, que obliga a
elegir entre "guardar un evento por fila, auditable" o "cerrar el movimiento en el lugar
(pisando la fila original)". Se eligió la primera porque:

- "Cierra el movimiento" (T-30) se cumple igual: el préstamo deja de estar activo.
- El historial queda auditable: se ve quién retiró, cuándo y quién devolvió, aunque no
  sean la misma persona (el docente suele recibir la devolución de un compañero).
- "Mis préstamos activos" es un `anti-join` limpio (`NOT EXISTS` una devolución) y no
  hay que distinguir "devuelto" de "nunca devuelto" por una fecha nullable.
- Deja el lugar para que una alerta cuelgue del préstamo (F7 / T-41).

Tres restricciones de base acompañan al diseño:

| Restricción | Para qué |
| --- | --- |
| `CHECK (tipo='retiro' AND id_retiro IS NULL) OR (tipo='devolucion' AND id_retiro IS NOT NULL)` | el vínculo es coherente con el tipo |
| `UNIQUE (id_retiro)` | un retiro se devuelve **como máximo una vez** (devoluciones parciales quedan fuera de alcance) |
| `ON DELETE CASCADE` en `id_retiro` | borrar un retiro borra su devolución, como el resto de `movimientos` |

`movimientos.cantidad` (con default 1) es indispensable para "descontar stock": sin él un
ENUM binario no puede anotar "retiró 3 de 12 cables". `movimientos.observaciones` es el
contexto del movimiento ("para qué lo necesita", "volvió con la pinza faltante").

### Qué puede hacer cada rol

El **superusuario** (docente) registra el retiro y la devolución de cualquiera. El
**usuario** (alumno) es de solo lectura: ve sus préstamos activos y su historial en
`/panel/mis-prestamos`. Pedirle al alumno que registre su propia devolución dejaría el
stock en manos de cualquiera que entre con su cuenta; el flujo de pedido y aprobación es
F8 (solicitudes), no F5.

### `items.estado` se calcula a partir de los movimientos

El estado tiene **dos ejes con dueñas distintas**, y esa separación es lo que hace que
pueda ser derivado sin pisar un dato humano:

| Valor | Quién lo pone | Por qué |
| --- | --- | --- |
| `baja` | el docente | el material salió del pañol: no se retira ni se devuelve |
| `en_reparacion` | el docente | es por definición un dato que carga una persona |
| `prestado` / `disponible` | **la aplicación** | depende solo de si hay préstamos abiertos |

La regla, en una línea: si el ítem está en `baja` o `en_reparacion` gana lo que haya
decidido el docente; si no, el estado es "prestado" mientras exista algún retiro sin
devolución, y "disponible" cuando no quede ninguno. Un osciloscopio puede estar en el
taller de reparaciones *y* prestado, y el recálculo respeta las dos cosas.

`items.estado` se recalcula dentro de la misma transacción que el movimiento que lo
disparó, y también al guardar el formulario de un ítem (que es la otra vía por la que el
estado podría volver a mentir). Por eso el formulario de alta y edición dice que
"disponible" y "prestado" los calcula el sistema, y si al guardar el valor no coincide
con lo que se pidió, sale un aviso que explica por qué quedó como quedó.

`migracion-02-movimientos.sql` normaliza las bases que ya tenían ítems marcados
`prestado` sin ningún préstamo registrado, que es exactamente la mentira que esto
elimina.

El inventario muestra además una columna **Préstamos** con la cantidad real de
préstamos abiertos de cada ítem, enlazada al historial ya filtrado: es el control
visible de que el estado y los movimientos cuentan lo mismo.

### No se puede borrar lo que está prestado

`items.id` y `usuarios.id` están en `CASCADE` sobre `movimientos`, así que borrar un
usuario o un ítem arrastra sus movimientos. Con material afuera del pañol, eso borraría
el único registro de quién se llevó qué **y** dejaría el stock con una unidad menos de
las que realmente hay, sin que nadie haya tocado el inventario. Por eso `Item.remove` y
`User.remove` se niegan cuando hay préstamos abiertos y piden registrar la devolución
antes. Es el mismo criterio que el `RESTRICT` de `solicitudes`: un registro
administrativo se resuelve a mano, no se borra.

Fuera de alcance en esta etapa: escaneo de códigos/QR (F6), alertas (F7) y
reservas/solicitudes (F8). Quedan para los próximos sprints.

## Puesta en marcha

Requisitos: Node.js 18+ y MySQL (XAMPP sirve).

1. Levantar MySQL desde el **XAMPP Control Panel**. El servicio `MySQL80` de Windows
   también sirve, pero en ese caso hay que completar `DB_USER` / `DB_PASSWORD` en `.env`.

2. Crear la base de datos y las 6 tablas:

   ```bash
   mysql -u root < db/schema.sql
   ```

3. Instalar dependencias:

   ```bash
   npm install
   ```

4. (Opcional) Configurar el entorno. Los defaults ya apuntan a XAMPP, así que
   `.env` solo hace falta si cambiás algo:

   ```bash
   copy .env.example .env      # Windows PowerShell
   ```

5. (Opcional) Crear la cuenta de superusuario inicial (docente / Jefe de Taller):

   ```bash
   npm run db:seed
   # credenciales por defecto: docente@ticystock.ar / docente123
   # configurá SEED_NOMBRE, SEED_EMAIL y SEED_CONTRASENA en un archivo .env
   ```

6. (Opcional) Cargar 34 insumos de ejemplo del taller (6 en stock crítico) para probar
   filtros, búsqueda, paginación y el dashboard sin cargar todo a mano:

   ```bash
   npm run db:demo                 # no pisa lo que ya está cargado
   npm run db:demo -- --reset      # reemplaza los ítems existentes
   ```

   Y, encima de esos ítems, un historial de retiros y devoluciones repartido en el mes
   (16 movimientos, 2 préstamos sin devolver) para poder ver F5 con contenido. Los dos
   préstamos abiertos caen en ítems que el demo ya marca como `prestado`, así el
   `estado` manual y los movimientos cuentan la misma historia:

   ```bash
   npm run db:demo -- --movimientos   # aparte: no cambia las cantidades de los ítems
   ```

7. Iniciar el servidor:

   ```bash
   npm start        # o: npm run dev (nodemon)
   ```

8. Abrir `http://localhost:3000`. Para que otros equipos de la red escolar accedan,
   usar la IP del servidor dentro de la red (el servidor escucha en `0.0.0.0:3000`).

Al arrancar, el servidor verifica que MySQL responda. Si no, lo avisa por consola con
los pasos a seguir y sigue levantándose (las páginas públicas funcionan igual).

### Migraciones

`db/schema.sql` sirve tanto para una base nueva como para reinstalar. Para una base que
ya existe y hay que actualizar, hay migraciones numeradas en `db/`:

```powershell
& 'C:\xampp\mysql\bin\mysql.exe' -u root --default-character-set=utf8mb4 -e "source db/migracion-01-fks.sql"
& 'C:\xampp\mysql\bin\mysql.exe' -u root --default-character-set=utf8mb4 -e "source db/migracion-02-movimientos.sql"
```

Cada migración es idempotente (se puede correr más de una vez) y avisa por pantalla si
encuentra datos que la van a bloquear, sin tocar nada.

### Verificación (no hay tests automatizados en el repo)

No hay lint, typecheck ni tests. Para verificar los flujos a mano, con el server ya
levantado en el puerto 3000 y la base cargada:

```powershell
powershell -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\Temp\opencode\test_sprints.ps1"   # 29 chequeos
node "$env:LOCALAPPDATA\Temp\opencode\smoke-test.js"                                          # 60 chequeos
node "$env:LOCALAPPDATA\Temp\opencode\test-f5.js"                                             # 134 chequeos (F5)
```

Recorren público, alumno y superusuario, y borran los datos que crean. Están fuera del
repo porque los dos de Node hardcodean el `path` de MySQL de esta máquina; si los agregás
al repo, acordá antes el `path` de XAMPP o parametrizalo. La verificación visual se hizo
con `revisa-html-f5.js`, que chequea el HTML renderizado (clases presentes en el CSS,
marcado balanceado, sin `undefined`) porque no había forma de tomar capturas.

### Configuración (variables de entorno, archivo `.env`)

Copiá `.env.example` a `.env` y ajustá lo que necesites. `.env` está en `.gitignore`.

| Variable | Default | Descripción |
| --- | --- | --- |
| `PORT` | `3000` | Puerto del servidor |
| `DB_HOST` / `DB_PORT` | `127.0.0.1` / `3306` | Host y puerto de MySQL |
| `DB_USER` / `DB_PASSWORD` | `root` / `` | Credenciales de MySQL (XAMPP por defecto) |
| `DB_NAME` | `tic_stock` | Nombre de la base de datos |
| `SESSION_SECRET` | valor de desarrollo | Secreto de las sesiones (cambiar en producción) |
| `SEED_NOMBRE` | `Docente TIC` | Nombre de la cuenta superusuario inicial |
| `SEED_EMAIL` | `docente@ticystock.ar` | Correo de esa cuenta |
| `SEED_CONTRASENA` | `docente123` | Contraseña. En ASCII a propósito: las variables con `ñ` fallan según la codificación de la consola |

## Estructura del proyecto

```
tic-y-stock/
├── server.js                 # Entrada: Express, sesiones, rutas, vistas
├── routes/                   # Capa de rutas: auth, panel, admin, institucional
├── controllers/              # Capa de negocio: auth, panel, item, movimiento, admin, institucional
├── middleware/               # auth, upload (multer), rate-limit, error
├── models/                   # Capa de datos: db.js, user, item, movimiento, alerta, contacto
├── db/
│   ├── schema.sql            # Esquema MySQL (6 tablas con claves foráneas)
│   ├── migracion-01-fks.sql  # Agrega las claves foráneas a una base ya instalada
│   └── migracion-02-movimientos.sql  # cantidad, vínculo devolución→retro y sus restricciones
├── scripts/                  # crear-superusuario.js (db:seed), datos-demo.js (db:demo)
├── views/                    # Plantillas EJS + partials/: head, nav
├── .env.example              # Plantilla de configuración (copiar a .env)
├── public/
│   ├── css/styles.css        # Estilos del frontend
│   ├── js/                   # Validaciones de formularios y filtros en vivo
│   └── uploads/items/        # Fotos de insumos (multer, ignorada por git)
```

## Manejo de errores

Express 4 no captura los rechazos de promesa de los handlers `async`. Por eso
**toda función asíncrona que se registre como ruta va envuelta en `asyncHandler()`**:

```js
const { asyncHandler } = require('../middleware/error.middleware');

router.get('/ruta', asyncHandler(miControlador.miAccion));
```

Sin ese envoltorio, un fallo de MySQL (por ejemplo, el servicio apagado) sube como
`unhandledRejection` y **termina el proceso del servidor**. Con él, el error llega a
`errorHandler`, que devuelve una página 503 con un mensaje útil en lugar de cortar todo.

Al arrancar, el servidor prueba la conexión a MySQL y avisa por consola con los pasos a
seguir si no puede conectarse (las páginas públicas siguen funcionando). Si MySQL se cae
con el server ya levantado, las rutas que necesitan la base devuelven un **503** con un
mensaje explicativo en vez de tumbar el proceso.

`renderError(req, res, codigo, detalle, titulo)` es el único camino para renderizar la
vista de error: siempre pasa `user` y `seccion` (los necesita el navbar; si faltaran,
EJS tiraría `ReferenceError` y el 404 se convertiría en un 500) y escribe el texto del
error en `detalle`, no en `mensaje`, que es el mensaje flash del navbar.

## Roles

- **usuario** — alumno: se crea por registro público. Accede a `/panel` (catálogo con filtros y detalle)
  y a `/panel/mis-prestamos` (sus préstamos activos y su historial, solo lectura).
- **superusuario** — docente / Jefe de Taller: se crea solo con `npm run db:seed` (no hay registro público).
  Accede a `/admin`: dashboard, inventario (CRUD), movimientos (retiros y devoluciones) y gestión de usuarios.

## Base de datos

6 tablas con claves foráneas. La política de borrado depende de si el registro tiene
valor histórico:

| Relación | Al borrar el padre | Por qué |
| --- | --- | --- |
| `movimientos.id_item`, `movimientos.id_usuario` | `CASCADE` | un movimiento sin ítem o sin usuario no es trazable |
| `movimientos.id_retiro` (a `movimientos.id`) | `CASCADE` | la devolución cuelga del retiro que cierra |
| `alertas.id_movimiento` | `CASCADE` | la alerta cuelga del movimiento |
| `solicitudes.id_usuario`, `solicitudes.id_item` | `RESTRICT` | una solicitud es un registro administrativo: hay que resolverla a mano, no se pierde sola |

Cuando un `RESTRICT` bloquea un borrado, el `errorHandler` responde **409** con un
mensaje en vez de un 500 genérico.

Ojo: el MySQL de XAMPP no trae `STRICT_TRANS_TABLES`, así que un `INSERT` con un texto
más largo que el `VARCHAR` se **trunca en silencio**. Por eso todos los formularios
validan la longitud contra el ancho de la columna y los `input` llevan `maxlength`.

### Transacciones

Un retiro o una devolución escriben en **dos** tablas: el movimiento y el stock del ítem.
Si la segunda fallara, el inventario mostraría material que en realidad ya se fue, así que
ambas van en una transacción (`db.withTransaction(fn)` en `models/db.js`), que toma una
conexión dedicada, hace `commit` o `rollback` y la libera siempre. El retiro bloquea la
fila del ítem con `FOR UPDATE`, así que dos retiros simultáneos del mismo material no
pueden leer el mismo stock y ambos "pasar": **`items.cantidad` no puede quedar negativa**.

Los errores de validación (no hay stock, el préstamo ya fue devuelto) **no** son
excepciones: son el camino normal de un formulario mal completado. Por eso
`registrarRetiro` y `registrarDevolucion` devuelven `{ ok, errores }` y el controlador los
pinta en el formulario.

La conciliación se puede auditar con una consulta: `SUM(retiros) - SUM(devoluciones)` son
las unidades que están afuera del pañol, así que `items.cantidad + delta` es el total que
el taller posee de ese material y no cambia por una operación de la app (solo si el
docente edita el ítem a mano).

## Seguridad

- Contraseñas hasheadas con `bcrypt` (nunca en texto plano).
- Consultas parametrizadas (`mysql2`), sin inyección SQL. El `ORDER BY` y el `LIMIT` van
  por lista blanca / valores enteros, nunca interpolados desde la URL.
- Sesión con cookie `httpOnly` + `sameSite: lax`, expiración por inactividad de 30 minutos.
- El identificador de sesión se **regenera al iniciar sesión** (`regenerate()`), lo que
  evita el session fixation. Ojo con el nombre del helper: si el helper `crearSesion` se
  llamara igual que el handler `iniciarSesion` de la ruta, el hoisting lo pisaría y el
  login se llamaría a sí mismo en bucle.
- Los privilegios **se releen de la base en cada request autenticado** (`requireAuth`):
  degradar o borrar una cuenta corta el acceso en la sesión viva, no 30 minutos después.
- Límite de intentos de login: 8 fallos por IP + correo bloquean 15 minutos (429).
- **Subida de fotos**: el MIME tiene que ser una imagen conocida *y* la extensión tiene
  que estar en la lista blanca; el archivo se guarda siempre con la extensión del MIME
  detectado, no con la del nombre original. Si no, un `.html` declarado como `image/png`
  se guardaba como `.html` y lo servía `express.static` como HTML de la app (XSS
  almacenado). Además se manda `X-Content-Type-Options: nosniff`.
- Errores de base de datos devuelven un 503 con mensaje genérico (nunca el stack al cliente);
  el detalle va a la consola del servidor.
- Las páginas de error incluyen el navbar, así que un 404 no deja al usuario sin salida.