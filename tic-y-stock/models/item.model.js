const pool = require('./db');

function buildFiltros({ q = '', categoria = '', estado = '', ubicacion = '', disponible = false } = {}) {
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

  return { where, params };
}

async function findAll(filtros = {}) {
  const { where, params } = buildFiltros(filtros);
  let sql = 'SELECT * FROM items';
  if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
  sql += ' ORDER BY nombre ASC';
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query('SELECT * FROM items WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function create({ nombre, categoria, cantidad, cantidad_minima, estado, observaciones, foto, ubicacion }) {
  const [result] = await pool.query(
    `INSERT INTO items (nombre, categoria, cantidad, cantidad_minima, estado, observaciones, foto, ubicacion)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [nombre, categoria, cantidad, cantidad_minima, estado, observaciones || null, foto || null, ubicacion || null]
  );
  return result.insertId;
}

async function update(id, { nombre, categoria, cantidad, cantidad_minima, estado, observaciones, foto, ubicacion }) {
  const [result] = await pool.query(
    `UPDATE items
     SET nombre = ?, categoria = ?, cantidad = ?, cantidad_minima = ?, estado = ?, observaciones = ?, foto = ?, ubicacion = ?
     WHERE id = ?`,
    [nombre, categoria, cantidad, cantidad_minima, estado, observaciones || null, foto || null, ubicacion || null, id]
  );
  return result.affectedRows > 0;
}

async function remove(id) {
  const [result] = await pool.query('DELETE FROM items WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

async function contar() {
  const [rows] = await pool.query('SELECT COUNT(*) AS total FROM items');
  return rows[0].total;
}

async function stockCritico() {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS total FROM items WHERE cantidad <= cantidad_minima AND estado <> ?',
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

module.exports = { findAll, findById, create, update, remove, contar, stockCritico, categorias, ubicaciones };