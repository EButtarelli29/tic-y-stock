const Contacto = require('../models/contacto.model');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  }
  if (!datos.email || !EMAIL_REGEX.test(datos.email)) {
    errores.email = 'Ingresá un correo electrónico válido.';
  }
  if (!datos.mensaje || datos.mensaje.length < 10) {
    errores.mensaje = 'Escribí un mensaje de al menos 10 caracteres.';
  }
  if (datos.mensaje.length > 1000) {
    errores.mensaje = 'El mensaje no puede superar los 1000 caracteres.';
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