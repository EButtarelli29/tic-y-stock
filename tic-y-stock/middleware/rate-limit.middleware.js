/**
 * Límite de intentos de inicio de sesión.
 *
 * Sin esto, un alumno que se olvidó la contraseña puede probarla sin parar y
 * bloquea a los demás usuarios legítimos. Se cuentan los **fallos** por
 * IP + correo: al superar `MAX_FALLOS` la cuenta se bloquea por
 * `BLOQUEO_MINUTOS` para esa combinación.
 *
 * El contador vive en memoria: alcanza para el uso de la escuela (un proceso
 * de Node) y evita agregar una dependencia. Si algún día corre en varias
 * instancias, hay que moverlo a la base o a Redis.
 */

const MAX_FALLOS = 8;
const BLOQUEO_MINUTOS = 15;
const BLOQUEO_MS = BLOQUEO_MINUTOS * 60 * 1000;
// Una entrada vive como máximo el bloqueo + una ventana de gracia.
const CADUCIDAD_MS = BLOQUEO_MS * 4;

const intentos = new Map();

function claveDe(req) {
  return `${req.ip}|${String(req.body.email || '').trim().toLowerCase()}`;
}

/** Saca del mapa lo que ya venció, para que no crezca sin límite. */
function purgar() {
  const ahora = Date.now();
  for (const [clave, registro] of intentos) {
    if (registro.expira < ahora) intentos.delete(clave);
  }
}

/** Middleware: corta el POST /login si esa combinación está bloqueada. */
function limiteIntentosLogin(req, res, next) {
  purgar();

  const registro = intentos.get(claveDe(req));

  if (registro && registro.bloqueadoHasta > Date.now()) {
    const minutos = Math.ceil((registro.bloqueadoHasta - Date.now()) / 60000);
    return res.status(429).render('login', {
      title: 'Iniciar sesión',
      error: `Demasiados intentos fallidos. Probá de nuevo en ${minutos} minuto(s) o pedile al docente que restablezca tu contraseña.`,
      email: String(req.body.email || ''),
    });
  }

  next();
}

/** Se llama cuando el login falla (credenciales incorrectas). */
function registrarFallo(req) {
  const clave = claveDe(req);
  const ahora = Date.now();
  const previo = intentos.get(clave) || { fallos: 0, bloqueadoHasta: 0, expira: ahora + CADUCIDAD_MS };

  previo.fallos += 1;
  previo.expira = ahora + CADUCIDAD_MS;
  if (previo.fallos >= MAX_FALLOS) {
    previo.bloqueadoHasta = ahora + BLOQUEO_MS;
  }

  intentos.set(clave, previo);
}

/** Se llama cuando el login es correcto: el contador vuelve a cero. */
function registrarExito(req) {
  intentos.delete(claveDe(req));
}

/** Para pruebas: deja limpio el contador de una combinación. */
function reiniciar() {
  intentos.clear();
}

module.exports = { limiteIntentosLogin, registrarFallo, registrarExito, reiniciar, MAX_FALLOS, BLOQUEO_MINUTOS };
