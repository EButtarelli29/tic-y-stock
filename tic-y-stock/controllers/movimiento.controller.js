const Item = require('../models/item.model');
const User = require('../models/user.model');
const Movimiento = require('../models/movimiento.model');

// Límites de longitud según los VARCHAR del esquema (db/schema.sql).
const MAX_OBSERVACIONES = 500;

const TIPOS_MOVIMIENTO = ['retiro', 'devolucion'];
const ORDENES_MOVIMIENTO = ['fecha', 'item', 'usuario', 'cantidad'];
const POR_PAGINA = 25;

const ETIQUETAS_TIPO = {
  retiro: 'Retiro',
  devolucion: 'Devolución',
};

/** Lee los filtros de la URL del historial y los normaliza una sola vez (T-31). */
function leerFiltros(query) {
  return {
    q: String(query.q || '').trim(),
    tipo: TIPOS_MOVIMIENTO.includes(query.tipo) ? query.tipo : '',
    idItem: Number(query.item) || 0,
    idUsuario: Number(query.usuario) || 0,
    desde: String(query.desde || '').trim(),
    hasta: String(query.hasta || '').trim(),
    soloAbiertos: query.abiertos === '1',
  };
}

/** Convierte un id de query-string en entero positivo, o 0 si no es válido. */
function aId(valor) {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

/**
 * Ítems que se pueden retirar: los que no están dados de baja y tienen stock.
 * Filtrar en el servidor evita ofrecer en el formulario algo que el modelo va a
 * rechazar después (y "quedan 0 unidades" es una opción bastante triste).
 */
async function itemsRetirables() {
  const items = await Item.findAll({}, { orden: 'nombre' });
  return items.filter((i) => i.estado !== 'baja' && i.cantidad > 0);
}

/**
 * Todos los usuarios, alfabéticamente.
 *
 * El orden tiene que ser estable entre el GET del formulario y el re-render del
 * error: si la lista se reordenara, el `<option selected>` se movería de lugar y el
 * docente vería cambiazo de persona a la que estaba por registrar.
 */
async function usuariosOrdenados() {
  const usuarios = await User.findAll();
  return [...usuarios].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/** Choices del formulario de retiro: ítems retirables y todos los usuarios. */
async function datosFormularioRetiro() {
  const [items, usuarios] = await Promise.all([itemsRetirables(), usuariosOrdenados()]);
  return { items, usuarios };
}

/* ------------------------------------------------------------------ historial */

async function listar(req, res) {
  const filtros = leerFiltros(req.query);
  const orden = ORDENES_MOVIMIENTO.includes(req.query.orden) ? req.query.orden : 'fecha';

  const total = await Movimiento.contarConFiltros(filtros);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const pagina = Math.min(Math.max(Number(req.query.pagina) || 1, 1), paginas);

  const [movimientos, usuarios, todosLosItems] = await Promise.all([
    Movimiento.listar(filtros, { limite: POR_PAGINA, offset: (pagina - 1) * POR_PAGINA, orden }),
    User.findAll(),
    Item.findAll({}, { orden: 'nombre' }),
  ]);

  res.render('movimientos', {
    title: 'Movimientos',
    user: req.session.user,
    seccion: 'movimientos',
    movimientos,
    usuarios,
    items: todosLosItems,
    ETIQUETAS_TIPO,
    filtros,
    orden,
    paginacion: {
      pagina,
      paginas,
      total,
      porPagina: POR_PAGINA,
      desde: total === 0 ? 0 : (pagina - 1) * POR_PAGINA + 1,
      hasta: Math.min(pagina * POR_PAGINA, total),
    },
  });
}

/* ------------------------------------------------------------------ retiro */

async function mostrarRetiro(req, res) {
  const { items, usuarios } = await datosFormularioRetiro();

  res.render('movimiento-retiro', {
    title: 'Registrar retiro',
    user: req.session.user,
    seccion: 'movimientos',
    items,
    usuarios,
    errores: {},
    form: {
      id_item: String(req.query.item || ''),
      id_usuario: '',
      cantidad: 1,
      observaciones: '',
    },
  });
}

async function crearRetiro(req, res) {
  const form = {
    id_item: String(req.body.id_item || ''),
    id_usuario: String(req.body.id_usuario || ''),
    cantidad: Number(req.body.cantidad || 0),
    observaciones: String(req.body.observaciones || '').trim(),
  };

  const errores = {};
  const idItem = aId(form.id_item);
  const idUsuario = aId(form.id_usuario);

  if (!idItem) errores.id_item = 'Elegí el ítem que se retira.';
  if (!idUsuario) errores.id_usuario = 'Elegí quién se lleva el material.';
  if (!Number.isInteger(form.cantidad) || form.cantidad < 1) {
    errores.cantidad = 'La cantidad debe ser un número entero mayor o igual a 1.';
  }
  if (form.observaciones.length > MAX_OBSERVACIONES) {
    errores.observaciones = `Las observaciones no pueden superar los ${MAX_OBSERVACIONES} caracteres.`;
  }

  // El usuario se valida acá y no en el modelo para que un formulario manipulado
  // devuelva un mensaje en el campo en lugar de un error de clave foránea.
  if (!errores.id_usuario) {
    const usuario = await User.findById(idUsuario);
    if (!usuario) errores.id_usuario = 'El usuario seleccionado no existe.';
  }

  if (Object.keys(errores).length === 0) {
    const resultado = await Movimiento.registrarRetiro({
      id_item: idItem,
      id_usuario: idUsuario,
      cantidad: form.cantidad,
      observaciones: form.observaciones,
    });

    if (!resultado.ok) {
      // Los ítems retirables se releen *después* del intento, a propósito: el
      // error habitual acá es "no hay stock", porque otro retiro se llevó el
      // material entre la carga del formulario y el envío. Releer la lista saca
      // ese ítem del `<select>` en vez de ofrecer uno que vuelve a fallar.
      const { items, usuarios } = await datosFormularioRetiro();
      return res.status(400).render('movimiento-retiro', {
        title: 'Registrar retiro',
        user: req.session.user,
        seccion: 'movimientos',
        items,
        usuarios,
        errores: resultado.errores,
        form,
      });
    }

    req.session.mensaje = {
      texto: `Retiro registrado: ${resultado.cantidad} × ${resultado.item_nombre}.`,
      tipo: 'exito',
    };
    return res.redirect('/admin/movimientos');
  }

  const { items, usuarios } = await datosFormularioRetiro();
  return res.status(400).render('movimiento-retiro', {
    title: 'Registrar retiro',
    user: req.session.user,
    seccion: 'movimientos',
    items,
    usuarios,
    errores,
    form,
  });
}

/* ------------------------------------------------------------------ devolución */

// Cuántos préstamos abiertos se ofrecen en el `<select>`. Es un tope de seguridad,
// no una paginación: el que se pasó del tope sigue devoluble desde el historial
// con el botón "Devolver", que entra por `?retiro=ID`.
const LIMITE_PRESTAMOS_FORM = 300;

/** Choices del formulario de devolución: préstamos abiertos y todos los usuarios. */
async function datosFormularioDevolucion() {
  const [prestamos, usuarios] = await Promise.all([
    Movimiento.retirosAbiertos({ limite: LIMITE_PRESTAMOS_FORM }),
    usuariosOrdenados(),
  ]);
  return { prestamos, usuarios };
}

async function mostrarDevolucion(req, res) {
  const abierto = aId(req.query.retiro);
  const { prestamos, usuarios } = await datosFormularioDevolucion();

  // Si viene ?retiro=ID desde la tabla del historial, se deja preseleccionado.
  const retiro = prestamos.find((p) => p.id === abierto) || null;

  res.render('movimiento-devolucion', {
    title: 'Registrar devolución',
    user: req.session.user,
    seccion: 'movimientos',
    prestamos,
    retiro,
    usuarios,
    errores: {},
    form: {
      id_retiro: retiro ? String(retiro.id) : '',
      id_usuario: retiro ? String(retiro.usuario_id) : '',
      observaciones: '',
    },
  });
}

async function crearDevolucion(req, res) {
  const form = {
    id_retiro: String(req.body.id_retiro || ''),
    id_usuario: String(req.body.id_usuario || ''),
    observaciones: String(req.body.observaciones || '').trim(),
  };

  const errores = {};
  const idRetiro = aId(form.id_retiro);
  const idUsuario = aId(form.id_usuario);

  if (!idRetiro) errores.id_retiro = 'Elegí el préstamo que se está devolviendo.';
  if (!idUsuario) errores.id_usuario = 'Indicá quién hace la devolución.';
  if (form.observaciones.length > MAX_OBSERVACIONES) {
    errores.observaciones = `Las observaciones no pueden superar los ${MAX_OBSERVACIONES} caracteres.`;
  }

  if (!errores.id_usuario) {
    const usuario = await User.findById(idUsuario);
    if (!usuario) errores.id_usuario = 'El usuario seleccionado no existe.';
  }

  if (Object.keys(errores).length === 0) {
    const resultado = await Movimiento.registrarDevolucion({
      id_retiro: idRetiro,
      id_usuario: idUsuario,
      observaciones: form.observaciones,
    });

    if (!resultado.ok) {
      // Se releen los préstamos *después* del intento, a propósito: el caso
      // habitual de este error es que el préstamo se devolvió desde otra pestaña
      // entre la carga del formulario y el envío. Con la lista releída, ese
      // préstamo ya no aparece en el `<select>` y la vista cae en su empty state,
      // que explica qué pasó — en vez de ofrecer una opción que vuelve a fallar
      // cada vez que se la elige.
      const { prestamos, usuarios } = await datosFormularioDevolucion();
      return res.status(400).render('movimiento-devolucion', {
        title: 'Registrar devolución',
        user: req.session.user,
        seccion: 'movimientos',
        prestamos,
        retiro: null,
        usuarios,
        errores: resultado.errores,
        form,
      });
    }

    req.session.mensaje = {
      texto: `Devolución registrada: ${resultado.cantidad} × ${resultado.item_nombre} volvió al pañol.`,
      tipo: 'exito',
    };
    return res.redirect('/admin/movimientos');
  }

  const { prestamos, usuarios } = await datosFormularioDevolucion();
  return res.status(400).render('movimiento-devolucion', {
    title: 'Registrar devolución',
    user: req.session.user,
    seccion: 'movimientos',
    prestamos,
    retiro: null,
    usuarios,
    errores,
    form,
  });
}

/* ------------------------------------------------------------------ alumno */

/**
 * "Mis préstamos activos" para el usuario alumno (T-32).
 *
 * El alumno solo lee: el retiro y la devolución los registra el responsable del
 * pañol. Pedirlo al revés lo dejaría en manos de cualquiera que entre con su
 * cuenta, y las reservas con aprobación son F8 (solicitudes), no F5.
 */
async function mostrarMisPrestamos(req, res) {
  const idUsuario = req.session.user.id;
  const [prestamos, historial] = await Promise.all([
    Movimiento.prestamosActivosDe(idUsuario),
    Movimiento.historialDe(idUsuario, 10),
  ]);

  res.render('mis-prestamos', {
    title: 'Mis préstamos',
    user: req.session.user,
    seccion: 'mis-prestamos',
    prestamos,
    historial,
    ETIQUETAS_TIPO,
    totalUnidades: prestamos.reduce((suma, p) => suma + Number(p.cantidad), 0),
  });
}

module.exports = {
  listar,
  mostrarRetiro,
  crearRetiro,
  mostrarDevolucion,
  crearDevolucion,
  mostrarMisPrestamos,
};