/**
 * Manejo centralizado de errores.
 *
 * Express 4 no captura los rechazos de promesa de los handlers `async`: si una
 * consulta a MySQL falla (por ejemplo, el servicio está apagado), el rechazo
 * sube como `unhandledRejection` y **tumba el proceso del servidor**. Por eso
 * cada handler asíncrono se envuelve con `asyncHandler()` en las rutas, que
 * reenvía el error a `next(err)` para que llegue al `errorHandler`.
 */

/** Envuelve un handler `async` para que sus rechazos lleguen a `next(err)`. */
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Códigos de MySQL y de red que significa "la base no está disponible".
const ERRORES_CONEXION = [
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EHOSTUNREACH',
  'ER_ACCESS_DENIED_ERROR',
  'ER_BAD_DB_ERROR',
  'PROTOCOL_CONNECTION_LOST',
  'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR',
  'PROTOCOL_SEQUENCE_TIMEOUT',
];

function esErrorDeConexion(err) {
  return Boolean(err && ERRORES_CONEXION.includes(err.code));
}

/**
 * Renderiza la vista de error.
 *
 * Siempre pasa `user` y `seccion` porque `partials/nav` los usa: si faltaran,
 * EJS tira ReferenceError y el 404 se convierte en un 500. El texto del error
 * va en `detalle` (no en `mensaje`) para no pisar el mensaje flash que el navbar
 * muestra en `mensaje`.
 */
function renderError(req, res, codigo, detalle, titulo) {
  res.status(codigo).render('error', {
    title: titulo || (codigo === 404 ? 'Página no encontrada' : 'Error'),
    codigo,
    detalle,
    user: req.session.user || null,
    seccion: 'error',
  });
}

/**
 * Middleware final de errores. Se registra después del 404 en `server.js`.
 * Responde 503 cuando el problema es que MySQL no responde, que es el caso más
 * probable en la red del taller, y 409 cuando una clave foránea impide borrar.
 */
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (esErrorDeConexion(err)) {
    console.error('[db] No se pudo conectar con MySQL:', err.code, err.message);
    return responder(req, res, 503, 'Base de datos no disponible',
      'No pudimos conectar con la base de datos. Avisá al docente o al jefe de taller para que inicie el servicio.');
  }

  // Una clave foránea (RESTRICT) impide borrar un usuario o un ítem que tiene
  // solicitudes registradas. Es una validación de negocio, no una falla.
  if (err && err.code === 'ER_ROW_IS_REFERENCED_2') {
    return responder(req, res, 409, 'No se puede eliminar',
      'Este registro tiene solicitudes asociadas y no se puede eliminar hasta que se resuelvan.');
  }

  if (err && err.code === 'ER_NO_REFERENCED_ROW_2') {
    return responder(req, res, 409, 'Referencia inexistente',
      'El registro que intentás modificar ya no existe. Volvé a cargar la lista.');
  }

  const status = err.status || err.statusCode || 500;
  if (status >= 500) {
    console.error('[error]', err.stack || err);
  }

  responder(req, res, status, 'Error inesperado',
    'Ocurrió un problema al procesar la solicitud. Intentá de nuevo en unos segundos.');
}

/** Renderiza la vista de error en HTML o responde JSON si el cliente lo pide. */
function responder(req, res, status, titulo, detalle) {
  if (req.accepts(['html', 'json']) === 'json') {
    return res.status(status).json({ error: titulo, mensaje: detalle });
  }
  renderError(req, res, status, detalle, titulo);
}

/** 404 explícito: usa la misma vista que el handler global de `server.js`. */
function noEncontrado(req, res) {
  renderError(req, res, 404, 'La página que buscás no existe.', 'Página no encontrada');
}

module.exports = { asyncHandler, errorHandler, noEncontrado, renderError, esErrorDeConexion };