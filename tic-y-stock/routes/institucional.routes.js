const router = require('express').Router();
const institucional = require('../controllers/institucional.controller');

router.get('/institucional', institucional.mostrarInstitucional);
router.get('/contacto', institucional.mostrarContacto);
router.post('/contacto', institucional.enviarContacto);

module.exports = router;