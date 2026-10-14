const router = require('express').Router();
const admin = require('../controllers/admin.controller');
const item = require('../controllers/item.controller');
const movimiento = require('../controllers/movimiento.controller');
const solicitud = require('../controllers/solicitud.controller');
const { requireAuth, requireSuperusuario } = require('../middleware/auth.middleware');
const { subirFoto } = require('../middleware/upload.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

router.use(requireAuth, requireSuperusuario);

/* Dashboard (T-47, T-48) */
router.get('/', asyncHandler(admin.mostrarDashboard));

/* Alertas de devolución (F7 — T-39 a T-41) */
router.get('/alertas', asyncHandler(admin.mostrarAlertas));

/* Inventario (F3 / Sprint 5) */
router.get('/inventario', asyncHandler(item.listar));
router.get('/inventario/nuevo', asyncHandler(item.mostrarNuevo));
router.post('/inventario/nuevo', subirFoto, asyncHandler(item.crear));
// F6 (T-37, T-38): una etiqueta para reelegir, y la hoja completa para imprimir.
router.get('/inventario/etiquetas', asyncHandler(item.etiquetas));
router.get('/inventario/:id/etiqueta', asyncHandler(item.etiqueta));
router.get('/inventario/:id/editar', asyncHandler(item.mostrarEditar));
router.post('/inventario/:id/editar', subirFoto, asyncHandler(item.actualizar));
router.post('/inventario/:id/eliminar', asyncHandler(item.eliminar));

/* Movimientos de stock (F5 / Sprint 6-8: T-28 a T-32) */
router.get('/movimientos', asyncHandler(movimiento.listar));
// F6: la página de escaneo entra por acá y es la que decide si el código va a un
// retiro o a una devolución.
router.get('/movimientos/escanear', asyncHandler(movimiento.escanear));
router.get('/movimientos/retiro', asyncHandler(movimiento.mostrarRetiro));
router.post('/movimientos/retiro', asyncHandler(movimiento.crearRetiro));
router.get('/movimientos/devolucion', asyncHandler(movimiento.mostrarDevolucion));
router.post('/movimientos/devolucion', asyncHandler(movimiento.crearDevolucion));

/* Solicitudes de reserva y compra (F8 — T-45, T-46) */
router.get('/solicitudes', asyncHandler(solicitud.listar));
router.get('/solicitudes/:id', asyncHandler(solicitud.mostrarDetalle));
router.post('/solicitudes/:id', asyncHandler(solicitud.resolverSolicitud));

/* Gestión de usuarios (T-49) */
router.get('/usuarios', asyncHandler(admin.mostrarUsuarios));
router.get('/usuarios/nuevo', asyncHandler(admin.mostrarNuevoUsuario));
router.post('/usuarios/nuevo', asyncHandler(admin.crearUsuario));
router.get('/usuarios/:id/editar', asyncHandler(admin.mostrarEditarUsuario));
router.post('/usuarios/:id/editar', asyncHandler(admin.actualizarUsuario));
router.post('/usuarios/:id/eliminar', asyncHandler(admin.eliminarUsuario));

module.exports = router;