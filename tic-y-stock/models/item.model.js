const pool = require('./db');
const Movimiento = require('./movimiento.model');

function buildFiltros({ q = '', categoria = '', estado = '', ubicacion = '', disponible = false, stockCritico = false } = {}) {
  const where = [];
  const params = [];

  if (q) {
    where.push('(nombre LIKE ? OR categoria LIKE ? OR observaciones LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (categoria) {
    where.push('categoria = ?');
    params.push(categoria);
  }
  if (estado) {
    where.push('estado = ?');
    params.push(estado);
  }
  if (ubicacion) {
    where.push('ubicacion = ?');
    params.push(ubicacion);
  }
  if (disponible) {
    where.push('estado = ? AND cantidad > 0');
    params.push('disponible');
  }
  if (stockCritico) {
    // Mismo criterio que Item.stockCritico(): por debajo del mínimo de reposición
    // y fuera de los ítems dados de baja. Estar *en* el mínimo todavía no es
    // crítico (si no, un ítem 1/1 nunca deja de estarlo).
    where.push('cantidad < cantidad_minima AND estado <> ?');
    params.push('baja');
  }

  return { where, params };
}

// Lista blanca de órdenes: `orden` no se interpola nunca sin pasar por acá.
const ORDENES = {
  nombre: 'nombre ASC',
  cantidad: 'cantidad ASC',
  categoria: 'categoria ASC, nombre ASC',
};

function condicionesWhere(filtros) {
  const { where } = buildFiltros(filtros);
  return where.length ? ` WHERE ${where.join(' AND ')}` : '';
}

async function findAll(filtros = {}, { limite = null, offset = 0, orden = 'nombre' } = {}) {
  const { params } = buildFiltros(filtros);
  let sql = `SELECT * FROM items${condicionesWhere(filtros)} ORDER BY ${ORDENES[orden] || ORDENES.nombre}`;
  if (Number.isInteger(limite) && limite > 0) {
    // Sin paginación no se manda LIMIT: mysql2 acepta los parámetros numéricos
    // con `query()` (los interpola en el texto), pero solo si son enteros.
    sql += ' LIMIT ? OFFSET ?';
    params.push(limite, Math.max(0, Number(offset) || 0));
  }
  const [rows] = await pool.query(sql, params);
  return rows;
}

/** Cuenta los ítems que pasan los filtros, para la paginación. */
async function contarConFiltros(filtros = {}) {
  const { params } = buildFiltros(filtros);
  const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM items${condicionesWhere(filtros)}`, params);
  return rows[0].total;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM items WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

/**
 * Alta y edición de un ítem.
 *
 * Las dos pasan por `Movimiento.recalcularEstado` en la misma transacción. Sin
 * eso, guardar el formulario volvería a mentir: el docente puede editar un ítem
 * que tiene un préstamo abierto y dejar el estado en "disponible", o guardar
 * "prestado" en algo que no tiene nada afuera. Al normalizing en el mismo golpe
 * que el resto de los campos, la edición no puede reintroducir la desincronización
 * que los movimientos se encargan de evitar.
 */
async function create({ nombre, categoria, cantidad, cantidad_minima, estado, observaciones, foto, ubicacion }) {
  return pool.withTransaction(async (conn) => {
    const [result] = await conn.query(
      `INSERT INTO items (nombre, categoria, cantidad, cantidad_minima, estado, observaciones, foto, ubicacion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, categoria, cantidad, cantidad_minima, estado, observaciones || null, foto || null, ubicacion || null]
    );
    await Movimiento.recalcularEstado(result.insertId, conn);
    return result.insertId;
  });
}

async function update(id, { nombre, categoria, cantidad, cantidad_minima, estado, observaciones, foto, ubicacion }) {
  return pool.withTransaction(async (conn) => {
    const [result] = await conn.query(
      `UPDATE items
       SET nombre = ?, categoria = ?, cantidad = ?, cantidad_minima = ?, estado = ?, observaciones = ?, foto = ?, ubicacion = ?
       WHERE id = ?`,
      [nombre, categoria, cantidad, cantidad_minima, estado, observaciones || null, foto || null, ubicacion || null, id]
    );
    if (result.affectedRows > 0) {
      await Movimiento.recalcularEstado(id, conn);
    }
    return result.affectedRows > 0;
  });
}

/**
 * Borra un ítem.
 *
 * Se niega si tiene material prestado. Sus movimientos se irían en cascada, y con
 * ellos se pierde el único registro de quién se llevó qué: el alumno vería
 * "mis préstamos" vacío y el material seguiría afuera del pañol sin forma de
 * anotarlo. Mismo criterio que `User.remove` y que el `RESTRICT` de `solicitudes`.
 */
async function remove(id) {
  const pendientes = await Movimiento.contarPrestamosAbiertosDe({ id_item: id });
  if (pendientes > 0) {
    return {
      ok: false,
      error: `Este ítem tiene ${pendientes} préstamo(s) sin devolver. Registrá la devolución antes de sacarlo del inventario.`,
    };
  }
  const [result] = await pool.query('DELETE FROM items WHERE id = ?', [id]);
  return { ok: result.affectedRows > 0 };
}

async function contar() {
  const [rows] = await pool.query('SELECT COUNT(*) AS total FROM items');
  return rows[0].total;
}

/**
 * Ítems por debajo del mínimo de reposición.
 *
 * Se compara con `<` y no con `<=`: tener exactamente la cantidad mínima todavía
 * no es una reposición urgente, y con `<=` todo ítem de una sola unidad
 * (un osciloscopio, un router) quedaría marcado en rojo para siempre.
 */
async function stockCritico() {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS total FROM items WHERE cantidad < cantidad_minima AND estado <> ?',
    ['baja']
  );
  return rows[0].total;
}

async function categorias() {
  const [rows] = await pool.query('SELECT DISTINCT categoria FROM items ORDER BY categoria');
  return rows.map((r) => r.categoria);
}

async function ubicaciones() {
  const [rows] = await pool.query(
    "SELECT DISTINCT ubicacion FROM items WHERE ubicacion IS NOT NULL AND ubicacion <> '' ORDER BY ubicacion"
  );
  return rows.map((r) => r.ubicacion);
}

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove,
  contar,
  contarConFiltros,
  stockCritico,
  categorias,
  ubicaciones,
};