const db = require('./db');

/**
 * Un movimiento es un evento: "en este momento, esta persona se llevó estas
 * unidades de este ítem". La devolución es un evento aparte que apunta al retiro
 * que cierra (`id_retiro`), así el historial queda auditable en vez de pisarse.
 *
 * Un retiro está *abierto* mientras no tenga ninguna devolución que lo apunte.
 * El predicado vive acá en una constante porque se usa en el SELECT (como
 * alias `abierto`), en los filtros y en el anti-join de "préstamos activos":
 * duplicarlo en tres lugares garantiza que no se desincroniza.
 */
const ABIERTO = "(m.tipo = 'retiro' AND NOT EXISTS (SELECT 1 FROM movimientos d WHERE d.id_retiro = m.id))";

const SELECT_BASE = `
  SELECT m.id, m.tipo, m.cantidad, m.id_item, m.id_usuario, m.id_retiro,
         m.fecha_hora, m.observaciones,
         i.nombre AS item_nombre, i.categoria,
         u.nombre AS usuario_nombre,
         ${ABIERTO} AS abierto
  FROM movimientos m
  JOIN items i ON i.id = m.id_item
  JOIN usuarios u ON u.id = m.id_usuario`;

// Lista blanca de órdenes: `orden` nunca se interpola sin pasar por acá.
const ORDENES = {
  fecha: 'm.fecha_hora DESC, m.id DESC',
  item: 'i.nombre ASC, m.fecha_hora DESC',
  usuario: 'u.nombre ASC, m.fecha_hora DESC',
  cantidad: 'm.cantidad DESC, m.fecha_hora DESC',
};

const TIPOS = ['retiro', 'devolucion'];
const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Arma el WHERE del historial. Todos los valores van como parámetro: `orden`
 * es lo único que se concatena, y sale de ORDENES.
 */
function buildFiltros({ q = '', tipo = '', idItem = '', idUsuario = '', desde = '', hasta = '', soloAbiertos = false } = {}) {
  const where = [];
  const params = [];

  if (q) {
    where.push('(i.nombre LIKE ? OR u.nombre LIKE ? OR m.observaciones LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (TIPOS.includes(tipo)) {
    where.push('m.tipo = ?');
    params.push(tipo);
  }
  if (Number.isInteger(idItem) && idItem > 0) {
    where.push('m.id_item = ?');
    params.push(idItem);
  }
  if (Number.isInteger(idUsuario) && idUsuario > 0) {
    where.push('m.id_usuario = ?');
    params.push(idUsuario);
  }
  if (FECHA_REGEX.test(desde)) {
    where.push('m.fecha_hora >= ?');
    params.push(`${desde} 00:00:00`);
  }
  if (FECHA_REGEX.test(hasta)) {
    where.push('m.fecha_hora <= ?');
    params.push(`${hasta} 23:59:59`);
  }
  if (soloAbiertos) {
    where.push(ABIERTO);
  }

  return { where, params };
}

function condicionesWhere(filtros) {
  const { where } = buildFiltros(filtros);
  return where.length ? ` WHERE ${where.join(' AND ')}` : '';
}

/** Historial paginado para el panel del superusuario (T-31). */
async function listar(filtros = {}, { limite = null, offset = 0, orden = 'fecha' } = {}) {
  const { params } = buildFiltros(filtros);
  let sql = `${SELECT_BASE}${condicionesWhere(filtros)} ORDER BY ${ORDENES[orden] || ORDENES.fecha}`;
  if (Number.isInteger(limite) && limite > 0) {
    sql += ' LIMIT ? OFFSET ?';
    params.push(limite, Math.max(0, Number(offset) || 0));
  }
  const [rows] = await db.query(sql, params);
  return rows;
}

/** Cuenta los movimientos que pasan los filtros, para la paginación. */
async function contarConFiltros(filtros = {}) {
  const { params } = buildFiltros(filtros);
  const [rows] = await db.query(
    `SELECT COUNT(*) AS total FROM movimientos m
     JOIN items i ON i.id = m.id_item
     JOIN usuarios u ON u.id = m.id_usuario${condicionesWhere(filtros)}`,
    params
  );
  return rows[0].total;
}

/**
 * Registra un retiro y descuenta el stock, todo en una transacción (T-29).
 *
 * Devuelve `{ ok: true, id }` o `{ ok: false, errores }` con los mensajes ya
 * en español, listos para que el controlador los muestre en el formulario. No se
 * usan excepciones para los errores de validación: son el camino normal de un
 * formulario mal Completado, no una falla.
 *
 * `fecha_hora` solo la usa la carga de datos de ejemplo (`npm run db:demo
 * -- --movimientos`), que necesita un historial con fechas repartidas. La
 * aplicación nunca la manda: un retiro se anota cuando se registra.
 */
async function registrarRetiro({ id_item, id_usuario, cantidad, observaciones = '', codigo_escaneado = '', fecha_hora = null }) {
  return db.withTransaction(async (conn) => {
    // FOR UPDATE: bloquea la fila del ítem hasta que termine la transacción, así
    // dos retiros simultáneos del mismo material no pueden leer el mismo stock y
    // ambos "pasar". Es la garantía de que `items.cantidad` nunca queda negativa.
    const [items] = await conn.query(
      'SELECT id, nombre, cantidad, estado FROM items WHERE id = ? FOR UPDATE',
      [id_item]
    );
    const item = items[0];

    if (!item) {
      return { ok: false, errores: { id_item: 'El ítem seleccionado no existe.' } };
    }
    if (item.estado === 'baja') {
      return { ok: false, errores: { id_item: `"${item.nombre}" está dado de baja: no se puede retirar.` } };
    }
    if (cantidad < 1) {
      return { ok: false, errores: { cantidad: 'La cantidad debe ser al menos 1.' } };
    }
    if (cantidad > item.cantidad) {
      return {
        ok: false,
        errores: {
          cantidad: `No hay stock suficiente de "${item.nombre}": quedan ${item.cantidad} unidad(es) en el pañol.`,
        },
      };
    }

    const [insercion] = await conn.query(
      `INSERT INTO movimientos (id_item, id_usuario, tipo, cantidad, observaciones, codigo_escaneado, fecha_hora)
       VALUES (?, ?, 'retiro', ?, ?, ?, ${fecha_hora ? '?' : 'DEFAULT'})`,
      fecha_hora
        ? [id_item, id_usuario, cantidad, observaciones || null, codigo_escaneado || null, fecha_hora]
        : [id_item, id_usuario, cantidad, observaciones || null, codigo_escaneado || null]
    );
    await conn.query('UPDATE items SET cantidad = cantidad - ? WHERE id = ?', [cantidad, id_item]);
    // En la misma transacción, para que el estado no pueda quedar diciendo
    // "disponible" con material recién entregado.
    await recalcularEstado(id_item, conn);

    return { ok: true, id: insercion.insertId, item_nombre: item.nombre, cantidad };
  });
}

/**
 * Registra la devolución de un retiro y repone el stock (T-30).
 *
 * "Cierra el movimiento" significa que el retiro queda con su devolución
 * apuntada: el préstamo deja de estar activo y el ítem vuelve al pañol. La
 * cantidad devuelta es la misma que se retiró (las devoluciones parciales están
 * fuera del alcance de F5).
 *
 * El `NOT EXISTS` del SELECT corre sobre una lectura bloqueante (`FOR UPDATE`), así
 * que si dos devoluciones del mismo retiro llegan a la vez, la segunda espera y
 * después ve que ya se devolvió. El UNIQUE de `id_retiro` es la red de seguridad
 * a nivel de base.
 *
 * `fecha_hora` tiene el mismo uso restringido que en `registrarRetiro`: solo la
 * carga de datos de ejemplo.
 */
async function registrarDevolucion({ id_retiro, id_usuario, observaciones = '', codigo_escaneado = '', fecha_hora = null }) {
  return db.withTransaction(async (conn) => {
    const [rows] = await conn.query(
      `SELECT m.id, m.id_item, m.cantidad, i.nombre AS item_nombre, i.estado AS item_estado
       FROM movimientos m
       JOIN items i ON i.id = m.id_item
       WHERE m.id = ? AND m.tipo = 'retiro'
         AND NOT EXISTS (SELECT 1 FROM movimientos d WHERE d.id_retiro = m.id)
       FOR UPDATE`,
      [id_retiro]
    );
    const retiro = rows[0];

    if (!retiro) {
      return {
        ok: false,
        errores: { id_retiro: 'Ese préstamo no existe o ya fue devuelto.' },
      };
    }
    if (retiro.item_estado === 'baja') {
      return {
        ok: false,
        errores: {
          id_retiro: `"${retiro.item_nombre}" figura dado de baja en el inventario: revisalo antes de registrar la devolución.`,
        },
      };
    }

    const [insercion] = await conn.query(
      `INSERT INTO movimientos (id_item, id_usuario, tipo, cantidad, id_retiro, observaciones, codigo_escaneado, fecha_hora)
       VALUES (?, ?, 'devolucion', ?, ?, ?, ?, ${fecha_hora ? '?' : 'DEFAULT'})`,
      fecha_hora
        ? [retiro.id_item, id_usuario, retiro.cantidad, id_retiro, observaciones || null, codigo_escaneado || null, fecha_hora]
        : [retiro.id_item, id_usuario, retiro.cantidad, id_retiro, observaciones || null, codigo_escaneado || null]
    );
    await conn.query('UPDATE items SET cantidad = cantidad + ? WHERE id = ?', [retiro.cantidad, retiro.id_item]);
    // Puede haber otro préstamo abierto del mismo ítem, y por eso el recálculo
    // pregunta en vez de asumir que el material quedó todo en el pañol.
    await recalcularEstado(retiro.id_item, conn);

    return {
      ok: true,
      id: insercion.insertId,
      item_nombre: retiro.item_nombre,
      cantidad: retiro.cantidad,
    };
  });
}

/** Préstamos abiertos de un usuario: lo que tiene en la mano ahora mismo (T-32). */
async function prestamosActivosDe(id_usuario) {
  const [rows] = await db.query(
    `SELECT m.id, m.id_item, m.cantidad, m.fecha_hora, m.observaciones,
            i.nombre AS item_nombre, i.categoria, i.ubicacion,
            TIMESTAMPDIFF(DAY, m.fecha_hora, NOW()) AS dias
     FROM movimientos m
     JOIN items i ON i.id = m.id_item
     WHERE m.id_usuario = ? AND ${ABIERTO}
     ORDER BY m.fecha_hora ASC`,
    [id_usuario]
  );
  return rows;
}

/** Últimos movimientos de un usuario, para que vea su propio historial. */
async function historialDe(id_usuario, limite = 10) {
  const [rows] = await db.query(
    `${SELECT_BASE} WHERE m.id_usuario = ? ORDER BY m.fecha_hora DESC, m.id DESC LIMIT ?`,
    [id_usuario, limite]
  );
  return rows;
}

/** Préstamos abiertos de todo el taller, para el formulario de devolución. */
async function retirosAbiertos({ limite = 200, q = '' } = {}) {
  const where = [ABIERTO];
  const params = [];
  if (q) {
    where.push('(i.nombre LIKE ? OR u.nombre LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  params.push(limite);
  const [rows] = await db.query(
    `SELECT m.id, m.cantidad, m.fecha_hora, m.observaciones,
            i.nombre AS item_nombre, i.categoria,
            u.nombre AS usuario_nombre, u.id AS usuario_id,
            TIMESTAMPDIFF(DAY, m.fecha_hora, NOW()) AS dias
     FROM movimientos m
     JOIN items i ON i.id = m.id_item
     JOIN usuarios u ON u.id = m.id_usuario
     WHERE ${where.join(' AND ')}
     ORDER BY m.fecha_hora ASC
     LIMIT ?`,
    params
  );
  return rows;
}

async function contarPrestamosActivos() {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS total FROM movimientos m WHERE ${ABIERTO}`
  );
  return rows[0].total;
}

/**
 * Préstamos abiertos de un usuario o de un ítem.
 *
 * Lo usan los borrados para negarse: `items.id` y `usuarios.id` están en CASCADE
 * sobre `movimientos`, así que borrar un usuario que tiene material afuera borra
 * también el asiento que dice que ese material está afuera, y el stock queda
 * corto sin que nadie haya tocado una sola fila del inventario.
 */
async function contarPrestamosAbiertosDe({ id_usuario = 0, id_item = 0 } = {}) {
  const where = [ABIERTO];
  const params = [];
  if (Number.isInteger(id_usuario) && id_usuario > 0) {
    where.push('m.id_usuario = ?');
    params.push(id_usuario);
  }
  if (Number.isInteger(id_item) && id_item > 0) {
    where.push('m.id_item = ?');
    params.push(id_item);
  }
  const [rows] = await db.query(
    `SELECT COUNT(*) AS total FROM movimientos m WHERE ${where.join(' AND ')}`,
    params
  );
  return rows[0].total;
}

/**
 * Recalcula `items.estado` a partir de los movimientos.
 *
 * El estado tiene dos partes con dueñas distintas. `baja` y `en_reparacion` las
 * decide el docente y ningún movimiento las pisa: un osciloscopio puede estar en
 * el taller de reparaciones *y* prestado a un alumno, y el dato de que está en
 * reparación no se pierde porque alguien lo haya carnetado. `disponible` y
 * `prestado` sí se calculan, porque dependen solo de si hay préstamos abiertos —
 * un docente que elige esos dos a mano está pidiendo un valor que la app le
 * normaliza igual.
 *
 * Vive en `movimiento.model.js` y no en `item.model.js` a propósito: el predicado
 * de "préstamo abierto" es de acá (la constante `ABIERTO`), y así hay una sola
 * definición del concepto en todo el código. Los otros modelos lo requieren en un
 * solo sentido, así que no se forma un ciclo de `require`.
 *
 * Acepta un id o una lista, y una conexión opcional para poder ir por la misma
 * transacción que el movimiento que la disparó.
 */
async function recalcularEstado(idItem, conn = db) {
  const ids = (Array.isArray(idItem) ? idItem : [idItem]).filter((id) => Number.isInteger(id) && id > 0);
  if (ids.length === 0) return 0;
  const [res] = await conn.query(
    `UPDATE items
     SET estado = CASE
           WHEN estado = 'baja' THEN 'baja'
           WHEN estado = 'en_reparacion' THEN 'en_reparacion'
           WHEN EXISTS (SELECT 1 FROM movimientos m
                        WHERE m.id_item = items.id AND m.tipo = 'retiro'
                          AND NOT EXISTS (SELECT 1 FROM movimientos d WHERE d.id_retiro = m.id))
           THEN 'prestado'
           ELSE 'disponible'
         END
     WHERE id IN (?)`,
    [ids]
  );
  return res.affectedRows;
}

/**
 * Préstamos abiertos de un conjunto de ítems, agregados.
 *
 * Una sola consulta para toda la página (no una por fila): el inventario la usa
 * para mostrar "2 préstamo(s) activo(s)" junto a cada ítem, que es la señal de
 * que el campo manual `estado = 'prestado'` quedó viejo. Devuelve un mapa
 * `id_item -> { prestamos, unidades }`.
 */
async function activosPorItem(idItems) {
  const ids = (Array.isArray(idItems) ? idItems : []).filter((id) => Number.isInteger(id) && id > 0);
  if (ids.length === 0) return {};

  // `IN (?)` con un array: mysql2 lo expande a la lista de valores al escapar.
  const [rows] = await db.query(
    `SELECT id_item, COUNT(*) AS prestamos, COALESCE(SUM(cantidad), 0) AS unidades
     FROM movimientos m
     WHERE ${ABIERTO} AND m.id_item IN (?)
     GROUP BY id_item`,
    [ids]
  );

  return rows.reduce((mapa, fila) => {
    mapa[fila.id_item] = { prestamos: Number(fila.prestamos), unidades: Number(fila.unidades) };
    return mapa;
  }, {});
}

/** Últimos movimientos para el dashboard. */
async function ultimos(limite = 8) {
  const [rows] = await db.query(`${SELECT_BASE} ORDER BY m.fecha_hora DESC, m.id DESC LIMIT ?`, [limite]);
  return rows;
}

module.exports = {
  listar,
  contarConFiltros,
  registrarRetiro,
  registrarDevolucion,
  prestamosActivosDe,
  historialDe,
  retirosAbiertos,
  contarPrestamosActivos,
  contarPrestamosAbiertosDe,
  recalcularEstado,
  activosPorItem,
  ultimos,
  ORDENES,
  TIPOS,
};