const Contacto = require('../models/contacto.model');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Límites de longitud según los VARCHAR del esquema (db/schema.sql). Sin esto,
// MySQL en modo no estricto trunca en silencio y guarda un dato incompleto.
const MAX_NOMBRE = 120;
const MAX_EMAIL = 190;
const MAX_MENSAJE = 1000;
const MIN_MENSAJE = 10;

async function mostrarInstitucional(req, res) {
  res.render('institucional', {
    title: 'Institucional',
    user: req.session.user || null,
    seccion: 'institucional',
  });
}

async function mostrarContacto(req, res) {
  res.render('contacto', {
    title: 'Contacto',
    user: req.session.user || null,
    seccion: 'contacto',
    errores: {},
    form: { nombre: '', email: '', mensaje: '' },
    enviado: false,
  });
}

async function enviarContacto(req, res) {
  const datos = {
    nombre: String(req.body.nombre || '').trim(),
    email: String(req.body.email || '').trim().toLowerCase(),
    mensaje: String(req.body.mensaje || '').trim(),
  };

  const errores = {};
  if (!datos.nombre || datos.nombre.trim().length < 2) {
    errores.nombre = 'Ingresá tu nombre.';
  } else if (datos.nombre.length > MAX_NOMBRE) {
    errores.nombre = `El nombre no puede superar los ${MAX_NOMBRE} caracteres.`;
  }
  if (!datos.email || !EMAIL_REGEX.test(datos.email)) {
    errores.email = 'Ingresá un correo electrónico válido.';
  } else if (datos.email.length > MAX_EMAIL) {
    errores.email = 'El correo es demasiado largo.';
  }
  if (!datos.mensaje || datos.mensaje.length < MIN_MENSAJE) {
    errores.mensaje = `Escribí un mensaje de al menos ${MIN_MENSAJE} caracteres.`;
  } else if (datos.mensaje.length > MAX_MENSAJE) {
    errores.mensaje = `El mensaje no puede superar los ${MAX_MENSAJE} caracteres.`;
  }

  if (Object.keys(errores).length > 0) {
    return res.status(400).render('contacto', {
      title: 'Contacto',
      user: req.session.user || null,
      seccion: 'contacto',
      errores,
      form: datos,
      enviado: false,
    });
  }

  await Contacto.create(datos);

  res.render('contacto', {
    title: 'Contacto',
    user: req.session.user || null,
    seccion: 'contacto',
    errores: {},
    form: { nombre: '', email: '', mensaje: '' },
    enviado: true,
  });
}

module.exports = { mostrarInstitucional, mostrarContacto, enviarContacto };