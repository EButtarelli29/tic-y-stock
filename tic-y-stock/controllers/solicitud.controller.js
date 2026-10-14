const Item = require('../models/item.model');
const Solicitud = require('../models/solicitud.model');
const { renderError } = require('../middleware/error.middleware');

// Límites de longitud según los VARCHAR del esquema (db/schema.sql).
const MAX_DESCRIPCION = 500;
const MAX_RESPUESTA = 500;

const ETIQUETAS_TIPO = { reserva: 'Reserva', compra: 'Compra' };
const ETIQUETAS_ESTADO = { pendiente: 'Pendiente', aprobada: 'Aprobada', rechazada: 'Rechazada' };

/** Convierte un id del formulario en entero positivo, o 0 si no es válido. */
function aId(valor) {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

/**
 * Material que se puede reservar: con stock y sin estar dado de baja. Es el mismo
 * criterio que el catálogo del alumno (`Item.findAll({ disponible: true })`), para
 * que el formulario no ofrezca algo que la validación va a rechazar.
 */
async function itemsReservables() {
  return Item.findAll({ disponible: true }, { orden: 'nombre' });
}

/* --------------------------------------------------------------- alumno (T-42, T-43, T-44) */

async function mostrarNuevaReserva(req, res) {
  res.render('solicitud-reserva', {
    title: 'Reservar material',
    user: req.session.user,
    seccion: 'mis-solicitudes',
    items: await itemsReservables(),
    errores: {},
    form: { id_item: String(req.query.item || ''), cantidad: 1, descripcion: '' },
  });
}

async function crearReserva(req, res) {
  const form = {
    id_item: String(req.body.id_item || ''),
    cantidad: Number(req.body.cantidad || 0),
    descripcion: String(req.body.descripcion || '').trim(),
  };

  const errores = {};
  const idItem = aId(form.id_item);

  if (!idItem) errores.id_item = 'Elegí el material que querés reservar.';
  if (!Number.isInteger(form.cantidad) || form.cantidad < 1) {
    errores.cantidad = 'La cantidad debe ser un número entero mayor o igual a 1.';
  }
  if (form.descripcion.length > MAX_DESCRIPCION) {
    errores.descripcion = `El detalle no puede superar los ${MAX_DESCRIPCION} caracteres.`;
  }

  // El ítem se valida acá, contra el stock de ahora: entre que se cargó el
  // formulario y se envió, otro retiro o una edición pudieron dejarlo sin stock.
  let item = null;
  if (!errores.id_item) {
    item = await Item.findById(idItem);
    if (!item) {
      errores.id_item = 'El material seleccionado no existe.';
    } else if (item.estado !== 'disponible' || item.cantidad === 0) {
      errores.id_item = `"${item.nombre}" no está disponible para reservar ahora mismo.`;
    } else if (!errores.cantidad && form.cantidad > item.cantidad) {
      errores.cantidad = `Solo quedan ${item.cantidad} unidad(es) de "${item.nombre}".`;
    }
  }

  if (Object.keys(errores).length > 0) {
    // La lista se relee *después* del intento: si el ítem se quedó sin stock, sale
    // del `<select>` en vez de ofrecer una opción que vuelve a fallar.
    return res.status(400).render('solicitud-reserva', {
      title: 'Reservar material',
      user: req.session.user,
      seccion: 'mis-solicitudes',
      items: await itemsReservables(),
      errores,
      form,
    });
  }

  await Solicitud.crear({
    id_usuario: req.session.user.id,
    tipo: 'reserva',
    id_item: idItem,
    cantidad: form.cantidad,
    descripcion: form.descripcion,
  });

  req.session.mensaje = {
    texto: `Reserva enviada: ${form.cantidad} × ${item.nombre}. El docente la va a revisar.`,
    tipo: 'exito',
  };
  res.redirect('/panel/mis-solicitudes');
}

async function mostrarNuevaCompra(req, res) {
  res.render('solicitud-compra', {
    title: 'Pedir una compra',
    user: req.session.user,
    seccion: 'mis-solicitudes',
    errores: {},
    form: { cantidad: 1, descripcion: '' },
  });
}

async function crearCompra(req, res) {
  const form = {
    cantidad: Number(req.body.cantidad || 0),
    descripcion: String(req.body.descripcion || '').trim(),
  };

  const errores = {};
  if (form.descripcion.length < 5) {
    errores.descripcion = 'Contá qué insumo hace falta (marca, modelo, para qué se usa).';
  } else if (form.descripcion.length > MAX_DESCRIPCION) {
    errores.descripcion = `El detalle no puede superar los ${MAX_DESCRIPCION} caracteres.`;
  }
  if (!Number.isInteger(form.cantidad) || form.cantidad < 1) {
    errores.cantidad = 'La cantidad debe ser un número entero mayor o igual a 1.';
  }

  if (Object.keys(errores).length > 0) {
    return res.status(400).render('solicitud-compra', {
      title: 'Pedir una compra',
      user: req.session.user,
      seccion: 'mis-solicitudes',
      errores,
      form,
    });
  }

  await Solicitud.crear({
    id_usuario: req.session.user.id,
    tipo: 'compra',
    cantidad: form.cantidad,
    descripcion: form.descripcion,
  });

  req.session.mensaje = { texto: 'Solicitud de compra enviada. El docente la va a revisar.', tipo: 'exito' };
  res.redirect('/panel/mis-solicitudes');
}

async function misSolicitudes(req, res) {
  const solicitudes = await Solicitud.listarDeUsuario(req.session.user.id);

  res.render('mis-solicitudes', {
    title: 'Mis solicitudes',
    user: req.session.user,
    seccion: 'mis-solicitudes',
    solicitudes,
    ETIQUETAS_TIPO,
    ETIQUETAS_ESTADO,
    pendientes: solicitudes.filter((s) => s.estado === 'pendiente').length,
  });
}

/* --------------------------------------------------------------- docente (T-45, T-46) */

async function listar(req, res) {
  const estados = Object.keys(ETIQUETAS_ESTADO);
  const estado = estados.includes(req.query.estado) ? req.query.estado : '';

  const [solicitudes, pendientes] = await Promise.all([
    Solicitud.listar({ estado }),
    Solicitud.contarPendientes(),
  ]);

  res.render('solicitudes', {
    title: 'Solicitudes',
    user: req.session.user,
    seccion: 'solicitudes',
    solicitudes,
    pendientes,
    estado,
    ETIQUETAS_TIPO,
    ETIQUETAS_ESTADO,
  });
}

async function mostrarDetalle(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return renderError(req, res, 404, 'La solicitud que buscás no existe.', 'Solicitud no encontrada');
  }

  const solicitud = await Solicitud.findById(id);
  if (!solicitud) {
    return renderError(req, res, 404, 'La solicitud que buscás no existe.', 'Solicitud no encontrada');
  }

  res.render('solicitud-detalle', {
    title: `Solicitud #${solicitud.id}`,
    user: req.session.user,
    seccion: 'solicitudes',
    solicitud,
    ETIQUETAS_TIPO,
    ETIQUETAS_ESTADO,
    errores: {},
    form: { respuesta: '' },
  });
}

async function resolverSolicitud(req, res) {
  const id = Number(req.params.id);
  const accion = String(req.body.accion || '');
  const respuesta = String(req.body.respuesta || '').trim();

  const solicitud = await Solicitud.findById(id);
  if (!solicitud) {
    return renderError(req, res, 404, 'La solicitud que buscás no existe.', 'Solicitud no encontrada');
  }

  const errores = {};
  if (!['aprobar', 'rechazar'].includes(accion)) {
    errores.general = 'Elegí si la solicitud se aprueba o se rechaza.';
  }
  if (respuesta.length > MAX_RESPUESTA) {
    errores.respuesta = `La respuesta no puede superar los ${MAX_RESPUESTA} caracteres.`;
  }

  if (Object.keys(errores).length > 0) {
    return res.status(400).render('solicitud-detalle', {
      title: `Solicitud #${solicitud.id}`,
      user: req.session.user,
      seccion: 'solicitudes',
      solicitud,
      ETIQUETAS_TIPO,
      ETIQUETAS_ESTADO,
      errores,
      form: { respuesta },
    });
  }

  const resultado =
    accion === 'rechazar'
      ? await Solicitud.resolver({ id, estado: 'rechazada', id_superusuario: req.session.user.id, respuesta })
      : await Solicitud.aprobar({ id, id_superusuario: req.session.user.id, respuesta });

  if (!resultado.ok) {
    // Se relee la solicitud después del intento: si otra pestaña ya la resolvió o
    // si el stock cambió, la pantalla muestra el estado real, no el de la carga.
    return res.status(400).render('solicitud-detalle', {
      title: `Solicitud #${id}`,
      user: req.session.user,
      seccion: 'solicitudes',
      solicitud: (await Solicitud.findById(id)) || solicitud,
      ETIQUETAS_TIPO,
      ETIQUETAS_ESTADO,
      errores: resultado.errores,
      form: { respuesta },
    });
  }

  const esReserva = solicitud.tipo === 'reserva';
  const texto =
    accion === 'rechazar'
      ? `Solicitud #${id} rechazada.`
      : esReserva
        ? `Reserva #${id} aprobada: se registró el retiro del material y su alerta de devolución.`
        : `Compra #${id} aprobada. Cargá el insumo en el inventario.`;

  req.session.mensaje = { texto, tipo: accion === 'aprobar' ? 'exito' : 'aviso' };
  res.redirect('/admin/solicitudes');
}

module.exports = {
  mostrarNuevaReserva,
  crearReserva,
  mostrarNuevaCompra,
  crearCompra,
  misSolicitudes,
  listar,
  mostrarDetalle,
  resolverSolicitud,
};
