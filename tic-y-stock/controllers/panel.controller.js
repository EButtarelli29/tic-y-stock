const Item = require('../models/item.model');
const { renderError } = require('../middleware/error.middleware');

const ESTADOS_LABEL = {
  disponible: 'Disponible',
  prestado: 'Prestado',
  en_reparacion: 'En reparación',
  baja: 'De baja',
};

async function mostrarPanel(req, res) {
  const { tipo = '', disponibilidad = '', q = '' } = req.query;
  const busqueda = String(q).trim();

  const items = await Item.findAll({
    q: busqueda,
    categoria: String(tipo).trim(),
    disponible: disponibilidad === 'disponible',
  });

  res.render('panel', {
    title: 'Panel del alumno',
    user: req.session.user,
    seccion: 'panel',
    items,
    categorias: await Item.categorias(),
    ESTADOS_LABEL,
    tipo: String(tipo).trim(),
    disponibilidad,
    q: busqueda,
    totalDisponibles: items.filter((i) => i.estado === 'disponible' && i.cantidad > 0).length,
  });
}

async function mostrarDetalleItem(req, res) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return renderError(req, res, 404, 'El ítem que buscás no existe.', 'Ítem no encontrado');
  }

  const item = await Item.findById(id);

  if (!item) {
    return renderError(req, res, 404, 'El ítem que buscás no existe.', 'Ítem no encontrado');
  }

  res.render('item-detalle', {
    title: item.nombre,
    user: req.session.user,
    seccion: 'panel',
    item,
    ESTADOS_LABEL,
  });
}

module.exports = { mostrarPanel, mostrarDetalleItem };