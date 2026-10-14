const bcrypt = require('bcrypt');
const User = require('../models/user.model');
const { registrarFallo, registrarExito } = require('../middleware/rate-limit.middleware');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Límites de longitud según los VARCHAR del esquema (db/schema.sql).
const MAX_NOMBRE = 120;
const MAX_EMAIL = 190;
const MIN_PASSWORD = 6;

/**
 * Deja autenticada a la persona, regenerando el identificador de sesión.
 *
 * Sin `regenerate()`, el `ticstock.sid` que tenía el visitante antes de
 * autenticarse sigue siendo válido después del login: eso es session fixation,
 * y permite que alguien se registre una sesión a sí mismo y espere a que la
 * víctima entre con ese mismo identificador. `regenerate()` tira la sesión vieja
 * y emite un cookie nuevo.
 *
 * OJO con el nombre: el handler de la ruta también se llama `iniciarSesion`.
 * Si este helper se llamara igual, la declaración de la ruta lo pisaría por
 * hoisting y el login se llamaría a sí mismo en bucle.
 */
function crearSesion(req, usuario) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.user = {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      };
      req.session.save((errSave) => (errSave ? reject(errSave) : resolve()));
    });
  });
}

function validarRegistro({ nombre, email, contraseña, confirmar_contrasena }) {
  const errores = {};

  if (!nombre || nombre.trim().length < 2) {
    errores.nombre = 'Ingresá tu nombre completo.';
  } else if (nombre.length > MAX_NOMBRE) {
    errores.nombre = `El nombre no puede superar los ${MAX_NOMBRE} caracteres.`;
  }
  if (!email || !EMAIL_REGEX.test(email)) {
    errores.email = 'Ingresá un correo electrónico válido.';
  } else if (email.length > MAX_EMAIL) {
    errores.email = 'El correo es demasiado largo.';
  }
  if (!contraseña || contraseña.length < MIN_PASSWORD) {
    errores.contraseña = `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`;
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
    registrarFallo(req);
    return res.status(401).render('login', {
      title: 'Iniciar sesión',
      error: 'Correo o contraseña incorrectos.',
      email: email || '',
    });
  }

  registrarExito(req);

  await crearSesion(req, usuario);

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

  // Alta + login en un solo paso: también regenera el identificador de sesión.
  await crearSesion(req, { id, nombre: datos.nombre, email: datos.email, rol: 'usuario' });

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