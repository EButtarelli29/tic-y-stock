const router = require('express').Router();
const panel = require('../controllers/panel.controller');
const movimiento = require('../controllers/movimiento.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

router.get('/panel', requireAuth, asyncHandler(panel.mostrarPanel));
router.get('/panel/item/:id', requireAuth, asyncHandler(panel.mostrarDetalleItem));

/* "Mis préstamos activos" (T-32). Solo lectura: el retiro y la devolución los
   registra el responsable del pañol. Sirve para todos los roles autenticados. */
router.get('/panel/mis-prestamos', requireAuth, asyncHandler(movimiento.mostrarMisPrestamos));

module.exports = router;