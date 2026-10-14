const router = require('express').Router();
const auth = require('../controllers/auth.controller');
const { asyncHandler } = require('../middleware/error.middleware');
const { limiteIntentosLogin } = require('../middleware/rate-limit.middleware');

router.get('/login', asyncHandler(auth.mostrarLogin));
router.post('/login', limiteIntentosLogin, asyncHandler(auth.iniciarSesion));
router.get('/register', asyncHandler(auth.mostrarRegistro));
router.post('/register', asyncHandler(auth.registrar));
// Solo POST: con GET, cualquiera te desloguea desde otro sitio con un
// <img src="/logout">. Un formulario no lo dispara sin la acción del usuario.
router.post('/logout', asyncHandler(auth.cerrarSesion));

module.exports = router;