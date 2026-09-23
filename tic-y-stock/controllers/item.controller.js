const fs = require('fs');
const path = require('path');
const Item = require('../models/item.model');

const ESTADOS = ['disponible', 'prestado', 'en_reparacion', 'baja'];
const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads', 'items');

function validarItem(datos) {
  const errores = {};

  if (!datos.nombre || datos.nombre.trim().length < 2) {
    errores.nombre = 'Ingresá el nombre del ítem.';
  }
  if (!datos.categoria || datos.categoria.trim().length < 2) {
    errores.categoria = 'Ingresá una categoría (por ejemplo: "Componentes", "Cables").';
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
  if (datos.observaciones && datos.observaciones.length > 500) {
    errores.observaciones = 'Las observaciones no pueden superar los 500 caracteres.';
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

async function listar(req, res) {
  const { q = '', categoria = '', estado = '', ubicacion = '' } = req.query;

  const items = await Item.findAll({
    q: String(q).trim(),
    categoria: String(categoria).trim(),
    estado: String(estado).trim(),
    ubicacion: String(ubicacion).trim(),
  });

  res.render('inventario', {
    title: 'Inventario',
    user: req.session.user,
    seccion: 'inventario',
    items,
    categorias: await Item.categorias(),
    ubicaciones: await Item.ubicaciones(),
    ESTADOS,
    filtros: { q: String(q).trim(), categoria: String(categoria).trim(), estado: String(estado).trim(), ubicacion: String(ubicacion).trim() },
  });
}

async function buscarJson(req, res) {
  const { q = '', categoria = '', estado = '', ubicacion = '' } = req.query;
  const items = await Item.findAll({
    q: String(q).trim(),
    categoria: String(categoria).trim(),
    estado: String(estado).trim(),
    ubicacion: String(ubicacion).trim(),
  });
  res.json(items);
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
    return res.status(404).render('error', {
      title: 'Ítem no encontrado',
      user: req.session.user,
      codigo: 404,
      mensaje: 'El ítem que buscás no existe.',
    });
  }

  const item = await Item.findById(id);

  if (!item) {
    return res.status(404).render('error', {
      title: 'Ítem no encontrado',
      user: req.session.user,
      codigo: 404,
      mensaje: 'El ítem que buscás no existe.',
    });
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
    return res.status(404).render('error', {
      title: 'Ítem no encontrado',
      user: req.session.user,
      codigo: 404,
      mensaje: 'El ítem que buscás no existe.',
    });
  }

  const datos = limpiarDatos(req.body);

  if (req.file) {
    datos.foto = `/uploads/items/${req.file.filename}`;
  } else {
    datos.foto = String(req.body.foto || (item.foto || ''));
    if (req.body.quitar_foto === '1') {
      datos.foto = '';
    }
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

  req.session.mensaje = {
    texto: 'Ítem actualizado correctamente.',
    tipo: 'exito',
  };
  res.redirect('/admin/inventario');
}

async function eliminar(req, res) {
  const id = Number(req.params.id);
  const item = await Item.findById(id);

  if (!item) {
    return res.status(404).render('error', {
      title: 'Ítem no encontrado',
      user: req.session.user,
      codigo: 404,
      mensaje: 'El ítem que buscás no existe.',
    });
  }

  await Item.remove(id);

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

module.exports = { listar, buscarJson, mostrarNuevo, crear, mostrarEditar, actualizar, eliminar };