const router = require('express').Router();
const institucional = require('../controllers/institucional.controller');
const { asyncHandler } = require('../middleware/error.middleware');

router.get('/institucional', asyncHandler(institucional.mostrarInstitucional));
router.get('/contacto', asyncHandler(institucional.mostrarContacto));
router.post('/contacto', asyncHandler(institucional.enviarContacto));

module.exports = router;