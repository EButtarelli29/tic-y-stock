const fs = require('fs');
const path = require('path');
const Item = require('../models/item.model');
const Movimiento = require('../models/movimiento.model');
const { renderError } = require('../middleware/error.middleware');

// Límites de longitud según los VARCHAR del esquema (db/schema.sql).
const MAX_NOMBRE = 190;
const MAX_CATEGORIA = 60;
const MAX_UBICACION = 120;
const MAX_OBSERVACIONES = 500;

const ESTADOS = ['disponible', 'prestado', 'en_reparacion', 'baja'];
const ORDENES_INVENTARIO = ['nombre', 'cantidad', 'categoria'];
const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads', 'items');

function validarItem(datos) {
  const errores = {};

  if (!datos.nombre || datos.nombre.trim().length < 2) {
    errores.nombre = 'Ingresá el nombre del ítem.';
  } else if (datos.nombre.length > MAX_NOMBRE) {
    errores.nombre = `El nombre no puede superar los ${MAX_NOMBRE} caracteres.`;
  }
  if (!datos.categoria || datos.categoria.trim().length < 2) {
    errores.categoria = 'Ingresá una categoría (por ejemplo: "Componentes", "Cables").';
  } else if (datos.categoria.length > MAX_CATEGORIA) {
    errores.categoria = `La categoría no puede superar los ${MAX_CATEGORIA} caracteres.`;
  }
  const cantidad = Number(datos.cantidad);
  if (!Number.isInteger(cantidad) || cantidad < 0) {
    errores.cantidad = 'La cantidad debe ser un número entero mayor o igual a 0.';
  }
  const cantidadMinima = Number(datos.cantidad_minima);
  if (!Number.isInteger(cantidadMinima) || cantidadMinima < 0) {
    errores.cantidad_minima = 'La cantidad mínima debe ser un número entero mayor o igual a 0.';
  }
  if (!ESTADOS.includes(datos.estado)) {
    errores.estado = 'Elegí un estado válido.';
  }
  if (datos.ubicacion && datos.ubicacion.length > MAX_UBICACION) {
    errores.ubicacion = `La ubicación no puede superar los ${MAX_UBICACION} caracteres.`;
  }
  if (datos.observaciones && datos.observaciones.length > MAX_OBSERVACIONES) {
    errores.observaciones = `Las observaciones no pueden superar los ${MAX_OBSERVACIONES} caracteres.`;
  }

  return errores;
}

function limpiarDatos(body) {
  return {
    nombre: String(body.nombre || '').trim(),
    categoria: String(body.categoria || '').trim().toLowerCase(),
    cantidad: Number(body.cantidad || 0),
    cantidad_minima: Number(body.cantidad_minima ?? 5),
    estado: String(body.estado || 'disponible'),
    observaciones: String(body.observaciones || '').trim(),
    foto: body.foto || '',
    ubicacion: String(body.ubicacion || '').trim(),
  };
}

/** Lee los filtros de la URL y los normaliza una sola vez. */
function leerFiltros(query) {
  return {
    q: String(query.q || '').trim(),
    categoria: String(query.categoria || '').trim(),
    estado: ESTADOS.includes(query.estado) ? query.estado : '',
    ubicacion: String(query.ubicacion || '').trim(),
    stockCritico: query.stock_critico === '1',
  };
}

const POR_PAGINA = 25;

async function listar(req, res) {
  const filtros = leerFiltros(req.query);
  const orden = ORDENES_INVENTARIO.includes(req.query.orden) ? req.query.orden : 'nombre';

  const total = await Item.contarConFiltros(filtros);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const pagina = Math.min(Math.max(Number(req.query.pagina) || 1, 1), paginas);

  const items = await Item.findAll(filtros, {
    limite: POR_PAGINA,
    offset: (pagina - 1) * POR_PAGINA,
    orden,
  });

  // Una sola consulta para toda la página (no una por fila): le dice al docente
  // qué ítems tienen material afuera, que es la señal de que el campo manual
  // `estado = 'prestado'` quedó viejo.
  const prestamosPorItem = await Movimiento.activosPorItem(items.map((i) => i.id));

  res.render('inventario', {
    title: 'Inventario',
    user: req.session.user,
    seccion: 'inventario',
    items,
    prestamosPorItem,
    categorias: await Item.categorias(),
    ubicaciones: await Item.ubicaciones(),
    ESTADOS,
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

async function mostrarNuevo(req, res) {
  res.render('item-form', {
    title: 'Nuevo ítem',
    user: req.session.user,
    seccion: 'inventario',
    item: null,
    categorias: await Item.categorias(),
    ubicaciones: await Item.ubicaciones(),
    ESTADOS,
    errores: {},
    form: {
      nombre: '',
      categoria: '',
      cantidad: 0,
      cantidad_minima: 5,
      estado: 'disponible',
      observaciones: '',
      ubicacion: '',
    },
    errorFoto: '',
  });
}

async function crear(req, res) {
  const datos = limpiarDatos(req.body);
  datos.foto = req.file ? `/uploads/items/${req.file.filename}` : '';

  const errores = validarItem(datos);

  if (Object.keys(errores).length > 0) {
    if (req.file) eliminarArchivoSilencioso(path.join(UPLOADS_DIR, req.file.filename));
    return res.status(400).render('item-form', {
      title: 'Nuevo ítem',
      user: req.session.user,
      seccion: 'inventario',
      item: null,
      categorias: await Item.categorias(),
      ubicaciones: await Item.ubicaciones(),
      ESTADOS,
      errores,
      form: datos,
      errorFoto: '',
    });
  }

  await Item.create(datos);
  req.session.mensaje = {
    texto: 'Ítem cargado correctamente.',
    tipo: 'exito',
  };
  res.redirect('/admin/inventario');
}

async function mostrarEditar(req, res) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return renderError(req, res, 404, 'El ítem que buscás no existe.', 'Ítem no encontrado');
  }

  const item = await Item.findById(id);

  if (!item) {
    return renderError(req, res, 404, 'El ítem que buscás no existe.', 'Ítem no encontrado');
  }

  res.render('item-form', {
    title: `Editar ${item.nombre}`,
    user: req.session.user,
    seccion: 'inventario',
    item,
    categorias: await Item.categorias(),
    ubicaciones: await Item.ubicaciones(),
    ESTADOS,
    errores: {},
    form: {
      nombre: item.nombre,
      categoria: item.categoria,
      cantidad: item.cantidad,
      cantidad_minima: item.cantidad_minima,
      estado: item.estado,
      observaciones: item.observaciones || '',
      ubicacion: item.ubicacion || '',
    },
    errorFoto: '',
  });
}

async function actualizar(req, res) {
  const id = Number(req.params.id);
  const item = await Item.findById(id);

  if (!item) {
    return renderError(req, res, 404, 'El ítem que buscás no existe.', 'Ítem no encontrado');
  }

  const datos = limpiarDatos(req.body);

  if (req.file) {
    // Se subió una foto nueva: se usa esa (y más abajo se borra la anterior).
    datos.foto = `/uploads/items/${req.file.filename}`;
  } else if (req.body.quitar_foto === '1') {
    datos.foto = '';
  } else {
    // Sin foto nueva: se conserva la actual, que viaja en el campo oculto
    // `foto_actual` (no en `foto`, que es el input de archivo).
    datos.foto = String(req.body.foto_actual || item.foto || '');
  }

  const errores = validarItem(datos);

  if (Object.keys(errores).length > 0) {
    if (req.file) eliminarArchivoSilencioso(path.join(UPLOADS_DIR, req.file.filename));
    return res.status(400).render('item-form', {
      title: `Editar ${item.nombre}`,
      user: req.session.user,
      seccion: 'inventario',
      item,
      categorias: await Item.categorias(),
      ubicaciones: await Item.ubicaciones(),
      ESTADOS,
      errores,
      form: datos,
      errorFoto: '',
    });
  }

  await Item.update(id, datos);

  if (req.file && item.foto) {
    eliminarArchivoSilencioso(path.join(UPLOADS_DIR, path.basename(item.foto)));
  }
  if (req.body.quitar_foto === '1' && item.foto) {
    eliminarArchivoSilencioso(path.join(UPLOADS_DIR, path.basename(item.foto)));
  }

  req.session.mensaje = mensajeGuardado(datos, id);
  res.redirect('/admin/inventario');
}

/**
 * Etiqueta de un ítem para reimprimir (F6 — T-37, T-38).
 *
 * Existe separada de la hoja de etiquetas porque reimprimir *una* etiqueta es lo
 * que pasa cuando al docente se le cae una etiqueta del estante, y eso no puede
 * obligarlo a imprimir las otras treinta.
 */
async function etiqueta(req, res) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return renderError(req, res, 404, 'El ítem que buscás no existe.', 'Ítem no encontrado');
  }

  const item = await Item.findById(id);

  if (!item) {
    return renderError(req, res, 404, 'El ítem que buscás no existe.', 'Ítem no encontrado');
  }

  res.render('etiqueta', {
    title: `Etiqueta de ${item.nombre}`,
    user: req.session.user,
    seccion: 'inventario',
    item,
  });
}

/**
 * Hoja con las etiquetas de todo el inventario (F6 — T-37: "el 100% de los
 * materiales críticos").
 *
 * Sin paginación a propósito: una hoja de etiquetas tiene que ser *completa* o
 * no sirve, y el corte de páginas lo hace el CSS de impresión. Se agrupa por
 * categoría para que el docente pueda imprimir por separado un estante entero.
 *
 * `?q=`, `?categoria=` y `?estado=` reutilizan los filtros del inventario en vez
 * de inventar un segundo juego de parámetros: el mismo predicado que ya está
 * probado y paginado.
 */
async function etiquetas(req, res) {
  const filtros = {
    q: String(req.query.q || '').trim(),
    categoria: String(req.query.categoria || '').trim(),
    estado: ESTADOS.includes(req.query.estado) ? req.query.estado : '',
  };

  const items = await Item.findAll(filtros, { orden: 'categoria' });

  // Agrupar en el servidor y no en la vista: la vista no debería tener que
  // saber que 'categoria' es la clave por la que se agrupa.
  const porCategoria = new Map();
  for (const item of items) {
    if (!porCategoria.has(item.categoria)) porCategoria.set(item.categoria, []);
    porCategoria.get(item.categoria).push(item);
  }

  res.render('etiquetas', {
    title: 'Etiquetas del inventario',
    user: req.session.user,
    seccion: 'inventario',
    grupos: [...porCategoria.entries()],
    total: items.length,
    filtros,
    categorias: await Item.categorias(),
    ESTADOS,
  });
}

/**
 * Aviso de guardado, o aviso de que la app normalizó el estado.
 *
 * `Item.update` recalcula `estado` después de aplicar el formulario, así que
 * guardar "disponible" en un ítem con material afuera (o "prestado" en uno sin
 * préstamos) no se queda: el valor final es el que dicen los movimientos. Decirlo
 * en vez de mostrar un "actualizado correctamente" mudo es la diferencia entre que
 * el docente entienda el sistema y que piense que la app se le pasó un dato.
 *
 * La diferencia solo puede aparecer entre `disponible` y `prestado`: `baja` y
 * `en_reparacion` son decisiones del docente y el recálculo no las toca.
 */
async function mensajeGuardado(datos, id) {
  const actualizado = await Item.findById(id);
  if (actualizado && actualizado.estado !== datos.estado) {
    const motivo = actualizado.estado === 'prestado'
      ? 'hay material de este ítem afuera del pañol'
      : 'no queda nada de este ítem prestado';
    return {
      texto: `Ítem actualizado, pero el estado quedó en "${actualizado.estado}" porque ${motivo}. Ese valor se calcula solo.`,
      tipo: 'aviso',
    };
  }
  return { texto: 'Ítem actualizado correctamente.', tipo: 'exito' };
}

async function eliminar(req, res) {
  const id = Number(req.params.id);
  const item = await Item.findById(id);

  if (!item) {
    return renderError(req, res, 404, 'El ítem que buscás no existe.', 'Ítem no encontrado');
  }

  const borrado = await Item.remove(id);

  if (!borrado.ok) {
    req.session.mensaje = { texto: borrado.error, tipo: 'error' };
    return res.redirect('/admin/inventario');
  }

  if (item.foto) {
    eliminarArchivoSilencioso(path.join(UPLOADS_DIR, path.basename(item.foto)));
  }

  req.session.mensaje = {
    texto: 'Ítem eliminado del inventario.',
    tipo: 'exito',
  };
  res.redirect('/admin/inventario');
}

function eliminarArchivoSilencioso(ruta) {
  try {
    fs.unlinkSync(ruta);
  } catch (_err) {
    // El archivo puede no existir; no es un error relevante.
  }
}

module.exports = {
  listar,
  mostrarNuevo,
  crear,
  mostrarEditar,
  actualizar,
  eliminar,
  etiqueta,
  etiquetas,
};