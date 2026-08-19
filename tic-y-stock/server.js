require('dotenv').config?.();

const express = require('express');
const session = require('express-session');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const { requireAuth, requireSuperusuario } = require('./middleware/auth.middleware');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
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

app.use('/', authRoutes);

app.get('/', requireAuth, (req, res) => {
  res.redirect(req.session.user.rol === 'superusuario' ? '/admin' : '/panel');
});

app.get('/panel', requireAuth, (req, res) => {
  res.render('panel', {
    title: 'Panel del alumno',
    user: req.session.user,
    seccion: 'panel',
  });
});

app.get('/admin', requireAuth, requireSuperusuario, (req, res) => {
  res.render('admin', {
    title: 'Panel del superusuario',
    user: req.session.user,
    seccion: 'admin',
  });
});

app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Página no encontrada',
    codigo: 404,
    mensaje: 'La página que buscás no existe.',
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`TIC & Stock escuchando en http://localhost:${PORT}`);
});