const bcrypt = require('bcrypt');
const Item = require('../models/item.model');
const User = require('../models/user.model');
const Alerta = require('../models/alerta.model');
const Movimiento = require('../models/movimiento.model');
const Solicitud = require('../models/solicitud.model');
const { renderError } = require('../middleware/error.middleware');

const ROLES = ['usuario', 'superusuario'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NOMBRE = 120;
const MAX_EMAIL = 190;
const MIN_PASSWORD = 6;

async function mostrarDashboard(req, res) {
  const [totalItems, stockCritico, alertasActivas, alertasVencidas, alertas, ultimosMovimientos, totalSuperusuarios, prestamosActivos, solicitudesPendientes, solicitudes] =
    await Promise.all([
      Item.contar(),
      Item.stockCritico(),
      Alerta.countActivas(),
      Alerta.contarVencidas(),
      Alerta.listarActivas({ limite: 8 }),
      Movimiento.ultimos(8),
      User.countByRol('superusuario'),
      Movimiento.contarPrestamosActivos(),
      Solicitud.contarPendientes(),
      Solicitud.listar({ estado: 'pendiente', limite: 8 }),
    ]);

  res.render('admin', {
    title: 'Panel del superusuario',
    user: req.session.user,
    seccion: 'admin',
    resumen: {
      totalItems,
      stockCritico,
      alertasActivas,
      alertasVencidas,
      alertas,
      ultimosMovimientos,
      totalSuperusuarios,
      prestamosActivos,
      solicitudesPendientes,
      solicitudes,
    },
  });
}

/* ---- Alertas de devolución (F7 — T-39 a T-41) ---- */

async function mostrarAlertas(req, res) {
  const [alertas, vencidas] = await Promise.all([Alerta.listarActivas(), Alerta.contarVencidas()]);

  res.render('alertas', {
    title: 'Alertas de devolución',
    user: req.session.user,
    seccion: 'alertas',
    alertas,
    vencidas,
    plazoDias: Alerta.plazoDias(),
  });
}

/* ---- Gestión de usuarios (T-49) ---- */

async function mostrarUsuarios(req, res) {
  const { q = '', rol = '' } = req.query;
  const usuarios = await User.findAll({ q: String(q).trim(), rol: String(rol).trim() });

  res.render('usuarios', {
    title: 'Usuarios',
    user: req.session.user,
    seccion: 'usuarios',
    usuarios,
    totalSuperusuarios: await User.countByRol('superusuario'),
    filtros: { q: String(q).trim(), rol: String(rol).trim() },
  });
}

async function mostrarNuevoUsuario(req, res) {
  res.render('usuario-form', {
    title: 'Nuevo usuario',
    user: req.session.user,
    seccion: 'usuarios',
    usuario: null,
    ROLES,
    errores: {},
    form: { nombre: '', email: '', rol: 'usuario' },
  });
}

async function crearUsuario(req, res) {
  const datos = {
    nombre: String(req.body.nombre || '').trim(),
    email: String(req.body.email || '').trim().toLowerCase(),
    rol: String(req.body.rol || 'usuario'),
    contraseña: String(req.body.password || ''),
  };

  const errores = validarUsuario(datos, { esNuevo: true });
  if (Object.keys(errores).length === 0) {
    const existe = await User.findByEmail(datos.email);
    if (existe) {
      errores.email = 'Ya existe una cuenta con ese correo.';
    }
  }

  if (Object.keys(errores).length > 0) {
    return res.status(400).render('usuario-form', {
      title: 'Nuevo usuario',
      user: req.session.user,
      seccion: 'usuarios',
      usuario: null,
      ROLES,
      errores,
      form: datos,
    });
  }

  const contraseñaHasheada = await bcrypt.hash(datos.contraseña, 10);
  await User.create({
    nombre: datos.nombre,
    email: datos.email,
    contraseñaHasheada,
    rol: datos.rol,
  });

  req.session.mensaje = { texto: 'Usuario creado correctamente.', tipo: 'exito' };
  res.redirect('/admin/usuarios');
}

async function mostrarEditarUsuario(req, res) {
  const id = Number(req.params.id);
  const usuario = await User.findById(id);

  if (!usuario) {
    return renderError(req, res, 404, 'El usuario que buscás no existe.', 'Usuario no encontrado');
  }

  res.render('usuario-form', {
    title: `Editar ${usuario.nombre}`,
    user: req.session.user,
    seccion: 'usuarios',
    usuario,
    ROLES,
    errores: {},
    form: {
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
    },
    totalSuperusuarios: await User.countByRol('superusuario'),
  });
}

async function actualizarUsuario(req, res) {
  const id = Number(req.params.id);
  const usuario = await User.findById(id);

  if (!usuario) {
    return renderError(req, res, 404, 'El usuario que buscás no existe.', 'Usuario no encontrado');
  }

  const datos = {
    nombre: String(req.body.nombre || '').trim(),
    email: String(req.body.email || '').trim().toLowerCase(),
    rol: String(req.body.rol || usuario.rol),
    contraseña: String(req.body.password || ''),
  };

  const esUltimoSuperusuario = usuario.rol === 'superusuario' && (await User.countByRol('superusuario')) === 1;

  const errores = validarUsuario(datos, { esNuevo: false });
  if (esUltimoSuperusuario && datos.rol !== 'superusuario') {
    errores.rol = 'No se puede quitar el rol de superusuario a la única cuenta de superusuario que existe.';
  }

  if (Object.keys(errores).length === 0 && datos.email !== usuario.email) {
    const existe = await User.findByEmail(datos.email);
    if (existe) {
      errores.email = 'Ya existe una cuenta con ese correo.';
    }
  }

  if (Object.keys(errores).length > 0) {
    return res.status(400).render('usuario-form', {
      title: `Editar ${usuario.nombre}`,
      user: req.session.user,
      seccion: 'usuarios',
      usuario,
      ROLES,
      errores,
      form: datos,
      totalSuperusuarios: await User.countByRol('superusuario'),
    });
  }

  await User.update(id, {
    nombre: datos.nombre,
    email: datos.email,
    rol: datos.rol,
    contraseña: datos.contraseña ? await bcrypt.hash(datos.contraseña, 10) : undefined,
  });

  if (id === req.session.user.id) {
    req.session.user.nombre = datos.nombre;
    req.session.user.email = datos.email;
    req.session.user.rol = datos.rol;
  }

  req.session.mensaje = { texto: 'Usuario actualizado correctamente.', tipo: 'exito' };
  res.redirect('/admin/usuarios');
}

async function eliminarUsuario(req, res) {
  const id = Number(req.params.id);

  if (id === req.session.user.id) {
    req.session.mensaje = { texto: 'No podés eliminar tu propia cuenta.', tipo: 'error' };
    return res.redirect('/admin/usuarios');
  }

  const usuario = await User.findById(id);

  if (!usuario) {
    return renderError(req, res, 404, 'El usuario que buscás no existe.', 'Usuario no encontrado');
  }

  if (usuario.rol === 'superusuario' && (await User.countByRol('superusuario')) === 1) {
    req.session.mensaje = { texto: 'No se puede eliminar la única cuenta de superusuario.', tipo: 'error' };
    return res.redirect('/admin/usuarios');
  }

  const borrado = await User.remove(id);

  if (!borrado.ok) {
    req.session.mensaje = { texto: borrado.error, tipo: 'error' };
    return res.redirect('/admin/usuarios');
  }

  req.session.mensaje = { texto: 'Usuario eliminado.', tipo: 'exito' };
  res.redirect('/admin/usuarios');
}

function validarUsuario({ nombre, email, rol, contraseña }, { esNuevo }) {
  const errores = {};

  if (!nombre || nombre.trim().length < 2) {
    errores.nombre = 'Ingresá el nombre completo.';
  } else if (nombre.length > MAX_NOMBRE) {
    errores.nombre = `El nombre no puede superar los ${MAX_NOMBRE} caracteres.`;
  }
  if (!email || !EMAIL_REGEX.test(email)) {
    errores.email = 'Ingresá un correo electrónico válido.';
  } else if (email.length > MAX_EMAIL) {
    errores.email = 'El correo es demasiado largo.';
  }
  if (!ROLES.includes(rol)) {
    errores.rol = 'Elegí un rol válido.';
  }
  if (esNuevo && (!contraseña || contraseña.length < MIN_PASSWORD)) {
    errores.password = `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`;
  }
  if (!esNuevo && contraseña && contraseña.length < MIN_PASSWORD) {
    errores.password = `La nueva contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`;
  }

  return errores;
}

module.exports = {
  mostrarDashboard,
  mostrarAlertas,
  mostrarUsuarios,
  mostrarNuevoUsuario,
  crearUsuario,
  mostrarEditarUsuario,
  actualizarUsuario,
  eliminarUsuario,
};