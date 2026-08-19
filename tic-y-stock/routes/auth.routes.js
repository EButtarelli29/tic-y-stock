const router = require('express').Router();
const auth = require('../controllers/auth.controller');

router.get('/login', auth.mostrarLogin);
router.post('/login', auth.iniciarSesion);
router.get('/register', auth.mostrarRegistro);
router.post('/register', auth.registrar);
router.get('/logout', auth.cerrarSesion);

module.exports = router;