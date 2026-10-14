const router = require('express').Router();
const panel = require('../controllers/panel.controller');
const movimiento = require('../controllers/movimiento.controller');
const solicitud = require('../controllers/solicitud.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

router.get('/panel', requireAuth, asyncHandler(panel.mostrarPanel));
router.get('/panel/item/:id', requireAuth, asyncHandler(panel.mostrarDetalleItem));

/* "Mis préstamos activos" (T-32). Solo lectura: el retiro y la devolución los
   registra el responsable del pañol. Sirve para todos los roles autenticados. */
router.get('/panel/mis-prestamos', requireAuth, asyncHandler(movimiento.mostrarMisPrestamos));

/* Reservas y solicitudes de compra (F8 — T-42 a T-44). El alumno pide; el
   docente aprueba o rechaza en /admin/solicitudes. */
router.get('/panel/mis-solicitudes', requireAuth, asyncHandler(solicitud.misSolicitudes));
router.get('/panel/solicitudes/nueva', requireAuth, asyncHandler(solicitud.mostrarNuevaReserva));
router.post('/panel/solicitudes/nueva', requireAuth, asyncHandler(solicitud.crearReserva));
router.get('/panel/solicitudes/compra', requireAuth, asyncHandler(solicitud.mostrarNuevaCompra));
router.post('/panel/solicitudes/compra', requireAuth, asyncHandler(solicitud.crearCompra));

module.exports = router;