const router = require('express').Router();
const panel = require('../controllers/panel.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.get('/panel', requireAuth, panel.mostrarPanel);
router.get('/panel/item/:id', requireAuth, panel.mostrarDetalleItem);

module.exports = router;