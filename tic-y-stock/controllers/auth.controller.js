const bcrypt = require('bcrypt');
const User = require('../models/user.model');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarRegistro({ nombre, email, contraseña, confirmar_contrasena }) {
  const errores = {};

  if (!nombre || nombre.trim().length < 2) {
    errores.nombre = 'Ingresá tu nombre completo.';
  }
  if (!email || !EMAIL_REGEX.test(email)) {
    errores.email = 'Ingresá un correo electrónico válido.';
  }
  if (!contraseña || contraseña.length < 6) {
    errores.contraseña = 'La contraseña debe tener al menos 6 caracteres.';
  }
  if (contraseña !== confirmar_contrasena) {
    errores.confirmar_contrasena = 'Las contraseñas no coinciden.';
  }

  return errores;
}

async function mostrarLogin(req, res) {
  if (req.session.user) {
    return res.redirect(req.session.user.rol === 'superusuario' ? '/admin' : '/panel');
  }
  res.render('login', { title: 'Iniciar sesión', error: null, email: '' });
}

async function iniciarSesion(req, res) {
  const { email, password } = req.body;
  const contraseña = String(password || '');

  if (!email || !contraseña) {
    return res.status(400).render('login', {
      title: 'Iniciar sesión',
      error: 'Completá todos los campos.',
      email: email || '',
    });
  }

  const usuario = await User.findByEmail(String(email).trim().toLowerCase());

  if (!usuario || !(await bcrypt.compare(String(contraseña), usuario.contrasena_hasheada))) {
    return res.status(401).render('login', {
      title: 'Iniciar sesión',
      error: 'Correo o contraseña incorrectos.',
      email: email || '',
    });
  }

  req.session.user = {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
  };

  // T-15: redirección según rol
  res.redirect(usuario.rol === 'superusuario' ? '/admin' : '/panel');
}

async function mostrarRegistro(req, res) {
  if (req.session.user) {
    return res.redirect(req.session.user.rol === 'superusuario' ? '/admin' : '/panel');
  }
  res.render('register', {
    title: 'Crear cuenta',
    errores: {},
    datos: { nombre: '', email: '' },
  });
}

async function registrar(req, res) {
  const datos = {
    nombre: String(req.body.nombre || '').trim(),
    email: String(req.body.email || '').trim().toLowerCase(),
    contraseña: String(req.body.password || ''),
    confirmar_contrasena: String(req.body.confirmar_contrasena || ''),
  };

  const errores = validarRegistro(datos);

  if (Object.keys(errores).length === 0) {
    const existe = await User.findByEmail(datos.email);
    if (existe) {
      errores.email = 'Ya existe una cuenta con ese correo.';
    }
  }

  if (Object.keys(errores).length > 0) {
    return res.status(400).render('register', {
      title: 'Crear cuenta',
      errores,
      datos: { nombre: datos.nombre, email: datos.email },
    });
  }

  const contraseñaHasheada = await bcrypt.hash(datos.contraseña, 10);
  const id = await User.create({
    nombre: datos.nombre,
    email: datos.email,
    contraseñaHasheada,
  });

  req.session.user = {
    id,
    nombre: datos.nombre,
    email: datos.email,
    rol: 'usuario',
  };

  res.redirect('/panel');
}

function cerrarSesion(req, res) {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Error al cerrar la sesión.');
    }
    res.clearCookie('ticstock.sid');
    res.redirect('/login');
  });
}

module.exports = {
  mostrarLogin,
  iniciarSesion,
  mostrarRegistro,
  registrar,
  cerrarSesion,
};