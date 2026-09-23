const Item = require('../models/item.model');

const ESTADOS_LABEL = {
  disponible: 'Disponible',
  prestado: 'Prestado',
  en_reparacion: 'En reparación',
  baja: 'De baja',
};

async function mostrarPanel(req, res) {
  const { tipo = '', disponibilidad = '' } = req.query;

  const items = await Item.findAll({
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
    totalDisponibles: items.filter((i) => i.estado === 'disponible' && i.cantidad > 0).length,
  });
}

async function mostrarDetalleItem(req, res) {
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

  res.render('item-detalle', {
    title: item.nombre,
    user: req.session.user,
    seccion: 'panel',
    item,
    ESTADOS_LABEL,
  });
}

module.exports = { mostrarPanel, mostrarDetalleItem };