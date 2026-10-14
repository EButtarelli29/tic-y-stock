const router = require('express').Router();
const Item = require('../models/item.model');
const Movimiento = require('../models/movimiento.model');
const { requireAuth } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

/**
 * Resuelve un código de barras a un ítem, en JSON (F6 — T-33, T-38).
 *
 * Existe para que la cámara y el lector USB puedan confirmar el código *en el
 * momento* que se lee, antes de mandar nada al servidor de verdad: el docente
 * tiene que ver "Cable UTP, quedan 2" en pantalla cuando apoya el material en el
 * lector, no descubrir tres pasos después que el número estaba mal.
 *
 * El `SELECT` va contra el UNIQUE de `items.codigo_barras`, así que "encontré
 * dos ítems con el mismo código" es imposible por construcción: no hay un caso
 * "ambiguo" que el código de aplicación tenga que desambiguar. Por eso la
 * respuesta es un ítem o nada.
 *
 * Sólo pide sesión iniciada, no rol docente: el alumno también puede escanear
 * para ver qué está mirando (RNF-02 lo pide como contingencia de la cámara).
 */
router.get('/items/:codigo', requireAuth, asyncHandler(async (req, res) => {
  const codigo = String(req.params.codigo || '').trim().slice(0, 64);

  if (!codigo) {
    return res.json({ ok: false, motivo: 'vacio' });
  }

  const item = await Item.findByCodigo(codigo);

  if (!item) {
    return res.json({ ok: false, motivo: 'no_existe' });
  }

  const prestamos = await Movimiento.retirosAbiertosDeItem(item.id);

  res.json({
    ok: true,
    item: {
      id: item.id,
      nombre: item.nombre,
      categoria: item.categoria,
      cantidad: item.cantidad,
      cantidad_minima: item.cantidad_minima,
      estado: item.estado,
      ubicacion: item.ubicacion,
      codigo_barras: item.codigo_barras,
    },
    prestamos: prestamos.map((p) => ({
      id: p.id,
      cantidad: p.cantidad,
      usuario_nombre: p.usuario_nombre,
      dias: p.dias,
    })),
    // Si no hay nada que registrar, el cliente avisa sin ir al servidor.
    registrable: item.estado !== 'baja' && (item.cantidad > 0 || prestamos.length > 0),
  });
}));

module.exports = router;