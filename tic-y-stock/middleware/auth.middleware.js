function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
}

function requireSuperusuario(req, res, next) {
  if (req.session.user.rol !== 'superusuario') {
    return res.redirect('/panel');
  }
  next();
}

module.exports = { requireAuth, requireSuperusuario };