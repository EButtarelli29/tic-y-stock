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
      // F6: si se llegó escaneando, el código queda asentado en el movimiento.
      codigo_escaneado: String(req.query.codigo || '').trim().slice(0, 64),
    },
  });
}

async function crearRetiro(req, res) {
  const form = {
    id_item: String(req.body.id_item || ''),
    id_usuario: String(req.body.id_usuario || ''),
    cantidad: Number(req.body.cantidad || 0),
    observaciones: String(req.body.observaciones || '').trim(),
    codigo_escaneado: String(req.body.codigo_escaneado || '').trim().slice(0, 64),
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
      codigo_escaneado: form.codigo_escaneado,
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

/**
 * Choices del formulario de devolución: préstamos abiertos y todos los usuarios.
 *
 * `idItem` acota la lista a un solo ítem (F6 — T-35): cuando el docente llega
 * escaneando una etiqueta ya sabe cuál es, y ofrecerle los 300 préstamos abiertos
 * del taller para que busque el suyo es hacerle un trabajo que el escaneo ya
 * hizo. El filtro no oculta nada: es el mismo predicado `ABIERTO`, más un
 * `id_item` encima.
 */
async function datosFormularioDevolucion({ idItem = 0 } = {}) {
  const [prestamos, usuarios] = await Promise.all([
    idItem
      ? Movimiento.retirosAbiertosDeItem(idItem)
      : Movimiento.retirosAbiertos({ limite: LIMITE_PRESTAMOS_FORM }),
    usuariosOrdenados(),
  ]);
  return { prestamos, usuarios };
}

async function mostrarDevolucion(req, res) {
  const abierto = aId(req.query.retiro);
  const idItem = aId(req.query.item);
  const { prestamos, usuarios } = await datosFormularioDevolucion({ idItem });

  // Si viene ?retiro=ID desde la tabla del historial, se deja preseleccionado.
  const retiro = prestamos.find((p) => p.id === abierto) || null;
  // Si vino de un escaneo (?item=ID) hay un solo item, pero puede estar prestado
  // a varias personas: se preselecciona el más antiguo, que es el que primero se
  // pidió y por lo tanto el que más chances tiene de ser el que se está
  // devolviendo. El docente puede cambiarlo en el `<select>`.
  const elegido = retiro || (idItem ? prestamos[0] || null : null);

  res.render('movimiento-devolucion', {
    title: 'Registrar devolución',
    user: req.session.user,
    seccion: 'movimientos',
    prestamos,
    retiro: elegido,
    usuarios,
    errores: {},
    form: {
      id_retiro: elegido ? String(elegido.id) : '',
      id_usuario: elegido ? String(elegido.usuario_id) : '',
      observaciones: '',
      // El filtro de ítem viaja en el formulario para que el re-render del error
      // repita la misma lista corta, y no la de todo el taller.
      id_item: idItem ? String(idItem) : '',
      codigo_escaneado: String(req.query.codigo || '').trim().slice(0, 64),
    },
  });
}

async function crearDevolucion(req, res) {
  const form = {
    id_retiro: String(req.body.id_retiro || ''),
    id_usuario: String(req.body.id_usuario || ''),
    observaciones: String(req.body.observaciones || '').trim(),
    id_item: String(req.body.id_item || ''),
    codigo_escaneado: String(req.body.codigo_escaneado || '').trim().slice(0, 64),
  };

  const errores = {};
  const idRetiro = aId(form.id_retiro);
  const idUsuario = aId(form.id_usuario);
  const idFiltroItem = aId(form.id_item);

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
      codigo_escaneado: form.codigo_escaneado,
    });

    if (!resultado.ok) {
      // Se releen los préstamos *después* del intento, a propósito: el caso
      // habitual de este error es que el préstamo se devolvió desde otra pestaña
      // entre la carga del formulario y el envío. Con la lista releída, ese
      // préstamo ya no aparece en el `<select>` y la vista cae en su empty state,
      // que explica qué pasó — en vez de ofrecer una opción que vuelve a fallar
      // cada vez que se la elige. El filtro de ítem se mantiene para no perder el
      // contexto si se llegó escaneando.
      const { prestamos, usuarios } = await datosFormularioDevolucion({ idItem: idFiltroItem });
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

  const { prestamos, usuarios } = await datosFormularioDevolucion({ idItem: idFiltroItem });
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

/* ------------------------------------------------------------------ escaneo */

/**
 * Qué hacer con un ítem recién escaneado (F6 — T-35).
 *
 * El código de barras de la etiqueta dice *qué* material es, nunca *si* se está
 * entregando o devolviendo: el mismo escaneo sirve para las dos cosas. Lo que
 * cambia es el estado del ítem, y de ahí sale la decisión:
 *
 *   * `baja`                       -> bloqueado: no se retira ni se devuelve.
 *   * sin stock y sin nada prestado -> bloqueado: no hay nada que hacer.
 *   * hay préstamo y hay stock      -> *elegir*: es genuinamente ambiguo. El
 *     mismo ítem puede estar prestado a un alumno (y estar volviendo) y al mismo
 *     tiempo tener unidades para entregar a otro. Adivinar sería peor que
 *     preguntar: se pierde el formulario lleno.
 *   * sólo hay préstamo             -> devolución.
 *   * sólo hay stock                -> retiro.
 *
 * Se declara aparte y sin `async` a propósito: es una regla pura, se lee como la
 * tabla de arriba y no necesita base de datos.
 */
function decidirDestino(item, prestamos) {
  if (item.estado === 'baja') {
    return { destino: 'bloqueado', motivo: `${item.nombre} está dado de baja: no se puede retirar ni devolver.` };
  }
  if (prestamos.length === 0 && item.cantidad === 0) {
    return { destino: 'bloqueado', motivo: `No queda stock de ${item.nombre} y no hay nada devuelto pendiente.` };
  }
  const puedeRetiro = item.cantidad > 0;
  const puedeDevolucion = prestamos.length > 0;
  if (puedeRetiro && puedeDevolucion) return { destino: 'elegir' };
  if (puedeDevolucion) return { destino: 'devolucion' };
  return { destino: 'retiro' };
}

/**
 * Escaneo de códigos de barras (F6 — T-33 a T-38).
 *
 * Es la página de aterrizaje de los tres caminos de escaneo, y por eso el
 * `?codigo=` se resuelve en el servidor: la cámara (ZXing) y el lector USB
 * entregan el código al cliente, y el cliente lo manda acá. Resolver en el
 * servidor y no en el navegador es a propósito — el `SELECT` por `codigo_barras`
 * necesita el UNIQUE de la base para que "encontré dos ítems" sea imposible, y
 * el cliente no tiene por qué saber cómo se busca.
 */
async function escanear(req, res) {
  const codigo = String(req.query.codigo || '').trim().slice(0, 64);

  const base = {
    title: 'Escanear',
    user: req.session.user,
    // Sección propia para que el navbar marque "Escanear" y no "Movimientos":
    // el scan es la pantalla de trabajo del pañol, no un listado.
    seccion: 'escanear',
    codigo,
    item: null,
    prestamos: [],
    eleccion: null,
    aviso: '',
  };

  if (!codigo) {
    return res.render('movimiento-escanear', base);
  }

  const item = await Item.findByCodigo(codigo);

  if (!item) {
    return res.render('movimiento-escanear', {
      ...base,
      aviso: `No encontré ningún ítem con el código "${codigo}". Puede que la etiqueta esté gastada o que el número esté mal tipeado.`,
    });
  }

  const prestamos = await Movimiento.retirosAbiertosDeItem(item.id);
  const { destino, motivo } = decidirDestino(item, prestamos);

  if (destino === 'bloqueado') {
    return res.render('movimiento-escanear', { ...base, item, prestamos, aviso: motivo });
  }

  if (destino === 'retiro') {
    return res.redirect(`/admin/movimientos/retiro?item=${item.id}&codigo=${encodeURIComponent(codigo)}`);
  }

  if (destino === 'devolucion') {
    return res.redirect(`/admin/movimientos/devolucion?item=${item.id}&codigo=${encodeURIComponent(codigo)}`);
  }

  return res.render('movimiento-escanear', { ...base, item, prestamos, eleccion: 'elegir' });
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
  escanear,
  mostrarMisPrestamos,
};