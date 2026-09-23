const router = require('express').Router();
const admin = require('../controllers/admin.controller');
const item = require('../controllers/item.controller');
const { requireAuth, requireSuperusuario } = require('../middleware/auth.middleware');
const { subirFoto } = require('../middleware/upload.middleware');

router.use(requireAuth, requireSuperusuario);

/* Dashboard (T-47, T-48) */
router.get('/', admin.mostrarDashboard);

/* Inventario (F3 / Sprint 5) */
router.get('/inventario', item.listar);
router.get('/inventario/buscar', item.buscarJson);
router.get('/inventario/nuevo', item.mostrarNuevo);
router.post('/inventario/nuevo', subirFoto, item.crear);
router.get('/inventario/:id/editar', item.mostrarEditar);
router.post('/inventario/:id/editar', subirFoto, item.actualizar);
router.post('/inventario/:id/eliminar', item.eliminar);

/* Gestión de usuarios (T-49) */
router.get('/usuarios', admin.mostrarUsuarios);
router.get('/usuarios/nuevo', admin.mostrarNuevoUsuario);
router.post('/usuarios/nuevo', admin.crearUsuario);
router.get('/usuarios/:id/editar', admin.mostrarEditarUsuario);
router.post('/usuarios/:id/editar', admin.actualizarUsuario);
router.post('/usuarios/:id/eliminar', admin.eliminarUsuario);

module.exports = router;