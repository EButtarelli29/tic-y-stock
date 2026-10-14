require('dotenv').config?.();

const express = require('express');
const session = require('express-session');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const panelRoutes = require('./routes/panel.routes');
const adminRoutes = require('./routes/admin.routes');
const apiRoutes = require('./routes/api.routes');
const institucionalRoutes = require('./routes/institucional.routes');
const { requireAuth } = require('./middleware/auth.middleware');
const { errorHandler, noEncontrado } = require('./middleware/error.middleware');
const pool = require('./models/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));

// Evita que el navegador adivine el tipo real de un archivo servido y lo
// interprete como HTML. Refuerza la validación de la subida de fotos: un
// archivo que se guarde en /uploads nunca se ejecuta aunque se declare como
// imagen.
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    name: 'ticstock.sid',
    secret: process.env.SESSION_SECRET || 'tic-stock-secret-desarrollo',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 30 * 60 * 1000,
    },
  })
);

// Mensaje de un solo uso (flash) expuesto a todas las vistas
app.use((req, res, next) => {
  res.locals.mensaje = req.session.mensaje || null;
  delete req.session.mensaje;
  next();
});

app.use('/', authRoutes);
app.use('/', panelRoutes);
app.use('/admin', adminRoutes);
// F6: resolución de códigos de barras. Va suelto en `/api` y no colgado del
// router de admin porque sólo pide sesión iniciada: el alumno también escanea,
// para ver qué es lo que tiene en la mano.
app.use('/api', apiRoutes);
app.use('/', institucionalRoutes);

app.get('/', requireAuth, (req, res) => {
  res.redirect(req.session.user.rol === 'superusuario' ? '/admin' : '/panel');
});

app.use(noEncontrado);

// Todo error no controlado cae acá. Debe ir último: Express identifica los
// middlewares de error por su firma de 4 argumentos.
app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TIC & Stock escuchando en http://localhost:${PORT}`);
  verificarBaseDeDatos();
  avisarSecretoDeDesarrollo();
});

/**
 * El secreto de sesión tiene un default de desarrollo en el código. Si se está
 * usando, cualquiera que lea el repositorio puede firmar cookies ajenas.
 */
function avisarSecretoDeDesarrollo() {
  if (!process.env.SESSION_SECRET) {
    console.warn('');
    console.warn('  [!] SESSION_SECRET no está definido: se usa el valor de desarrollo.');
    console.warn('      Para la implementación real, definilo en un archivo .env.');
    console.warn('');
  }
}

/**
 * Prueba la conexión a MySQL al arrancar. Si falla, el servidor sigue en pie
 * (las páginas públicas responden) pero avisamos por consola qué hay que hacer,
 * en vez de dejar que el primer POST /login tire el proceso abajo.
 */
async function verificarBaseDeDatos() {
  const destino = `${process.env.DB_HOST || '127.0.0.1'}:${process.env.DB_PORT || 3306}/${process.env.DB_NAME || 'tic_stock'}`;
  try {
    await pool.query('SELECT 1');
    console.log(`Base de datos conectada (${destino}).`);
  } catch (err) {
    console.warn('');
    console.warn(`  [!] No se pudo conectar con MySQL en ${destino} (${err.code}).`);
    console.warn('      Las páginas públicas funcionan, pero el login y el inventario no.');
    console.warn('      Arrancá MySQL desde el XAMPP Control Panel y creá la base:');
    console.warn('          cmd /c "mysql -u root < db\\schema.sql"');
    console.warn('      Después creá la cuenta docente con: npm run db:seed');
    console.warn('');
  }
}

// Conexiones que caen del pool sin estar en uso: se registran en vez de
// matar el proceso.
pool.on('error', (err) => {
  console.error('[db] error en una conexión del pool:', err.code || err.message);
});