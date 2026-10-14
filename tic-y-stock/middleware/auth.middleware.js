const User = require('../models/user.model');

/**
 * Exige que haya una sesión iniciada.
 *
 * No alcanza con mirar que `req.session.user` exista: la sesión guarda una copia
 * del usuario que sigue vigente hasta que expira (30 min). Si a alguien se lo
 * degrada, se lo cambia el nombre o se lo borra, con el dato cacheado seguiría
 * entrando. Por eso se relee de la base (búsqueda por PK indexada, una
 * consulta) y la sesión se refresca con los datos actuales.
 *
 * Es `async`, pero maneja sus errores internamente: Express 4 no captura los
 * rechazos de promesa de un middleware, así que un `throw` acá mataría el
 * proceso.
 */
async function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  try {
    const usuario = await User.findById(req.session.user.id);

    if (!usuario) {
      // La cuenta fue borrada: la sesión no vale más.
      return req.session.destroy(() => res.redirect('/login'));
    }

    req.session.user = {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
    };

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Exige rol `superusuario`.
 *
 * synchronous a propósito: `requireAuth` ya dejó el rol recién leído de la base
 * en la sesión, así que esta guarda no necesita volver a consultar.
 */
function requireSuperusuario(req, res, next) {
  if (!req.session.user || req.session.user.rol !== 'superusuario') {
    return res.redirect('/panel');
  }
  next();
}

module.exports = { requireAuth, requireSuperusuario };
