const db = require('./db');

/**
 * Alertas de devolución (F7 — T-39 a T-41).
 *
 * Una alerta cuelga de un retiro (`movimientos`, FK `CASCADE`) y nace con la
 * fecha en que el material debería volver: se crea junto con el retiro (T-39) y
 * se marca `resuelta` junto con la devolución (T-41), siempre en la misma
 * transacción. Así "hay una alerta activa" y "hay un préstamo abierto" son la
 * misma cosa, sin depender de que alguien corra un proceso aparte.
 *
 * "Pendiente" y "vencida" NO son estados de la base: son la misma alerta activa
 * mirada contra la fecha de hoy. Por eso `fecha_vencimiento` y `dias_para_vencer`
 * salen calculados de la consulta, y no se guardan en una columna aparte que
 * habría que ir actualizando todos los días.
 *
 * Este modelo NO vuelve a evaluar si el préstamo sigue abierto (el predicado
 * `ABIERTO` vive en `movimiento.model.js`). Es a propósito: `movimiento.model.js`
 * requiere a este módulo para crear y resolver la alerta, así que requerirlo al
 * revés —solo para reusar `ABIERTO`— armaría un ciclo de `require`. La
 * consistencia la garantizan las transacciones de retiro y devolución.
 */

const PLAZO_DIAS_POR_DEFECTO = 7;

/**
 * Días de plazo antes de considerar vencida una devolución (T-39).
 *
 * Se lee del entorno en cada llamada y no al cargar el módulo, para que el valor
 * de `.env` cuente sin importar en qué orden se pidan los módulos. Un valor
 * ausente o inválido (0, negativo, texto) cae en el default.
 */
function plazoDias() {
  const n = Number(process.env.PLAZO_PRESTAMO_DIAS);
  return Number.isInteger(n) && n > 0 ? n : PLAZO_DIAS_POR_DEFECTO;
}

/**
 * Crea la alerta de un retiro recién registrado (T-39).
 *
 * Recibe `conn` porque la llama `registrarRetiro` dentro de su transacción: si el
 * retiro se guarda, su alerta se guarda con él, y no puede quedar material afuera
 * sin aviso. `fechaHora` solo la manda la carga de datos de ejemplo (que necesita
 * fechas repartidas); la app la omite y entonces el vencimiento se calcula desde
 * hoy.
 */
async function crearParaRetiro(conn, { idMovimiento, fechaHora = null } = {}) {
  await conn.query(
    `INSERT INTO alertas (id_movimiento, estado, fecha_vencimiento)
     VALUES (?, 'activa', DATE_ADD(DATE(COALESCE(?, CURDATE())), INTERVAL ? DAY))`,
    [idMovimiento, fechaHora, plazoDias()]
  );
}

/**
 * Marca como resuelta la alerta del préstamo que se acaba de devolver (T-41).
 *
 * También recibe `conn`: va dentro de la transacción de la devolución. Filtra por
 * `estado = 'activa'` para que una segunda devolución —imposible por el `UNIQUE`
 * de `id_retiro`, pero igual— no pise el historial.
 */
async function resolverDeRetiro(conn, idRetiro) {
  const [res] = await conn.query(
    `UPDATE alertas SET estado = 'resuelta' WHERE id_movimiento = ? AND estado = 'activa'`,
    [idRetiro]
  );
  return res.affectedRows;
}

/**
 * Alertas activas, de la más vencida a la más reciente (T-40).
 *
 * Trae ya resuelto lo que la pantalla necesita mostrar: el ítem, quién lo tiene,
 * cuándo lo retiró, cuándo vence y cuántos días faltan (`dias_para_vencer`
 * negativo = vencida). La fecha se formatea en SQL para no pelear con la zona
 * horaria: un `DATE` que viaja como objeto `Date` se corre un día para atrás al
 * imprimirlo en horario argentino.
 */
async function listarActivas({ limite = null } = {}) {
  const params = [];
  let sql = `
    SELECT a.id, a.id_movimiento, a.estado, a.fecha_vencimiento,
           DATE_FORMAT(a.fecha_vencimiento, '%d/%m/%Y') AS fecha_vencimiento_txt,
           m.fecha_hora, m.cantidad, m.observaciones,
           i.nombre AS item_nombre, i.categoria, i.ubicacion,
           u.nombre AS usuario_nombre,
           DATEDIFF(a.fecha_vencimiento, CURDATE()) AS dias_para_vencer
    FROM alertas a
    JOIN movimientos m ON m.id = a.id_movimiento
    JOIN items i ON i.id = m.id_item
    JOIN usuarios u ON u.id = m.id_usuario
    WHERE a.estado = 'activa'
    ORDER BY a.fecha_vencimiento ASC, a.id ASC`;

  if (Number.isInteger(limite) && limite > 0) {
    sql += ' LIMIT ?';
    params.push(limite);
  }

  const [rows] = await db.query(sql, params);
  return rows;
}

/** Cuántas alertas siguen activas (el número del dashboard). */
async function countActivas() {
  const [rows] = await db.query("SELECT COUNT(*) AS total FROM alertas WHERE estado = 'activa'");
  return rows[0].total;
}

/** Cuántas de las activas ya pasaron su fecha (el detalle del número). */
async function contarVencidas() {
  const [rows] = await db.query(
    "SELECT COUNT(*) AS total FROM alertas WHERE estado = 'activa' AND fecha_vencimiento < CURDATE()"
  );
  return rows[0].total;
}

module.exports = {
  crearParaRetiro,
  resolverDeRetiro,
  listarActivas,
  countActivas,
  contarVencidas,
  plazoDias,
  PLAZO_DIAS_POR_DEFECTO,
};
