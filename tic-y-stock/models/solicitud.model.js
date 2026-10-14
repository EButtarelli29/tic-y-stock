const db = require('./db');
const Movimiento = require('./movimiento.model');

/**
 * Solicitudes del alumno (F8 — T-42 a T-46).
 *
 * Una solicitud es un pedido: el alumno reserva material del pañol (`tipo
 * 'reserva'`, con `id_item`) o pide que se compre un insumo nuevo (`tipo
 * 'compra'`, con `id_item NULL` y todo el detalle en `descripcion`). El docente
 * la resuelve una sola vez: `aprobada` o `rechazada`.
 *
 * Decisión de F8 (T-43): aprobar una reserva *aparta el material de verdad*. No
 * se limita a marcar la fila, sino que registra el retiro —descuenta el stock,
 * deja el ítem `prestado` y le cuelga su alerta de devolución de F7—. Por eso la
 * aprobación y el retiro van en la MISMA transacción: si se hicieran por
 * separado, una solicitud que quedó `pendiente` después de un retiro ya hecho
 * podría aprobarse de nuevo y descontar el stock dos veces.
 *
 * Aprobar una compra no toca el inventario: todavía no hay un ítem que
 * descontar. La solicitud solo se cierra; el docente carga el insumo a mano.
 *
 * Este modelo requiere a `movimiento.model.js` (para reusar `registrarRetiroEnTx`)
 * en un solo sentido. `movimiento.model.js` no requiere a este módulo, así que no
 * se forma un ciclo de `require`.
 */

const TIPOS = ['reserva', 'compra'];
const ESTADOS = ['pendiente', 'aprobada', 'rechazada'];

/**
 * Trae la solicitud con lo que las dos pantallas necesitan ya resuelto: el ítem
 * (nombre y stock actual, para decidir con el número a la vista), quién la pidió
 * y quién la resolvió. `LEFT JOIN` en items porque una compra no tiene ítem.
 */
const SELECT_BASE = `
  SELECT s.id, s.id_usuario, s.id_item, s.tipo, s.estado, s.cantidad,
         s.descripcion, s.respuesta, s.id_movimiento, s.resuelta_por,
         s.fecha, s.fecha_resolucion,
         i.nombre AS item_nombre, i.categoria AS item_categoria, i.ubicacion AS item_ubicacion,
         i.cantidad AS item_cantidad, i.estado AS item_estado,
         u.nombre AS usuario_nombre, u.email AS usuario_email,
         r.nombre AS resuelta_por_nombre
  FROM solicitudes s
  JOIN usuarios u ON u.id = s.id_usuario
  LEFT JOIN items i ON i.id = s.id_item
  LEFT JOIN usuarios r ON r.id = s.resuelta_por`;

/**
 * Crea una solicitud `pendiente`. El `id_item` solo se guarda para las reservas:
 * una compra es de un insumo que todavía no existe, y el CHECK de la base lo
 * exige (una reserva sin ítem no se puede insertar).
 */
async function crear({ id_usuario, tipo, id_item = null, cantidad = 1, descripcion = '' }) {
  const [res] = await db.query(
    `INSERT INTO solicitudes (id_usuario, id_item, tipo, cantidad, descripcion)
     VALUES (?, ?, ?, ?, ?)`,
    [id_usuario, tipo === 'reserva' ? id_item : null, tipo, cantidad, descripcion || null]
  );
  return res.insertId;
}

async function findById(id) {
  const [rows] = await db.query(`${SELECT_BASE} WHERE s.id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

/**
 * Todas las solicitudes para el panel del docente (T-45).
 *
 * El orden es la lista de trabajo: primero las pendientes, después las aprobadas
 * y al final las rechazadas, y dentro de cada grupo la más reciente arriba.
 * `FIELD(...)` mantiene ese orden sin guardar un número aparte.
 */
async function listar({ estado = '', limite = null } = {}) {
  const where = [];
  const params = [];
  if (ESTADOS.includes(estado)) {
    where.push('s.estado = ?');
    params.push(estado);
  }
  let sql = `${SELECT_BASE}${where.length ? ` WHERE ${where.join(' AND ')}` : ''}
     ORDER BY FIELD(s.estado, 'pendiente', 'aprobada', 'rechazada'), s.fecha DESC, s.id DESC`;
  if (Number.isInteger(limite) && limite > 0) {
    sql += ' LIMIT ?';
    params.push(limite);
  }
  const [rows] = await db.query(sql, params);
  return rows;
}

/** Las solicitudes de un alumno, de la más nueva a la más vieja. */
async function listarDeUsuario(id_usuario) {
  const [rows] = await db.query(
    `${SELECT_BASE} WHERE s.id_usuario = ? ORDER BY s.fecha DESC, s.id DESC`,
    [id_usuario]
  );
  return rows;
}

/** Cuántas solicitudes esperan respuesta (el número del dashboard). */
async function contarPendientes() {
  const [rows] = await db.query("SELECT COUNT(*) AS total FROM solicitudes WHERE estado = 'pendiente'");
  return rows[0].total;
}

/**
 * Cierra una solicitud sin tocar el inventario: se usa para rechazar cualquiera
 * y para aprobar una compra. El `AND estado = 'pendiente'` hace que resolver dos
 * veces sea inofensivo (la segunda no afecta ninguna fila), aunque el controlador
 * ya avise antes.
 */
async function resolver({ id, estado, id_superusuario, respuesta = '' }) {
  if (!['aprobada', 'rechazada'].includes(estado)) {
    return { ok: false, errores: { general: 'Acción inválida.' } };
  }
  const [res] = await db.query(
    `UPDATE solicitudes
     SET estado = ?, respuesta = ?, resuelta_por = ?, fecha_resolucion = NOW()
     WHERE id = ? AND estado = 'pendiente'`,
    [estado, respuesta || null, id_superusuario, id]
  );
  return { ok: res.affectedRows > 0 };
}

/**
 * Aprueba una solicitud.
 *
 * Para una reserva, todo pasa en una transacción: se bloquea la solicitud
 * (`FOR UPDATE`, para que dos aprobaciones simultáneas no registren dos retiros),
 * se registra el retiro con la cantidad pedida y recién entonces se marca la
 * solicitud `aprobada` con el `id_movimiento` que la materializó.
 *
 * Si el retiro no se puede hacer (ya no hay stock, el ítem está dado de baja), se
 * devuelve `{ ok: false, errores }` y la solicitud queda `pendiente`: el rechazo
 * de negocio es el camino normal, no una excepción. Si el `UPDATE` final fallara
 * (imposible: tenemos el `FOR UPDATE`), se lanza para que la transacción revierta
 * el retiro y no quede material afuera sin la solicitud marcada.
 */
async function aprobar({ id, id_superusuario, respuesta = '' }) {
  return db.withTransaction(async (conn) => {
    const [rows] = await conn.query(
      'SELECT id, id_usuario, id_item, tipo, estado, cantidad FROM solicitudes WHERE id = ? FOR UPDATE',
      [id]
    );
    const solicitud = rows[0];

    if (!solicitud) {
      return { ok: false, errores: { general: 'La solicitud no existe.' } };
    }
    if (solicitud.estado !== 'pendiente') {
      return { ok: false, errores: { general: `Esa solicitud ya fue ${solicitud.estado}.` } };
    }

    let idMovimiento = null;

    if (solicitud.tipo === 'reserva') {
      const retiro = await Movimiento.registrarRetiroEnTx(conn, {
        id_item: solicitud.id_item,
        id_usuario: solicitud.id_usuario,
        cantidad: solicitud.cantidad,
        observaciones: `Reserva aprobada (solicitud #${solicitud.id})`,
      });
      if (!retiro.ok) {
        return retiro;
      }
      idMovimiento = retiro.id;
    }

    const [res] = await conn.query(
      `UPDATE solicitudes
       SET estado = 'aprobada', id_movimiento = ?, respuesta = ?, resuelta_por = ?, fecha_resolucion = NOW()
       WHERE id = ? AND estado = 'pendiente'`,
      [idMovimiento, respuesta || null, id_superusuario, solicitud.id]
    );
    if (res.affectedRows === 0) {
      throw new Error(`No se pudo marcar la solicitud #${solicitud.id} como aprobada.`);
    }

    return { ok: true, tipo: solicitud.tipo, id_movimiento: idMovimiento };
  });
}

module.exports = {
  crear,
  findById,
  listar,
  listarDeUsuario,
  contarPendientes,
  resolver,
  aprobar,
  TIPOS,
  ESTADOS,
};
